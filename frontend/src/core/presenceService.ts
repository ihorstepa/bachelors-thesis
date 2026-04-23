import mixin from '@/utils/mixin'
import { BaseService, Observable } from '@/core/general'
import type { NullableString } from '@/utils/types'

export type UserStatus = {
    readonly name: string
    readonly color: string
    readonly activeFileId: string | null
}

export type PresenceEvents = {
    change: []
}

export type PresenceEntry = {
    clientId: number
    user: UserStatus
}

const ClassBase = mixin(BaseService, Observable<PresenceEvents>)

export abstract class PresenceService extends ClassBase {
    public abstract setLocation(fileId: string | null): UserStatus
    public abstract getUsersInBranch(nodeId: NullableString): PresenceEntry[]
    public abstract getOnlineUsers(): PresenceEntry[]
}
