import * as Y from '@y/y'
import * as env from 'lib0/environment'
import { WebSocket } from 'ws'
import { WebsocketProvider } from '@y/websocket'
import * as t from 'lib0/testing'
import * as promise from 'lib0/promise'
import { createYHub } from '@y/hub'
import * as number from 'lib0/number'
import { S3PersistenceV1 } from '@y/hub/plugins/s3'
import postgres from 'postgres'
import * as object from 'lib0/object'
import * as types from '../src/types.js'
import { encodeRoomName } from '../src/stream.js'
import { createAuthModule } from '../src/api/auth/index.js'
import { createProjectsModule } from '../src/api/projects/index.js'

export const defaultOrg = '11111111-1111-1111-1111-111111111111'

// Clean up test data - only delete if table exists
const sql = postgres(env.ensureConf('postgres'))
const tableExists = await sql`
  SELECT EXISTS (
    SELECT FROM pg_tables
        WHERE tablename = 'ydoc_v1'
  );
`
if (tableExists?.[0]?.exists) {
    await sql`DELETE from ydoc_v1`
}

await sql`
    INSERT INTO users (id, email, username, password_hash)
    VALUES (1, 'tests@yhub.local', 'tests', 'tests')
    ON CONFLICT (id) DO NOTHING
`

await sql`
    INSERT INTO projects (id, owner_id, name)
    VALUES (${defaultOrg}, 1, 'tests-project')
    ON CONFLICT (id) DO NOTHING
`

const yhubPort = number.parseInt(env.getConf('port') || '9999')
export const yhub = await createYHub({
    redis: {
        url: env.ensureConf('redis'),
        prefix: 'yhub:testing',
        taskDebounce: 10000,
        minMessageLifetime: 3000,
    },
    postgres: env.ensureConf('postgres'),
    persistence: [
        new S3PersistenceV1({
            bucket: env.ensureConf('S3_YHUB_TEST_BUCKET'),
            endPoint: env.ensureConf('S3_ENDPOINT'),
            port: parseInt(env.ensureConf('S3_PORT'), 10),
            useSSL: env.ensureConf('S3_SSL') === 'true',
            accessKey: env.ensureConf('S3_ACCESS_KEY'),
            secretKey: env.ensureConf('S3_SECRET_KEY'),
        }),
    ],
    server: {
        port: yhubPort,
        auth: types.createAuthPlugin({
            // pick a "unique" userid
            async readAuthInfo(_req) {
                return { userid: 'user1' }
            },
            // always grant rw access
            async getAccessType() {
                return 'rw'
            },
        }),
    },
    worker: {
        taskConcurrency: 500,
    },
})

{
    const redis = yhub.stream.redis
    const redisKeys = await redis.keys(`${yhub.stream.prefix}:room:*`)
    if (redisKeys.length > 0) {
        await redis.del(redisKeys)
    }
    try {
        await redis
            .multi()
            .xGroupDestroy(yhub.stream.workerStreamName, yhub.stream.workerGroupName)
            .xTrim(yhub.stream.workerStreamName, 'MAXLEN', 0)
            .xGroupCreate(yhub.stream.workerStreamName, yhub.stream.workerGroupName, '0', {
                MKSTREAM: true,
            })
            .exec()
    } catch (_) {}
}

/**
 * @param {Partial<import('../src/types.js').YHubConfig>} conf
 */
export const createTestHub = (conf) => {
    const testConf = object.assign({}, yhub.conf, { server: null, worker: null }, conf)
    return createYHub(testConf)
}

/**
 * @param {number} port
 */
export const wsUrlFromPort = (port) => `ws://localhost:${port}/ws/${defaultOrg}`

export const yhubHost = `localhost:${yhubPort}`
export const wsUrl = wsUrlFromPort(yhubPort)

