import { useEffect } from 'react'
import { DragDropProvider } from '@dnd-kit/react'
import type { JSX } from 'react'

import { useFileTree } from '@/contextProviders/FileTreeProvider'
import { FileTreeItem } from '@/components/FileTree/FileTreeItem'
import FileTreeToolBar from '@/components/FileTree/FileTreeToolBar'
import { useService } from '@/contextProviders/ServiceProvider'
import { FileSystemManager } from '@/core/fileSystemManager'
import { useTabs } from '@/contextProviders/TabsProvider'
import type { NullableString } from '@/utils/types'
import FileTreeRoot from './FileTreeRoot'
import { MAX_PROJECT_FILES } from '@/config'
import type { TreeNode } from '@/core/fileTreeManager'
import '@/components/FileTree/FileTree.css'

function countFiles(nodes: TreeNode[]): number {
    return nodes.reduce((acc, node) => acc + (node.type === 'file' ? 1 : 0) + countFiles(node.children), 0)
}

type Props = {
    canWrite: boolean
}

function FileTree({ canWrite }: Props): JSX.Element {
    const fileSystemManager = useService(FileSystemManager)
    const { tree, selectedId, fileTreeManager } = useFileTree()
    const { activeId } = useTabs()

    const fileLimitReached = canWrite && countFiles(tree) >= MAX_PROJECT_FILES

    useEffect(() => {
        if (!activeId) return
        const meta = fileSystemManager.getMeta(activeId)
        if (meta.type === 'file') {
            fileTreeManager.selectItem(activeId)
        }
    }, [activeId, fileSystemManager, fileTreeManager])

    const handleDragEnd = (event: any) => {
        if (!canWrite) return

        const { source, target } = event.operation ?? {}
        if (!source || !target) return

        const sourceId = String(source.id)
        const targetId = String(target.id)
        let targetParentId: NullableString

        if (targetId === 'root') {
            targetParentId = null
        } else {
            const targetNode = fileSystemManager.getMeta(targetId)
            targetParentId = targetNode.type === 'dir' ? targetId : targetNode.parentId
        }

        fileSystemManager.move(sourceId, targetParentId)
    }

    const handleCreateFile = () => {
        if (!canWrite || fileLimitReached) return
        const name = prompt('File name:')
        if (name) {
            fileSystemManager.create(name, 'file', fileTreeManager.getTargetParentId())
        }
    }

    const handleCreateDir = () => {
        if (!canWrite) return
        const name = prompt('Directory name:')
        if (name) {
            fileSystemManager.create(name, 'dir', fileTreeManager.getTargetParentId())
        }
    }

    const canRenameOrDelete = canWrite && !!selectedId && selectedId !== 'root'

    const handleRename = () => {
        if (!canWrite) return
        if (!canRenameOrDelete) return
        const meta = fileSystemManager.getMeta(selectedId)
        const newName = prompt('Rename to:', meta.name)
        if (newName) {
            fileSystemManager.rename(selectedId, newName)
        }
    }

    const handleDelete = () => {
        if (!canWrite) return
        if (!canRenameOrDelete) return
        const meta = fileSystemManager.getMeta(selectedId)
        if (confirm(`Delete ${meta.name}?`)) {
            fileSystemManager.delete(selectedId)
        }
    }

    return (
        <div className='file-tree-container'>
            <FileTreeToolBar
                onCreateFile={handleCreateFile}
                onCreateDir={handleCreateDir}
                onRename={handleRename}
                onDelete={handleDelete}
                canWrite={canWrite}
                canRenameOrDelete={canRenameOrDelete}
                fileLimitReached={fileLimitReached}
            />
            <DragDropProvider onDragEnd={handleDragEnd as any}>
                <FileTreeRoot>
                    {tree.map((node) => (
                        <FileTreeItem key={node.id} node={node} level={0} canWrite={canWrite} />
                    ))}
                </FileTreeRoot>
            </DragDropProvider>
        </div>
    )
}

export default FileTree
