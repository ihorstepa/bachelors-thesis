import { type JSX, useSyncExternalStore } from 'react'

import { FileTreeContext, type FileTreeState } from '@/contextProviders/fileTree/FileTreeContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { FileTreeManager } from '@/core/fileTreeManager'

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
