import mixin from '@/utils/mixin'
import { BaseService, Observable } from '@/core/interfaces/general'
import type { NullableString } from '@/utils/types'

export type NodeType = 'file' | 'dir'

export type NodeMeta = {
    readonly id: string
    readonly name: string
    readonly type: NodeType
    readonly parentId: NullableString
}

const ClassBase = mixin(BaseService, Observable)

export abstract class IFileSystemManager extends ClassBase {
    public abstract create(name: string, type: NodeType, parentId: NullableString): string
    public abstract remove(id: string): void
    public abstract rename(id: string, name: string): void
    public abstract move(nodeId: string, parentId: NullableString): void
    public abstract exists(id: string): boolean
    public abstract getMeta(id: string): NodeMeta
    public abstract getChildrenMeta(id: NullableString): NodeMeta[]
    // TODO: copy
}
