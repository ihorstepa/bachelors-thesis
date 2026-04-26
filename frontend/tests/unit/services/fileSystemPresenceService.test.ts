import { describe, expect, it, vi } from 'vitest'

import type { Connection } from '@/core/connectionFactory'
import type { NodeMeta, NodeType } from '@/core/fileSystemManager'
import { FileSystemManager } from '@/core/fileSystemManager'
import FileSystemPresenceService from '@/services/presenceService/fileSystemPresenceService'
import type { NullableString } from '@/utils/types'

type UserState = {
    user?: {
        name: string
        color: string
        activeFileId: string | null
    } | null
}

class MockAwareness {
    public clientID = 1
    private states = new Map<number, UserState>()
    private listeners = new Set<() => void>()

    public constructor() {
        this.states.set(this.clientID, { user: null })
    }

    public on(_event: 'change', handler: () => void): void {
        this.listeners.add(handler)
    }

    public off(_event: 'change', handler: () => void): void {
        this.listeners.delete(handler)
    }

    public getStates(): Map<number, UserState> {
        return this.states
    }

    public setLocalStateField(field: 'user', value: UserState['user']): void {
        const current = this.states.get(this.clientID) ?? {}
        this.states.set(this.clientID, { ...current, [field]: value })
    }

    public setRemote(clientId: number, state: UserState): void {
        this.states.set(clientId, state)
    }

    public triggerChange(): void {
        this.listeners.forEach((listener) => listener())
    }
}

class MockFileSystemManager extends FileSystemManager {
    private nodes = new Map<string, NodeMeta>()
    private nextId = 1
    private awareness = new MockAwareness()

    public create(name: string, type: NodeType, parentId: NullableString): string {
        const id = `n-${this.nextId++}`
        this.nodes.set(id, { id, name, type, parentId })
        this.emit('change')
        return id
    }

    public delete(id: string): void {
        const meta = this.getMeta(id)
        this.nodes.delete(id)
        this.emit('delete', meta)
        this.emit('change')
    }

    public rename(id: string, name: string): void {
        const meta = this.getMeta(id)
        this.nodes.set(id, { ...meta, name })
        this.emit('rename', id, meta.name, name)
        this.emit('change')
    }

    public move(nodeId: string, parentId: NullableString): void {
        const meta = this.getMeta(nodeId)
        this.nodes.set(nodeId, { ...meta, parentId })
        this.emit('move', nodeId, meta.parentId, parentId)
        this.emit('change')
    }

    public copy(nodeId: string, targetParentId: NullableString): string {
        void nodeId
        void targetParentId
        throw new Error('not implemented')
    }

    public exists(id: string): boolean {
        return this.nodes.has(id)
    }

    public getMeta(id: string): NodeMeta {
        const meta = this.nodes.get(id)
        if (!meta) throw new Error(`Unknown id: ${id}`)
        return meta
    }

    public getChildrenMeta(parentId: NullableString): NodeMeta[] {
        return Array.from(this.nodes.values()).filter((n) => n.parentId === parentId)
    }

    public getRootConnection(): Connection {
        return {
            room: 'root',
            doc: {} as Connection['doc'],
            awareness: this.awareness as unknown as Connection['awareness'],
            synced: Promise.resolve(),
            connect: () => undefined,
            disconnect: () => undefined,
            destroy: () => undefined,
        }
    }

    public setRemotePresence(clientId: number, user: UserState['user']): void {
        this.awareness.setRemote(clientId, { user })
        this.awareness.triggerChange()
    }

    public getLocalUser(): UserState['user'] {
        return this.awareness.getStates().get(this.awareness.clientID)?.user ?? null
    }
}

describe('FileSystemPresenceService', () => {
    it('indexes online users by active branch and excludes local user from online list', () => {
        const fs = new MockFileSystemManager()
        const dirId = fs.create('src', 'dir', null)
        const fileId = fs.create('main.cpp', 'file', dirId)

        const service = new FileSystemPresenceService(fs, 'alice')

        fs.setRemotePresence(2, {
            name: 'bob',
            color: '#112233',
            activeFileId: fileId,
        })
        fs.setRemotePresence(3, {
            name: 'eve',
            color: '#445566',
            activeFileId: null,
        })

        expect(service.getOnlineUsers().map((u) => u.clientId)).toEqual([2, 3])
        expect(service.getUsersInBranch(fileId).map((u) => u.clientId)).toEqual([2])
        expect(service.getUsersInBranch(dirId).map((u) => u.clientId)).toEqual([2])
        expect(service.getUsersInBranch(null).map((u) => u.clientId)).toEqual([2, 3])
    })

    it('updates local awareness location and clears local user on destroy', () => {
        const fs = new MockFileSystemManager()
        const fileId = fs.create('main.cpp', 'file', null)
        const service = new FileSystemPresenceService(fs, 'alice')

        const onChange = vi.fn()
        service.on('change', onChange)

        const status = service.setLocation(fileId)

        expect(status.activeFileId).toBe(fileId)
        expect(fs.getLocalUser()?.activeFileId).toBe(fileId)

        fs.setRemotePresence(2, { name: 'bob', color: '#123456', activeFileId: null })
        expect(onChange).toHaveBeenCalled()

        service.destroy()
        expect(fs.getLocalUser()).toBeNull()
    })

    it('keeps remote user online but skips branch indexing for missing active files', () => {
        const fs = new MockFileSystemManager()
        const service = new FileSystemPresenceService(fs, 'alice')

        fs.setRemotePresence(2, {
            name: 'bob',
            color: '#112233',
            activeFileId: 'missing-node',
        })

        expect(service.getOnlineUsers().map((u) => u.clientId)).toEqual([2])
        expect(service.getUsersInBranch('missing-node')).toEqual([])
    })
})
