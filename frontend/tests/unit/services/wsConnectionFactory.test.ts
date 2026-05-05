import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Doc } from 'yjs'

const idbState = vi.hoisted(() => ({
    instances: [] as Array<{ key: string; whenSynced: Promise<void>; destroy: ReturnType<typeof vi.fn> }>,
}))

const wsState = vi.hoisted(() => ({
    instances: [] as Array<{
        url: string
        room: string
        doc: Doc
        opts: { connect: boolean; params: { auth: string } }
        awareness: { setLocalState: ReturnType<typeof vi.fn> }
        on: ReturnType<typeof vi.fn>
        connect: ReturnType<typeof vi.fn>
        disconnect: ReturnType<typeof vi.fn>
        destroy: ReturnType<typeof vi.fn>
        __emitSync: (isSynced: boolean) => void
    }>,
}))

vi.mock('y-indexeddb', () => {
    class IndexeddbPersistence {
        public readonly whenSynced: Promise<void>
        public readonly destroy = vi.fn()

        public constructor(public readonly key: string) {
            this.whenSynced = Promise.resolve()
            idbState.instances.push(this)
        }
    }

    return { IndexeddbPersistence }
})

vi.mock('y-websocket', () => {
    class WebsocketProvider {
        public readonly awareness = { setLocalState: vi.fn() }
        public readonly on = vi.fn((event: string, cb: (isSynced: boolean) => void) => {
            if (event === 'sync') {
                this.emitSync = cb
            }
        })
        public readonly connect = vi.fn()
        public readonly disconnect = vi.fn()
        public readonly destroy = vi.fn()

        private emitSync: (isSynced: boolean) => void = () => undefined

        public constructor(
            public readonly url: string,
            public readonly room: string,
            public readonly doc: Doc,
            public readonly opts: { connect: boolean; params: { auth: string } },
        ) {
            wsState.instances.push(this)
        }

        public __emitSync(isSynced: boolean): void {
            this.emitSync(isSynced)
        }
    }

    return { WebsocketProvider }
})

import { IndexeddbPersistence } from 'y-indexeddb'

import { WS_URL } from '@/config'
import WSConnectionFactory from '@/services/connectionFactory/wsConnectionFactory'

const mockRoomCache = {
    persist: vi.fn((room: string, doc: Doc) => new IndexeddbPersistence(room, doc)),
    clearRoom: vi.fn(async (): Promise<void> => undefined),
}

describe('WSConnectionFactory', () => {
    beforeEach(() => {
        idbState.instances.splice(0)
        wsState.instances.splice(0)
        mockRoomCache.persist.mockClear()
        mockRoomCache.clearRoom.mockClear()
    })

    it('creates idb and websocket providers with correct room/project/auth wiring', async () => {
        const doc = new Doc()
        const factory = new WSConnectionFactory('project-1', 'token-123', mockRoomCache)

        const connection = await factory.connect('room-a', { doc, autoconnect: false })

        expect(connection.doc).toBe(doc)
        expect(mockRoomCache.persist).toHaveBeenCalledWith('room-a', doc)

        expect(wsState.instances).toHaveLength(1)
        expect(wsState.instances[0].url).toBe(`${WS_URL}/project-1`)
        expect(wsState.instances[0].room).toBe('room-a')
        expect(wsState.instances[0].opts.connect).toBe(false)
        expect(wsState.instances[0].opts.params.auth).toBe('token-123')
    })

    it('resolves synced only after websocket emits sync=true', async () => {
        const factory = new WSConnectionFactory('project-2', 'token-abc', mockRoomCache)
        const connection = await factory.connect('room-sync')

        let resolved = false
        void connection.synced.then(() => {
            resolved = true
        })

        await Promise.resolve()
        expect(resolved).toBe(false)

        wsState.instances[0].__emitSync(true)
        await expect(connection.synced).resolves.toBeUndefined()
        expect(resolved).toBe(true)
    })

    it('connect() resets synced and calls websocket connect()', async () => {
        const factory = new WSConnectionFactory('project-3', 'token-connect', mockRoomCache)
        const connection = await factory.connect('room-reset')
        const ws = wsState.instances[0]

        ws.__emitSync(true)
        await connection.synced

        connection.connect()
        expect(ws.connect).toHaveBeenCalledOnce()

        let resolved = false
        void connection.synced.then(() => {
            resolved = true
        })
        await Promise.resolve()
        expect(resolved).toBe(false)

        ws.__emitSync(true)
        await expect(connection.synced).resolves.toBeUndefined()
    })

    it('disconnect delegates to websocket disconnect', async () => {
        const factory = new WSConnectionFactory('project-4', 'token-disconnect', mockRoomCache)
        const connection = await factory.connect('room-disc')

        connection.disconnect()

        expect(wsState.instances[0].disconnect).toHaveBeenCalledOnce()
    })

    it('destroy clears local awareness and destroys websocket and idb providers', async () => {
        const factory = new WSConnectionFactory('project-5', 'token-destroy', mockRoomCache)
        const connection = await factory.connect('room-destroy')

        connection.destroy()

        expect(wsState.instances[0].awareness.setLocalState).toHaveBeenCalledWith(null)
        expect(wsState.instances[0].destroy).toHaveBeenCalledOnce()
        expect(idbState.instances[0].destroy).toHaveBeenCalledOnce()
    })

    it('does not resolve synced when websocket emits sync=false', async () => {
        const factory = new WSConnectionFactory('project-6', 'token-false-sync', mockRoomCache)
        const connection = await factory.connect('room-false-sync')

        let resolved = false
        void connection.synced.then(() => {
            resolved = true
        })

        wsState.instances[0].__emitSync(false)
        await Promise.resolve()

        expect(resolved).toBe(false)
    })

    it('clearRoom delegates to roomCache.clearRoom', async () => {
        const factory = new WSConnectionFactory('project-7', 'token-clear', mockRoomCache)

        await factory.clearRoom('some-file-id')

        expect(mockRoomCache.clearRoom).toHaveBeenCalledWith('some-file-id')
    })
})