/**
 * @template {boolean} WaitForSync
 * @param {t.TestCase} tc
 * @param {object} params
 * @param {string} [params.docid]
 * @param {string} [params.branch]
 * @param {boolean} [params.gc]
 * @param {boolean} [params.syncAwareness]
 * @param {WaitForSync} [params.waitForSync]
 * @param {string} [params.wsUrl]
 * @param {{[K:string]:any}} [params.wsParams]
 * @return {WaitForSync extends true ? Promise<{ ydoc: Y.Doc, provider: WebsocketProvider }> : { ydoc: Y.Doc, provider: WebsocketProvider }}
 */
const createWsClient = (
    tc,
    {
        docid = 'index',
        branch = 'main',
        gc = true,
        syncAwareness = true,
        waitForSync,
        wsUrl: _wsUrl = wsUrl,
        wsParams = {},
    } = {},
) => {
    const testPrefix = tc.testName
    const guid = testPrefix + '-' + docid
    const ydoc = new Y.Doc({ gc, guid })
    const WsPolyfill = /** @type {any} */ (
        class extends WebSocket {
            /**
             * @param {string} url
             * @param {string|string[]} [protocols]
             */
            constructor(url, protocols) {
                super(url, protocols, { maxPayload: 500 * 1024 * 1024 })
            }
        }
    )
    const provider = new WebsocketProvider(_wsUrl, guid, ydoc, {
        WebSocketPolyfill: WsPolyfill,
        socketTimeout: 1000_000,
        disableBc: true,
        params: { branch, gc: gc.toString(), ...wsParams },
    })
    previousClients.push(ydoc)
    previousClients.push(provider)
    previousClients.push(provider.awareness)
    // @todo this should be part of @y/websocket
    provider.once('sync', () => {
        ydoc.emit('sync', [true, ydoc])
    })
    if (!syncAwareness) {
        provider.awareness.destroy()
    }
    if (waitForSync) {
        return /** @type {WaitForSync extends true ? Promise<{ ydoc: Y.Doc, provider: WebsocketProvider }> : { ydoc: Y.Doc, provider: WebsocketProvider }} */ (
            ydoc.whenSynced.then(() => ({ ydoc, provider }))
        )
    }
    return /** @type {WaitForSync extends true ? Promise<{ ydoc: Y.Doc, provider: WebsocketProvider }> : { ydoc: Y.Doc, provider: WebsocketProvider }} */ ({
        ydoc,
        provider,
    })
}

/**
 * @type {Array<{destroy: () => any}>}
 */
const previousClients = []

export const cleanPreviousClients = () => {
    previousClients.forEach((client) => client.destroy())
    previousClients.length = 0
}

/**
 * @param {t.TestCase} tc
 */
export const createTestCase = async (tc) => {
    const defaultRoom = {
        org: defaultOrg,
        docid: tc.testName + '-index',
        branch: 'main',
    }
    cleanPreviousClients()
    await waitTasksProcessed(yhub)
    return {
        // this must match with the default values in createWsClient
        defaultRoom,
        defaultStream: encodeRoomName(defaultRoom, yhub.stream.prefix),
        yhub,
        org: defaultOrg,
        /**
         * @template {boolean} [WaitForSync=false]
         * @param {object} [params]
         * @param {string} [params.docid]
         * @param {string} [params.branch]
         * @param {boolean} [params.gc]
         * @param {boolean} [params.syncAwareness]
         * @param {WaitForSync} [params.waitForSync]
         * @param {string} [params.wsUrl]
         * @param {{[K:string]:any}} [params.wsParams]
         * @return {WaitForSync extends true ? Promise<{ ydoc: Y.Doc, provider: WebsocketProvider }> : { ydoc: Y.Doc, provider: WebsocketProvider }}
         */
        createWsClient: (params) => createWsClient(tc, params),
    }
}

/**
 * @param {Y.Doc} ydoc1
 * @param {Y.Doc} ydoc2
 */
