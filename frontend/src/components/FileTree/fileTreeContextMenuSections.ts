import type { IdeContextMenuItem } from '@/components/ContextMenu/ContextMenu'
import type { NodeType } from '@/core/fileSystemManager'
import type { NullableString } from '@/utils/types'

export type FileTreeContextTarget = {
    nodeId: NullableString
    nodeType: NodeType
}

export type FileTreeContextMenuState = {
    x: number
    y: number
    target: FileTreeContextTarget
}

type BuildSectionsOptions = {
    menu: FileTreeContextMenuState | null
    fileLimitReached: boolean
    onCreateFile: (parentId: NullableString) => void
    onCreateDir: (parentId: NullableString) => void
    onRename: (nodeId: string) => void
    onDelete: (nodeId: string) => void
}

export function buildFileTreeContextMenuSections({
    menu,
    fileLimitReached,
    onCreateFile,
    onCreateDir,
    onRename,
    onDelete,
}: BuildSectionsOptions): IdeContextMenuItem[][] {
    if (!menu) return []

    const { nodeId, nodeType } = menu.target
    const sections: IdeContextMenuItem[][] = []

    if (nodeType === 'dir') {
        sections.push([
            {
                id: 'new-file',
                label: 'New File',
                onSelect: () => onCreateFile(nodeId),
                disabled: fileLimitReached,
            },
            {
                id: 'new-dir',
                label: 'New Directory',
                onSelect: () => onCreateDir(nodeId),
            },
        ])
    }

    if (nodeId) {
        sections.push([
            {
                id: 'rename',
                label: 'Rename',
                onSelect: () => onRename(nodeId),
            },
            {
                id: 'delete',
                label: 'Delete',
                onSelect: () => onDelete(nodeId),
                className: 'danger',
            },
        ])
    }

    return sections
}
