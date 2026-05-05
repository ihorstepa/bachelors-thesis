import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Doc } from 'yjs'

const idbState = vi.hoisted(() => ({
    instances: [] as Array<{ key: string; doc: Doc; whenSynced: Promise<void>; destroy: ReturnType<typeof vi.fn> }>,
}))

vi.mock('y-indexeddb', () => {
    class IndexeddbPersistence {
        public readonly whenSynced = Promise.resolve()
        public readonly destroy = vi.fn()

        public constructor(
            public readonly key: string,
            public readonly doc: Doc,
        ) {
            idbState.instances.push(this)
        }
    }

    return { IndexeddbPersistence }
})

import LocalProjectCache from '@/services/projectCache/localProjectCache'

describe('LocalProjectCache', () => {
    const deleteDatabaseMock = vi.fn((name: string) => {
        void name
        const req = { onsuccess: null as (() => void) | null, onerror: null }
        setTimeout(() => req.onsuccess?.())
        return req
    })

    beforeEach(() => {
        idbState.instances.splice(0)
        deleteDatabaseMock.mockClear()
    })

    describe('forScope', () => {
        describe('persist', () => {
            it('creates an IndexeddbPersistence with scope/room as key', () => {
                const doc = new Doc()
                const cache = new LocalProjectCache()

                cache.forScope('my-project').persist('file-1', doc)

                expect(idbState.instances).toHaveLength(1)
                expect(idbState.instances[0].key).toBe('my-project/file-1')
                expect(idbState.instances[0].doc).toBe(doc)
            })
        })

        describe('clearRoom', () => {
            it('deletes the database for the given scope and room', async () => {
                Object.defineProperty(globalThis, 'indexedDB', {
                    value: { deleteDatabase: deleteDatabaseMock },
                    configurable: true,
                })

                const cache = new LocalProjectCache()
                await cache.forScope('my-project').clearRoom('file-1')

                expect(deleteDatabaseMock).toHaveBeenCalledWith('my-project/file-1')
            })
        })
    })

    describe('clearProject', () => {
        it('deletes all databases matching the project prefix', async () => {
            Object.defineProperty(globalThis, 'indexedDB', {
                value: {
                    databases: async () => [
                        { name: 'proj-1/file-a' },
                        { name: 'proj-1/file-b' },
                        { name: 'proj-2/file-c' },
                    ],
                    deleteDatabase: deleteDatabaseMock,
                },
                configurable: true,
            })

            const cache = new LocalProjectCache()
            await cache.clearProject('proj-1')

            expect(deleteDatabaseMock).toHaveBeenCalledWith('proj-1/file-a')
            expect(deleteDatabaseMock).toHaveBeenCalledWith('proj-1/file-b')
            expect(deleteDatabaseMock).not.toHaveBeenCalledWith('proj-2/file-c')
        })

        it('does nothing if indexedDB.databases is not available', async () => {
            Object.defineProperty(globalThis, 'indexedDB', {
                value: { deleteDatabase: deleteDatabaseMock },
                configurable: true,
            })

            const cache = new LocalProjectCache()
            await cache.clearProject('proj-1')

            expect(deleteDatabaseMock).not.toHaveBeenCalled()
        })

        it('does nothing if indexedDB.databases() throws', async () => {
            Object.defineProperty(globalThis, 'indexedDB', {
                value: {
                    databases: () => Promise.reject(new Error('unavailable')),
                    deleteDatabase: deleteDatabaseMock,
                },
                configurable: true,
            })

            const cache = new LocalProjectCache()
            await expect(cache.clearProject('proj-1')).resolves.toBeUndefined()
            expect(deleteDatabaseMock).not.toHaveBeenCalled()
        })
    })
})
