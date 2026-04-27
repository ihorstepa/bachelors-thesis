import { describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'

import type { Connection, ConnectionConfig } from '@/core/connectionFactory'
import { ConnectionFactory } from '@/core/connectionFactory'
import MultipleFileSyncManager from '@/services/fileSyncManager/multipleFileSyncManager'

import { deferred, MockFileSyncManager, MockFileSystemManager } from '../../mocks'

class MockConnectionFactory extends ConnectionFactory {
    public readonly connectMock = vi.fn(async (room: string): Promise<Connection> => {
        const doc = new Y.Doc()
        return {
            room,
            doc,
            awareness: {} as Connection['awareness'],
            synced: Promise.resolve(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            destroy: vi.fn(),
        }
    })

    public async connect(room: string, config?: ConnectionConfig): Promise<Connection> {
        void config
        return this.connectMock(room)
    }
}

describe('MultipleFileSyncManager', () => {
    it('reuses a single connection while reference count is positive', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        const a = await manager.openFile('file-1')
        const b = await manager.openFile('file-1')

        expect(factory.connectMock).toHaveBeenCalledTimes(1)
        expect(a).toBe(b)

        manager.closeFile('file-1')
        ;(a as Connection).destroy()
        expect((a as Connection).destroy).toHaveBeenCalledTimes(1)
    })

    it('destroys connection after last close', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        const connection = (await manager.openFile('file-1')) as Connection
        await manager.openFile('file-1')

        manager.closeFile('file-1')
        expect(connection.destroy).not.toHaveBeenCalled()

        manager.closeFile('file-1')
        expect(connection.destroy).toHaveBeenCalledOnce()
    })

    it('destroys late pending connection when file is closed before connect resolves', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const pending = deferred<Connection>()
        const factory = new MockConnectionFactory()
        factory.connectMock.mockImplementationOnce(async () => pending.promise)

        const manager = new MultipleFileSyncManager(factory, fs)
        const openPromise = manager.openFile('file-1')

        manager.closeFile('file-1')

        const connection: Connection = {
            room: 'file-1',
            doc: new Y.Doc(),
            awareness: {} as Connection['awareness'],
            synced: Promise.resolve(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            destroy: vi.fn(),
        }
        pending.resolve(connection)

        await openPromise
        expect(connection.destroy).toHaveBeenCalledOnce()
    })

    it('destroys tracked connections when file nodes are deleted', async () => {
        const sync = new MockFileSyncManager()
        const fs = new MockFileSystemManager(sync)
        const fileId = fs.create('main.cpp', 'file', null)

        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        const connection = (await manager.openFile(fileId)) as Connection
        fs.delete(fileId)

        expect(connection.destroy).toHaveBeenCalledOnce()
    })

    it('destroys all connections on manager destroy', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        const a = (await manager.openFile('a')) as Connection
        const b = (await manager.openFile('b')) as Connection

        manager.destroy()

        expect(a.destroy).toHaveBeenCalledOnce()
        expect(b.destroy).toHaveBeenCalledOnce()
    })

    it('propagates connection-factory failures when opening a file', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        factory.connectMock.mockRejectedValueOnce(new Error('connect failed'))

        await expect(manager.openFile('file-err')).rejects.toThrow('connect failed')
    })

    it('ignores closeFile for ids that were never opened', async () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const factory = new MockConnectionFactory()
        const manager = new MultipleFileSyncManager(factory, fs)

        const openConnection = (await manager.openFile('file-1')) as Connection

        expect(() => manager.closeFile('missing-id')).not.toThrow()
        expect(openConnection.destroy).not.toHaveBeenCalled()

        manager.closeFile('file-1')
        expect(openConnection.destroy).toHaveBeenCalledOnce()
    })
})
