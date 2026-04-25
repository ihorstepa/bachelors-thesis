import * as Y from '@y/y'
import { createProjectRepository } from './repository.js'
import { createProjectService } from './service.js'
import { createProjectsApi } from './api.js'
import {
    PROJECT_MAX_FILE_ROOMS,
    PROJECT_MAX_ROOM_DOC_BYTES,
    PROJECT_ROOT_DOCID,
    PROJECT_TOUCH_ATTEMPT_TTL_MS,
    PROJECT_TOUCH_CLEAN_UP_INTERVAL_MS,
    PROJECT_TOUCH_DEBOUNCE_MS,
} from '../../config.js'
import { logger } from '../../logger.js'

const log = logger.child({ module: 'projects-module' })

/**
 * @param {{
 *   postgresUrl: string,
 *   verifyAccessToken: (token: string) => Promise<{ userid: string }>
 * }} params
 */
export const createProjectsModule = async ({ postgresUrl, verifyAccessToken }) => {
    log.info('initializing projects module')
    const repository = createProjectRepository(postgresUrl)
    /** @type {import('../../index.js').YHub | null} */
    let yhub = null
    /** @type {Map<string, Promise<void>>} */
    const orgCleanupLocks = new Map()
    /** @type {Map<string, number>} */
    const projectLastTouchAttemptAt = new Map()
    let lastCleanUpAt = 0

    /** @param {number} now */
    const cleanUpProjectTouchAttempts = (now) => {
        if (now - lastCleanUpAt < PROJECT_TOUCH_CLEAN_UP_INTERVAL_MS) {
            return
        }
        lastCleanUpAt = now

        for (const [projectId, ts] of projectLastTouchAttemptAt.entries()) {
            if (now - ts > PROJECT_TOUCH_ATTEMPT_TTL_MS) {
                projectLastTouchAttemptAt.delete(projectId)
            }
        }
    }

    /**
     * @param {string} key
     * @param {() => Promise<void>} fn
     */
    const runLockedCleanup = async (key, fn) => {
        const previous = orgCleanupLocks.get(key)
        const next = (previous ?? Promise.resolve())
            .catch(() => {})
            .then(fn)
            .finally(() => {
                if (orgCleanupLocks.get(key) === next) {
                    orgCleanupLocks.delete(key)
                }
            })
        orgCleanupLocks.set(key, next)
        await next
    }

    /**
     * @param {string} org
     * @param {string} branch
     * @returns {Promise<Set<string> | null>}
     */
    const getProjectFileIds = async (org, branch) => {
        const hub = yhub
        if (hub == null) {
            return null
        }
        const rootRoom = { org, docid: PROJECT_ROOT_DOCID, branch }
        const { gcDoc, nongcDoc } = await hub.getDoc(rootRoom, { gc: true, nongc: true }, { gcOnMerge: false })
        const rootUpdate = gcDoc || nongcDoc
        if (rootUpdate == null) {
            return new Set()
        }
        const rootDoc = new Y.Doc({ gc: false })
        try {
            Y.applyUpdate(rootDoc, rootUpdate)
            const metaMap = /** @type {{ attrKeys?: () => Iterable<string> } | null} */ (rootDoc.get('meta'))
            if (metaMap == null || typeof metaMap.attrKeys !== 'function') {
                log.warn({ org, branch }, 'skipping orphan cleanup because root meta map is unavailable')
                return null
            }
            return new Set(Array.from(metaMap.attrKeys()))
        } finally {
            rootDoc.destroy()
        }
    }

    /**
     * @param {string} projectId
     * @param {string} branch
     */
    const cleanupOrphanProjectRooms = async (projectId, branch) => {
        const hub = yhub
        if (hub == null) {
            return
        }
        await runLockedCleanup(`${projectId}:${branch}`, async () => {
            const [rooms, knownFileIds] = await Promise.all([
                hub.listRoomsByOrg(projectId),
                getProjectFileIds(projectId, branch),
            ])
            if (knownFileIds == null) {
                return
            }
            knownFileIds.add(PROJECT_ROOT_DOCID)
            const orphanRooms = rooms.filter((room) => room.branch === branch && !knownFileIds.has(room.docid))
            if (orphanRooms.length === 0) {
                return
            }
            await Promise.all(
                orphanRooms.map(async (room) => {
                    await Promise.all([repository.clearRoomReadonly(room), hub.deleteRoom(room)])
                }),
            )
            log.info({ projectId, branch, removedRooms: orphanRooms.length }, 'removed orphan project rooms')
        })
    }

    /**
     * @param {string} org
     * @returns {Promise<Array<import('../../types.js').Room> | null>}
     */
    const listProjectRooms = async (org) => {
        const hub = yhub
        if (hub == null) {
            return null
        }
        return hub.listRoomsByOrg(org)
    }

    /**
     * @param {Array<import('../../types.js').Room>} rooms
     * @param {import('../../types.js').Room} room
     * @returns {boolean}
     */
    const roomExists = (rooms, room) => rooms.some((r) => r.branch === room.branch && r.docid === room.docid)

    /**
     * @param {Array<import('../../types.js').Room>} rooms
     * @param {string} branch
     * @returns {number}
     */
    const countFileRoomsInBranch = (rooms, branch) =>
        rooms.filter((r) => r.branch === branch && r.docid !== PROJECT_ROOT_DOCID).length

    /** @param {string} projectId */
    const onProjectDeleted = async (projectId) => {
        const hub = yhub
        if (hub == null) {
            log.warn({ projectId }, 'skipping project room cleanup because yhub is not initialized')
            return
        }
        log.info({ projectId }, 'deleting all project rooms')
        await hub.deleteOrg(projectId)
    }

    const projectService = createProjectService({ repository, onProjectDeleted })
    const projectsApi = createProjectsApi({ projectService, verifyAccessToken })

    /** @param {{ app: import('uws').TemplatedApp, yhub: import('../../index.js').YHub }} ctx */
    const setupApi = (ctx) => {
        yhub = ctx.yhub
        log.info('registering projects api routes')
        projectsApi.registerRoutes(ctx.app)
    }

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const checkReadableRoomAccess = async (authInfo, room) => {
        const userId = Number(authInfo.userid)
        if (!Number.isInteger(userId) || userId <= 0) {
            return { ok: false, status: '401 Unauthorized', error: 'Unauthorized' }
        }

        const accessType = await projectService.getAccessType(userId, room.org)
        if (accessType == null) {
            const exists = await projectService.projectExists(room.org)
            if (!exists) {
                return { ok: false, status: '404 Not Found', error: 'Project not found' }
            }
            return { ok: false, status: '403 Forbidden', error: 'Forbidden' }
        }

        return { ok: true }
    }

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const checkWritableRoomAccess = async (authInfo, room) => {
        const userId = Number(authInfo.userid)
        if (!Number.isInteger(userId) || userId <= 0) {
            return { ok: false, status: '401 Unauthorized', error: 'Unauthorized' }
        }

        const accessType = await projectService.getAccessType(userId, room.org)
        if (accessType !== 'rw') {
            if (accessType == null) {
                const exists = await projectService.projectExists(room.org)
                if (!exists) {
                    return { ok: false, status: '404 Not Found', error: 'Project not found' }
                }
            }
            return { ok: false, status: '403 Forbidden', error: 'Forbidden' }
        }

        if (room.docid !== PROJECT_ROOT_DOCID) {
            const rooms = await listProjectRooms(room.org)
            if (rooms == null) {
                return { ok: false, status: '500 Internal Server Error', error: 'Internal server error' }
            }
            const exists = roomExists(rooms, room)
            if (!exists && countFileRoomsInBranch(rooms, room.branch) >= PROJECT_MAX_FILE_ROOMS) {
                return {
                    ok: false,
                    status: '413 Payload Too Large',
                    error: `Project file limit reached (${PROJECT_MAX_FILE_ROOMS} files max). Delete files to continue.`,
                }
            }
            if (exists && (await repository.isRoomReadonly(room))) {
                return {
                    ok: false,
                    status: '423 Locked',
                    error: 'This file is permanently read-only because it exceeded the size limit.',
                }
            }
        }

        return { ok: true }
    }

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<'r'|'rw'|null>}
     */
    const getAccessType = async (authInfo, room) => {
        const userId = Number(authInfo.userid)
        if (!Number.isInteger(userId) || userId <= 0) {
            return null
        }
        return projectService.getAccessType(userId, room.org)
    }

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const canAccessRoom = (authInfo, room) => checkReadableRoomAccess(authInfo, room)

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const canWriteToRoom = (authInfo, room) => checkWritableRoomAccess(authInfo, room)

    /**
     * @param {import('../../types.js').Room} room
     */
    const onRoomUpdated = async (room) => {
        const now = Date.now()
        cleanUpProjectTouchAttempts(now)
        const lastAttempt = projectLastTouchAttemptAt.get(room.org) ?? 0

        if (now - lastAttempt >= PROJECT_TOUCH_DEBOUNCE_MS) {
            projectLastTouchAttemptAt.set(room.org, now)
            void repository.touchProjectActivity(room.org).catch((err) => {
                log.warn({ err, projectId: room.org }, 'failed to touch project activity timestamp')
            })
        }

        if (room.docid !== PROJECT_ROOT_DOCID) {
            return
        }
        await cleanupOrphanProjectRooms(room.org, room.branch)
    }

    const authPolicy = {
        getAccessType,
        canAccessRoom,
        canWriteToRoom,
    }

    return {
        setupApi,
        authPolicy,
        onRoomUpdated,
        destroy: () => {
            log.info('destroying projects module resources')
            projectLastTouchAttemptAt.clear()
            repository.destroy()
        },
    }
}

/**
 * Returns a handler for the yhub worker `docUpdate` event that marks a room as permanently
 * read-only when its merged doc size after compaction exceeds the configured limit.
 * @param {string} postgresUrl
 * @returns {(doc: { room: import('../../types.js').Room, gcDoc: Uint8Array<ArrayBuffer> | null }) => void}
 */
export const createDocCompactedHook = (postgresUrl) => {
    const repo = createProjectRepository(postgresUrl)
    return ({ room, gcDoc }) => {
        if (room.docid === PROJECT_ROOT_DOCID) return
        const sizeBytes = gcDoc?.byteLength ?? 0
        if (sizeBytes >= PROJECT_MAX_ROOM_DOC_BYTES) {
            repo.markRoomReadonly(room).catch((err) => {
                log.warn({ err, room }, 'failed to mark oversized room as readonly')
            })
        }
    }
}
