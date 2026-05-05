import type { Connection } from '@/core/connectionFactory'
import { BaseService, Observable } from '@/core/general'
import mixin from '@/utils/mixin'
import type { NullableString } from '@/utils/types'

export type NodeType = 'file' | 'dir'

export type NodeMeta = {
    readonly id: string
    readonly name: string
    readonly type: NodeType
    readonly parentId: NullableString
}

export type FileSystemEvents = {
    readonly change: []
    readonly create: [meta: NodeMeta]
    readonly delete: [meta: NodeMeta]
    readonly move: [id: string, oldParentId: NullableString, newParentId: NullableString]
    readonly rename: [id: string, oldName: string, newName: string]
}

const ClassBase = mixin(BaseService, Observable<FileSystemEvents>)

export abstract class FileSystemManager extends ClassBase {
    public abstract create(name: string, type: NodeType, parentId: NullableString): string
    public abstract delete(id: string): void
    public abstract rename(id: string, name: string): void
    public abstract move(nodeId: string, parentId: NullableString): void

    public abstract exists(id: string): boolean
    public abstract getMeta(id: string): NodeMeta
    public abstract getChildrenMeta(parentId: NullableString): NodeMeta[]

    public abstract getRootConnection(): Connection
}