export const waitDocsSynced = (ydoc1, ydoc2) => {
    console.info('waiting for docs to sync...')
    return promise.until(100_000, () => {
        const cids1 = Y.createContentIdsFromDoc(ydoc1)
        const cids2 = Y.createContentIdsFromDoc(ydoc2)
        const diff = Y.excludeContentIds(cids1, cids2)
        const isSynced = diff.deletes.isEmpty() && diff.inserts.isEmpty()
        isSynced && console.info('docs sycned!')
        return isSynced
    })
}

/**
 * @param {import('../src/index.js').YHub} yhub
 */
export const waitTasksProcessed = async (yhub) =>
    t.groupAsync('waiting for all tasks to be processed', () =>
        promise.untilAsync(
            async () => {
                const [pendingTasksSize, activeStreams] = await promise.all([
                    yhub.stream.getPendingTasksSize(),
                    yhub.stream.getActiveStreams().then((as) => as.length),
                ])
                console.log({ pendingTasksSize, activeStreams })
                if (pendingTasksSize > 0) {
                    await promise.wait(1000)
                }
                return pendingTasksSize === 0 && activeStreams === 0
            },
            (yhub.conf.redis.minMessageLifetime ?? 10000) * 50,
        ),
    )

/**
 * @param {{ port: number, redisPrefix: string }} params
 */
export const createApiTestContext = async ({ port, redisPrefix }) => {
    const postgresUrl = yhub.conf.postgres
    const authModule = await createAuthModule({ postgresUrl })
    const projectsModule = await createProjectsModule({
        postgresUrl,
        verifyAccessToken: authModule.verifyAccessToken,
    })

    await createTestHub({
        redis: {
            ...yhub.conf.redis,
            prefix: redisPrefix,
        },
        worker: null,
        server: {
            port,
            auth: {
                ...authModule.authPlugin,
                ...projectsModule.authPolicy,
            },
            onRoomUpdated: projectsModule.onRoomUpdated,
            async setupApi(/** @type {any} */ ctx) {
                await authModule.setupApi(ctx)
                projectsModule.setupApi(ctx)
            },
        },
    })

    const apiBase = `http://localhost:${port}`
    const sqlApi = postgres(env.ensureConf('postgres'))
    let usersSequenceSynced = false

    const ensureUsersSequence = async () => {
        if (usersSequenceSynced) return
        await sqlApi`
            SELECT setval(
                pg_get_serial_sequence('users', 'id'),
                COALESCE((SELECT MAX(id) FROM users), 1),
                true
            )
        `
        usersSequenceSynced = true
    }

    /**
     * @param {string} path
     * @param {{ method?: string, token?: string, body?: unknown, rawBody?: string, contentType?: string }} [opts]
     */
    const request = async (path, opts = {}) => {
        const { method = 'GET', token, body, rawBody, contentType = 'application/json' } = opts
        const headers = {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined || rawBody !== undefined ? { 'Content-Type': contentType } : {}),
        }
        const response = await fetch(`${apiBase}${path}`, {
            method,
            headers,
            body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
        })
        const text = await response.text()
        const data = text.length === 0 ? null : JSON.parse(text)
        return { status: response.status, data }
    }

    /**
     * @param {t.TestCase} tc
     * @param {string} prefix
     */
    const registerUser = async (tc, prefix) => {
        await ensureUsersSequence()
        const rand = `${Math.floor(Math.random() * 100000)}${Math.floor(tc.prng.next() * 100000)}`
        const shortPrefix = prefix.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 12)
        const username = `${shortPrefix}${rand}`.slice(0, 24)
        const email = `${username}@example.test`
        const password = 'password123'

        const registerRes = await request('/api/auth/register', {
            method: 'POST',
            body: { email, username, password },
        })
        t.assert(registerRes.status === 201)
        t.assert(registerRes.data?.token != null)

        return {
            email,
            username,
            password,
            token: registerRes.data.token,
            user: registerRes.data.user,
        }
    }

    return {
        request,
        registerUser,
    }
}
