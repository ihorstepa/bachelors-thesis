import { FileTreeManager } from '@/core/fileTreeManager'
import { FileSystemManager } from '@/core/fileSystemManager'
import type { TreeNode } from '@/core/fileTreeManager'
import type { NodeMeta } from '@/core/fileSystemManager'
import type { NullableString } from '@/utils/types'

class LocalFileTreeManager extends FileTreeManager {
    private fileSystemManager: FileSystemManager
    private tree: TreeNode[] = []
    private expanded: Set<string> = new Set()
    private selectedId: string | null = null

    constructor(fileSystemManager: FileSystemManager) {
        super()
        this.fileSystemManager = fileSystemManager

        this.refreshTree = this.refreshTree.bind(this)
        this.fileSystemManager.on('change', this.refreshTree)

        this.refreshTree()
    }

    public destroy(): void {
        this.fileSystemManager.off('change', this.refreshTree)
        this.tree = []
        this.expanded = new Set()
        this.selectedId = null
    }

    public getTree(): TreeNode[] {
        return this.tree
    }

    public getExpanded(): Set<string> {
        return this.expanded
    }

    public getSelectedId(): string | null {
        return this.selectedId
    }

    public selectItem(id: string): void {
        if (!this.fileSystemManager.exists(id)) return
        this.expandAncestors(id)

        if (this.selectedId === id) return
        this.selectedId = id

        this.emit('select', id)
    }

    public toggleExpand(id: string): void {
        const next = new Set(this.expanded)

        next.has(id) ? next.delete(id) : next.add(id)
        this.expanded = next

        this.emit('expand', next)
    }

    public getTargetParentId(): NullableString {
        const id = this.selectedId
        if (!id || id === 'root') return null
        const meta = this.fileSystemManager.getMeta(id)
        return meta.type === 'dir' ? id : meta.parentId
    }

    private expandAncestors(id: string): void {
        const next = new Set(this.expanded)
        let current: string | null = id

        while (current !== null) {
            const meta = this.fileSystemManager.getMeta(current)
            const parentId = meta.parentId
            if (parentId) next.add(parentId)
            current = parentId
        }

        this.expanded = next
        this.emit('expand', next)
    }

    private refreshTree(): void {
        const nodes: NodeMeta[] = []

        const traverse = (parentId: NullableString) => {
            const children = this.fileSystemManager.getChildrenMeta(parentId)
            for (const child of children) {
                nodes.push(child)
                if (child.type === 'file') continue
                traverse(child.id)
            }
        }
        traverse(null)

        this.tree = this.buildTree(nodes)
        this.emit('change', this.tree)
    }

    private buildTree(nodes: NodeMeta[]): TreeNode[] {
        const map = new Map(nodes.map((n) => [n.id, { ...n, children: [] as TreeNode[] }]))
        const roots: TreeNode[] = []

        for (const node of map.values()) {
            const parent = node.parentId ? map.get(node.parentId) : null
            if (parent?.type === 'dir') {
                parent.children.push(node)
            } else {
                roots.push(node)
            }
        }

        const sort = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)))
            nodes.forEach((n) => n.children.length && sort(n.children))
        }
        sort(roots)

        return roots
    }
}

export default LocalFileTreeManager
