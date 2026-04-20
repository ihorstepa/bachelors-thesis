import * as Y from '@y/y'
import { createProjectRepository } from './repository.js'
import { createProjectService } from './service.js'
import { createProjectsApi } from './api.js'
import { logger } from '../../logger.js'

const ROOT_DOCID = '__root__'

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

    /**
     * @param {string} key
     * @param {() => Promise<void>} fn
     */
    const runLockedCleanup = async (key, fn) => {
        const previous = orgCleanupLocks.get(key)
        const next = (previous ?? Promise.resolve())
            .catch(() => { })
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
        const rootRoom = { org, docid: ROOT_DOCID, branch }
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
            knownFileIds.add(ROOT_DOCID)
            const orphanRooms = rooms.filter((room) => room.branch === branch && !knownFileIds.has(room.docid))
            if (orphanRooms.length === 0) {
                return
            }
            await Promise.all(orphanRooms.map((room) => hub.deleteRoom(room)))
            log.info({ projectId, branch, removedRooms: orphanRooms.length }, 'removed orphan project rooms')
        })
    }

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
     * @param {'r' | 'rw'} requiredAccess
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const checkRoomAccess = async (authInfo, room, requiredAccess) => {
        const userId = Number(authInfo.userid)
        if (!Number.isInteger(userId) || userId <= 0) {
            return { ok: false, status: '401 Unauthorized', error: 'Unauthorized' }
        }

        const accessType = await projectService.getAccessType(userId, room.org)
        const hasRequiredAccess = requiredAccess === 'rw' ? accessType === 'rw' : accessType != null
        if (!hasRequiredAccess) {
            const exists = await projectService.projectExists(room.org)
            if (!exists) {
                return { ok: false, status: '404 Not Found', error: 'Project not found' }
            }
            return { ok: false, status: '403 Forbidden', error: 'Forbidden' }
        }

        if (room.docid === ROOT_DOCID) {
            return { ok: true }
        }

        const fileIds = await getProjectFileIds(room.org, room.branch)
        if (fileIds == null) {
            return { ok: false, status: '500 Internal Server Error', error: 'Internal server error' }
        }
        if (!fileIds.has(room.docid)) {
            return { ok: false, status: '404 Not Found', error: 'File not found' }
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
    const canAccessRoom = (authInfo, room) => checkRoomAccess(authInfo, room, 'r')

    /**
     * @param {{ userid: string }} authInfo
     * @param {import('../../types.js').Room} room
     * @returns {Promise<{ ok: true } | { ok: false, status: string, error: string }>}
     */
    const canWriteToRoom = (authInfo, room) => checkRoomAccess(authInfo, room, 'rw')

    /**
     * @param {import('../../types.js').Room} room
     */
    const onRoomUpdated = async (room) => {
        if (room.docid !== ROOT_DOCID) {
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
            repository.destroy()
        },
    }
}
