import type { Doc } from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

import { BaseService } from '@/core/interfaces/general'

export type Connection = {
    readonly room: string
    readonly doc: Doc
    readonly awareness: Awareness
    readonly synced: Promise<void>
    connect(): void
    disconnect(): void
    destroy(): void
}

export type ConnectionConfig = {
    doc?: Doc
    autoconnect?: boolean
}

export abstract class IConnectionFactory extends BaseService {
    public abstract connect(room: string, config?: ConnectionConfig): Promise<Connection>
}
