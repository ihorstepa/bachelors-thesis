import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Doc } from 'yjs'

const indexedDbState = vi.hoisted(() => ({
    instances: [] as Array<{ key: string; doc: Doc; whenSynced: Promise<void>; destroy: ReturnType<typeof vi.fn> }>,
    nextWhenSynced: null as Promise<void> | null,
}))

vi.mock('y-indexeddb', () => {
    class IndexeddbPersistence {
        public readonly whenSynced: Promise<void>
        public readonly destroy = vi.fn()

        public constructor(
            public readonly key: string,
            public readonly doc: Doc,
        ) {
            this.whenSynced = indexedDbState.nextWhenSynced ?? Promise.resolve()
            indexedDbState.nextWhenSynced = null
            indexedDbState.instances.push(this)
        }
    }

    return { IndexeddbPersistence }
})

import LocalConnectionFactory from '@/services/connectionFactory/localConnectionFactory'

describe('LocalConnectionFactory', () => {
    beforeEach(() => {
        indexedDbState.instances.splice(0)
        indexedDbState.nextWhenSynced = null
    })

    it('autoconnects by default and uses namespace/room as persistence key', async () => {
        const doc = new Doc()
        const factory = new LocalConnectionFactory('workspace')

        const connection = await factory.connect('room-a', { doc })

        expect(connection.doc).toBe(doc)
        expect(indexedDbState.instances).toHaveLength(1)
        expect(indexedDbState.instances[0].key).toBe('workspace/room-a')

        await expect(connection.synced).resolves.toBeUndefined()
    })

    it('does not create persistence at connect-time when autoconnect is false', async () => {
        const factory = new LocalConnectionFactory('workspace')
        const connection = await factory.connect('room-b', { autoconnect: false })

        expect(indexedDbState.instances).toHaveLength(0)

        connection.connect()
        expect(indexedDbState.instances).toHaveLength(1)
        expect(indexedDbState.instances[0].key).toBe('workspace/room-b')
    })

    it('reuses existing persistence on connect() and refreshes synced promise', async () => {
        const factory = new LocalConnectionFactory('workspace')
        const connection = await factory.connect('room-c')
        const first = indexedDbState.instances[0]

        connection.connect()

        expect(indexedDbState.instances).toHaveLength(1)
        expect(indexedDbState.instances[0]).toBe(first)
        await expect(connection.synced).resolves.toBeUndefined()
    })

    it('disconnect destroys persistence and a later connect creates a new instance', async () => {
        const factory = new LocalConnectionFactory('workspace')
        const connection = await factory.connect('room-d')

        const first = indexedDbState.instances[0]
        connection.disconnect()
        expect(first.destroy).toHaveBeenCalledOnce()

        connection.connect()
        expect(indexedDbState.instances).toHaveLength(2)
        expect(indexedDbState.instances[1]).not.toBe(first)
    })

    it('destroy clears local awareness and destroys both awareness and persistence', async () => {
        const factory = new LocalConnectionFactory('workspace')
        const connection = await factory.connect('room-e')
        const awarenessDestroy = vi.spyOn(connection.awareness, 'destroy')

        connection.destroy()

        expect(connection.awareness.getLocalState()).toBeNull()
        expect(indexedDbState.instances[0].destroy).toHaveBeenCalledOnce()
        expect(awarenessDestroy).toHaveBeenCalledOnce()
    })

    it('rejects connect when IndexedDB initial sync fails', async () => {
        indexedDbState.nextWhenSynced = Promise.reject(new Error('sync failed'))
        const factory = new LocalConnectionFactory('workspace')

        await expect(factory.connect('room-fail')).rejects.toThrow('sync failed')
    })
})
