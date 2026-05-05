import { describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'

import type { Connection, ConnectionConfig } from '@/core/connectionFactory'
import { ConnectionFactory } from '@/core/connectionFactory'
import * as fsErrors from '@/errors/fileSystem'
import SharedFileSystemManager from '@/services/fileSystemManager/sharedFileSystemManager'

class MockConnectionFactory extends ConnectionFactory {
    public readonly connection: Connection
    public readonly clearRoomMock = vi.fn(async (): Promise<void> => undefined)

    public constructor(doc: Y.Doc = new Y.Doc()) {
        super()
        this.connection = {
            room: '__root__',
            doc,
            awareness: {
                clientID: 1,
                getStates: () => new Map(),
                on: () => undefined,
                off: () => undefined,
                setLocalStateField: () => undefined,
            } as unknown as Connection['awareness'],
            synced: Promise.resolve(),
            connect: () => undefined,
            disconnect: () => undefined,
            destroy: vi.fn(),
        }
    }

    public async connect(room: string, config?: ConnectionConfig): Promise<Connection> {
        void room
        void config
        return this.connection
    }

    public async clearRoom(room: string): Promise<void> {
        await this.clearRoomMock(room)
    }
}

describe('SharedFileSystemManager', () => {
    it('throws RootConnectionError before init and exposes root connection after init', async () => {
        const factory = new MockConnectionFactory()
        const manager = new SharedFileSystemManager(factory)

        expect(() => manager.getRootConnection()).toThrow(fsErrors.RootConnectionError)

        await manager.init()
        expect(manager.getRootConnection()).toBe(factory.connection)
    })

    it('creates, renames, moves, and deletes nodes', async () => {
        const manager = new SharedFileSystemManager(new MockConnectionFactory())
        await manager.init()

        const dirId = manager.create('src', 'dir', null)
        const fileId = manager.create('main.cpp', 'file', dirId)

        expect(manager.getChildrenMeta(null).map((m) => m.id)).toContain(dirId)
        expect(manager.getChildrenMeta(dirId).map((m) => m.id)).toContain(fileId)

        manager.rename(fileId, 'app.cpp')
        expect(manager.getMeta(fileId).name).toBe('app.cpp')

        manager.move(fileId, null)
        expect(manager.getMeta(fileId).parentId).toBeNull()

        manager.delete(dirId)
        expect(manager.exists(dirId)).toBe(false)
        expect(manager.exists(fileId)).toBe(true)
    })

    it('validates names, parents, and conflicts', async () => {
        const manager = new SharedFileSystemManager(new MockConnectionFactory())
        await manager.init()

        const srcId = manager.create('src', 'dir', null)
        const nestedId = manager.create('nested', 'dir', srcId)
        const fileId = manager.create('main.cpp', 'file', srcId)

        expect(() => manager.create('', 'file', null)).toThrow(fsErrors.InvalidNodeNameError)
        expect(() => manager.create('bad/name', 'file', null)).toThrow(fsErrors.InvalidNodeNameError)
        expect(() => manager.create('main.cpp', 'file', srcId)).toThrow(fsErrors.NodeNameConflictError)
        expect(() => manager.move(fileId, 'missing')).toThrow(fsErrors.NodeNotFoundError)
        expect(() => manager.move(srcId, fileId)).toThrow(fsErrors.InvalidParentError)
        expect(() => manager.move(srcId, nestedId)).toThrow(fsErrors.CircularMoveError)
    })

    it('emits lifecycle events for metadata changes', async () => {
        const manager = new SharedFileSystemManager(new MockConnectionFactory())
        await manager.init()

        const onCreate = vi.fn()
        const onRename = vi.fn()
        const onMove = vi.fn()
        const onDelete = vi.fn()
        const onChange = vi.fn()

        manager.on('create', onCreate)
        manager.on('rename', onRename)
        manager.on('move', onMove)
        manager.on('delete', onDelete)
        manager.on('change', onChange)

        const dirId = manager.create('src', 'dir', null)
        const fileId = manager.create('main.cpp', 'file', dirId)
        manager.rename(fileId, 'app.cpp')
        manager.move(fileId, null)
        manager.delete(fileId)

        expect(onCreate).toHaveBeenCalledTimes(2)
        expect(onCreate).toHaveBeenNthCalledWith(1, { id: dirId, name: 'src', type: 'dir', parentId: null })
        expect(onCreate).toHaveBeenNthCalledWith(2, { id: fileId, name: 'main.cpp', type: 'file', parentId: dirId })
        expect(onRename).toHaveBeenCalledWith(fileId, 'main.cpp', 'app.cpp')
        expect(onMove).toHaveBeenCalledWith(fileId, dirId, null)
        expect(onDelete).toHaveBeenCalledWith({ id: fileId, name: 'app.cpp', type: 'file', parentId: null })
        expect(onChange).toHaveBeenCalled()
    })

    it('does not emit rename or move events when values are unchanged', async () => {
        const manager = new SharedFileSystemManager(new MockConnectionFactory())
        await manager.init()

        const dirId = manager.create('src', 'dir', null)
        const fileId = manager.create('main.cpp', 'file', dirId)
        const onRename = vi.fn()
        const onMove = vi.fn()
        const onChange = vi.fn()

        manager.on('rename', onRename)
        manager.on('move', onMove)
        manager.on('change', onChange)

        manager.rename(fileId, 'main.cpp')
        manager.move(fileId, dirId)

        expect(onRename).not.toHaveBeenCalled()
        expect(onMove).not.toHaveBeenCalled()
        expect(onChange).not.toHaveBeenCalled()
        expect(manager.getMeta(fileId)).toEqual({ id: fileId, name: 'main.cpp', type: 'file', parentId: dirId })
    })

    it('destroys underlying connection on destroy', async () => {
        const factory = new MockConnectionFactory()
        const manager = new SharedFileSystemManager(factory)
        await manager.init()

        manager.destroy()

        expect(factory.connection.destroy).toHaveBeenCalledOnce()
    })

    it('clears room persistence for deleted files', async () => {
        const factory = new MockConnectionFactory()
        const manager = new SharedFileSystemManager(factory)
        await manager.init()

        const srcId = manager.create('src', 'dir', null)
        const fileA = manager.create('a.cpp', 'file', srcId)
        const fileB = manager.create('b.cpp', 'file', srcId)

        manager.delete(srcId)

        expect(factory.clearRoomMock).toHaveBeenCalledTimes(2)
        expect(factory.clearRoomMock).toHaveBeenCalledWith(fileA)
        expect(factory.clearRoomMock).toHaveBeenCalledWith(fileB)
    })
})
