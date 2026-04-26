import * as t from 'lib0/testing'
import * as promise from 'lib0/promise'
import * as Y from '@y/y'
import * as utils from './utils.js'
import { createDocCompactedHook, createProjectsModule } from '../src/api/projects/index.js'
import { createProjectRepository } from '../src/api/projects/repository.js'
import { PROJECT_MAX_FILE_ROOMS, PROJECT_MAX_ROOM_DOC_BYTES, PROJECT_ROOT_DOCID } from '../src/config.js'

const postgresUrl = utils.yhub.conf.postgres
const repository = createProjectRepository(postgresUrl)
const projectsModule = await createProjectsModule({
    postgresUrl,
    verifyAccessToken: async () => ({ userid: '1' }),
})
projectsModule.setupApi({ app: utils.yhub.server.uwsApp, yhub: utils.yhub })

/**
 * @param {string} org
 * @param {string} docid
 * @param {string} [branch]
 */
const persistRoom = async (org, docid, branch = 'main') => {
    const room = { org, docid, branch }
    const ydoc = new Y.Doc()
    ydoc.get().setAttr('x', 1)
    const encDoc = Y.encodeStateAsUpdate(ydoc)
    const contentids = Y.createContentIdsFromDoc(ydoc)
    await utils.yhub.persistence.store(room, {
        lastClock: `${Date.now()}-0`,
        gcDoc: encDoc,
        nongcDoc: encDoc,
        contentids: Y.encodeContentIds(contentids),
        contentmap: Y.encodeContentMap(Y.createContentMapFromContentIds(contentids, [], [])),
    })
    return room
}

/**
 * @param {t.TestCase} tc
 */
export const testOversizedDocLocksRoom = async (tc) => {
    // Oversized compacted docs should trigger read-only lock on non-root rooms.
    const room = {
        org: utils.defaultOrg,
        docid: `${tc.testName}-doc`,
        branch: 'main',
    }
    await repository.clearRoomReadonly(room)

    const hook = createDocCompactedHook(postgresUrl)
    hook({ room, gcDoc: new Uint8Array(PROJECT_MAX_ROOM_DOC_BYTES) })

    await promise.untilAsync(async () => repository.isRoomReadonly(room), 5000)
    t.assert(await repository.isRoomReadonly(room))
}

/**
 * @param {t.TestCase} tc
 */
export const testDocCompactedHookIgnoresRootDoc = async (tc) => {
    // Root metadata room is exempt from automatic read-only locking.
    const room = {
        org: utils.defaultOrg,
        docid: PROJECT_ROOT_DOCID,
        branch: `${tc.testName}-branch`,
    }
    await repository.clearRoomReadonly(room)

    const hook = createDocCompactedHook(postgresUrl)
    hook({ room, gcDoc: new Uint8Array(PROJECT_MAX_ROOM_DOC_BYTES * 2) })

    await promise.wait(500)
    t.assert(!(await repository.isRoomReadonly(room)))
}

/**
 * @param {t.TestCase} tc
 */
export const testLockedRoomRejectsWrites = async (tc) => {
    // Once a room is locked, write authorization must return an explicit 423 Locked denial.
    const room = await persistRoom(utils.defaultOrg, `${tc.testName}-readonly-room`)
    await repository.markRoomReadonly(room)

    const result = await projectsModule.authPolicy.canWriteToRoom({ userid: '1' }, room)
    t.assert(result.ok === false)
    if (result.ok === false) {
        t.assert(result.status === '423 Locked')
    }
}

/**
 * @param {t.TestCase} tc
 */
export const testFileRoomLimitRejectsNewWrite = async (tc) => {
    // Fill one branch with max allowed file rooms.
    const branch = `${tc.testName}-branch`
    for (let i = 0; i < PROJECT_MAX_FILE_ROOMS; i++) {
        await persistRoom(utils.defaultOrg, `${tc.testName}-file-${i}`, branch)
    }

    // A new room in the same branch should be blocked by file-room limit policy.
    const room = {
        org: utils.defaultOrg,
        docid: `${tc.testName}-overflow-room`,
        branch,
    }
    const result = await projectsModule.authPolicy.canWriteToRoom({ userid: '1' }, room)
    t.assert(result.ok === false)
    if (result.ok === false) {
        t.assert(result.status === '413 Payload Too Large')
    }
}
