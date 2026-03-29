import { Awareness } from 'y-protocols/awareness'

import { PresenceService } from '@/core/presenceService'
import { FileSystemManager } from '@/core/fileSystemManager'
import { generateRandomName, generateRandomColor } from '@/utils/identity'
import type { NullableString } from '@/utils/types'
import type { UserStatus } from '@/core/presenceService'

class FileSystemPresenceService extends PresenceService {
    private fileSystemManager: FileSystemManager
    private awareness: Awareness
    private users: Map<number, UserStatus> = new Map()
    private index: Map<string, Set<number>> = new Map()
    private userStatus: UserStatus

    constructor(fileSystemManager: FileSystemManager) {
        super()
        this.fileSystemManager = fileSystemManager
        this.awareness = fileSystemManager.getRootConnection().awareness

        this.userStatus = {
            name: generateRandomName(),
            color: generateRandomColor(),
            activeFileId: null,
        }
        this.awareness.setLocalStateField('user', this.userStatus)

        this.handleUpdate = this.handleUpdate.bind(this)
        this.awareness.on('change', this.handleUpdate)
        this.fileSystemManager.on('change', this.handleUpdate)

        this.buildIndex()
    }

    public destroy(): void {
        this.awareness.off('change', this.handleUpdate)
        this.fileSystemManager.off('change', this.handleUpdate)
        this.index.clear()
        this.awareness.setLocalStateField('user', null)
    }

    public setLocation(fileId: string | null): UserStatus {
        this.awareness.setLocalStateField('user', { ...this.userStatus, activeFileId: fileId })
        return this.userStatus
    }

    public getOnlineUsers(): { clientId: number; user: UserStatus }[] {
        return Array.from(this.users.entries()).map(([clientId, user]) => ({ clientId, user }))
    }

    public getUsersInBranch(nodeId: NullableString): { clientId: number; user: UserStatus }[] {
        if (nodeId === null) {
            return this.getOnlineUsers()
        }

        const clientIds = this.index.get(nodeId)
        if (!clientIds) return []

        return Array.from(clientIds)
            .map((clientId) => ({ clientId, user: this.users.get(clientId) }))
            .filter((entry): entry is { clientId: number; user: UserStatus } => !!entry.user)
    }

    private buildIndex(): void {
        this.index.clear()
        this.users = new Map()

        this.awareness.getStates().forEach((state, clientId) => {
            if (clientId === this.awareness.clientID) return

            const user = state.user as UserStatus | undefined
            if (!user) return

            this.users.set(clientId, user)
            if (!user.activeFileId) return

            let currentId: NullableString = user.activeFileId
            while (currentId) {
                if (!this.index.has(currentId)) {
                    this.index.set(currentId, new Set())
                }
                this.index.get(currentId)!.add(clientId)
                currentId = this.fileSystemManager.getMeta(currentId).parentId
            }
        })
    }

    private handleUpdate(): void {
        this.buildIndex()
        this.emit('change')
    }
}

export default FileSystemPresenceService
