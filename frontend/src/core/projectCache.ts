import type { Doc } from 'yjs'

import { BaseService } from '@/core/general'

export interface Persistence {
    readonly whenSynced: Promise<unknown>
    destroy(): void
}

export interface RoomCache {
    persist(room: string, doc: Doc): Persistence
    clearRoom(room: string): Promise<void>
}

export abstract class ProjectCache extends BaseService {
    public abstract forScope(scope: string): RoomCache
    public abstract clearProject(projectId: string): Promise<void>
}
