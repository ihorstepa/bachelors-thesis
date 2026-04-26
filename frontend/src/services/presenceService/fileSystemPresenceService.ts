import type { Awareness } from 'y-protocols/awareness'

import type { FileSystemManager } from '@/core/fileSystemManager'
import type { PresenceEntry, UserStatus } from '@/core/presenceService'
import { PresenceService } from '@/core/presenceService'
import { generateColorFromSeed, generateRandomColor, generateRandomName } from '@/utils/identity'
import type { NullableString } from '@/utils/types'

class FileSystemPresenceService extends PresenceService {
    private fileSystemManager: FileSystemManager
    private awareness: Awareness
    private users: Map<number, UserStatus> = new Map()
    private index: Map<NullableString, Set<number>> = new Map()
    private cachedBranchUsers: Map<NullableString, PresenceEntry[]> = new Map()
    private cachedOnlineUsers: PresenceEntry[] = []
    private userStatus: UserStatus

    private static readonly emptyUsers: PresenceEntry[] = []

    constructor(fileSystemManager: FileSystemManager, username?: string) {
        super()
        this.fileSystemManager = fileSystemManager
        this.awareness = fileSystemManager.getRootConnection().awareness

        this.userStatus = {
            name: username ?? generateRandomName(),
            color: username ? generateColorFromSeed(username) : generateRandomColor(),
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
        this.cachedBranchUsers.clear()
        this.cachedOnlineUsers = FileSystemPresenceService.emptyUsers
        this.awareness.setLocalStateField('user', null)
    }

    public setLocation(fileId: string | null): UserStatus {
        this.userStatus = { ...this.userStatus, activeFileId: fileId }
        this.awareness.setLocalStateField('user', this.userStatus)
        return this.userStatus
    }

    public getOnlineUsers(): PresenceEntry[] {
        return this.cachedOnlineUsers
    }

    public getUsersInBranch(nodeId: NullableString): PresenceEntry[] {
        if (nodeId === null) {
            return this.getOnlineUsers()
        }

        return this.cachedBranchUsers.get(nodeId) ?? FileSystemPresenceService.emptyUsers
    }

    private buildIndex(): void {
        this.index.clear()
        this.cachedBranchUsers.clear()
        this.users = new Map()

        this.awareness.getStates().forEach((state, clientId) => {
            if (clientId === this.awareness.clientID) return

            const user = state.user as UserStatus | undefined
            if (!user) return

            this.users.set(clientId, user)
            if (!user.activeFileId) return

            let currentId: NullableString = user.activeFileId
            while (currentId) {
                if (!this.fileSystemManager.exists(currentId)) break

                if (!this.index.has(currentId)) {
                    this.index.set(currentId, new Set())
                }

                this.index.get(currentId)!.add(clientId)
                currentId = this.fileSystemManager.getMeta(currentId).parentId
            }
        })

        this.cachedOnlineUsers = Array.from(this.users.entries()).map(([clientId, user]) => ({ clientId, user }))

        this.index.forEach((clientIds, nodeId) => {
            const users = Array.from(clientIds)
                .map((clientId) => ({ clientId, user: this.users.get(clientId) }))
                .filter((entry): entry is PresenceEntry => !!entry.user)

            this.cachedBranchUsers.set(nodeId, users)
        })
    }

    private handleUpdate(): void {
        this.buildIndex()
        this.emit('change')
    }
}

export default FileSystemPresenceService
