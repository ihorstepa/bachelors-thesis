import type { Doc } from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

import { BaseService } from '@/core/general'

export type SharedFile = {
    readonly doc: Doc
    readonly awareness: Awareness
    readonly synced: Promise<void>
}

export abstract class FileSyncManager extends BaseService {
    public abstract openFile(id: string): Promise<SharedFile>
    public abstract closeFile(id: string): void
}
