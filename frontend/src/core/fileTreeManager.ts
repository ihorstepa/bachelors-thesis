import mixin from '@/utils/mixin'
import { BaseService, Observable } from '@/core/general'
import type { NullableString } from '@/utils/types'
import type { NodeType } from '@/core/fileSystemManager'

export type TreeNode = {
    id: string
    name: string
    type: NodeType
    parentId: NullableString
    children: TreeNode[]
}

export type FileTreeEvents = {
    change: [tree: TreeNode[]]
    expand: [expanded: Set<string>]
    select: [selectedId: string | null]
}

const ClassBase = mixin(BaseService, Observable<FileTreeEvents>)

export abstract class FileTreeManager extends ClassBase {
    public abstract getTree(): TreeNode[]
    public abstract getExpanded(): Set<string>
    public abstract getSelectedId(): string | null

    public abstract selectItem(id: string): void
    public abstract toggleExpand(id: string): void

    public abstract getTargetParentId(): NullableString
}
