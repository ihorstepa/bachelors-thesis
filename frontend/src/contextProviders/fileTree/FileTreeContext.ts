import { createContext, useContext } from 'react'

import { type FileTreeManager,type TreeNode } from '@/core/fileTreeManager'

export type FileTreeState = {
    tree: TreeNode[]
    expanded: Set<string>
    selectedId: string | null
    fileTreeManager: FileTreeManager
}

export const FileTreeContext = createContext<FileTreeState | null>(null)

export function useFileTree(): FileTreeState {
    const context = useContext(FileTreeContext)
    if (!context) throw new Error('useFileTree must be used within FileTreeProvider')
    return context
}

