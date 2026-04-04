import { createContext, useContext, useSyncExternalStore, type JSX } from 'react'
import { useService } from '@/contextProviders/ServiceProvider'
import { FileTreeManager, type TreeNode } from '@/core/fileTreeManager'

type FileTreeState = {
    tree: TreeNode[]
    expanded: Set<string>
    selectedId: string | null
    fileTreeManager: FileTreeManager
}

const FileTreeContext = createContext<FileTreeState | null>(null)

export function useFileTree(): FileTreeState {
    const context = useContext(FileTreeContext)
    if (!context) throw new Error('useFileTree must be used within FileTreeProvider')
    return context
}

type Props = {
    children: React.ReactNode
}

function FileTreeProvider({ children }: Props): JSX.Element {
    const fileTreeManager = useService(FileTreeManager)

    const tree = useSyncExternalStore(
        (cb) => fileTreeManager.on('change', cb),
        () => fileTreeManager.getTree(),
    )

    const expanded = useSyncExternalStore(
        (cb) => fileTreeManager.on('expand', cb),
        () => fileTreeManager.getExpanded(),
    )

    const selectedId = useSyncExternalStore(
        (cb) => fileTreeManager.on('select', cb),
        () => fileTreeManager.getSelectedId(),
    )

    const value: FileTreeState = { tree, expanded, selectedId, fileTreeManager }

    return <FileTreeContext value={value}>{children}</FileTreeContext>
}

export default FileTreeProvider
