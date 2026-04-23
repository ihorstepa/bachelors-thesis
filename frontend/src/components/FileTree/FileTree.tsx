import { useEffect, useState } from 'react'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/react'
import type { CSSProperties, JSX } from 'react'

import { useFileTree } from '@/contextProviders/FileTreeProvider'
import { FileTreeItem } from '@/components/FileTree/FileTreeItem'
import FileTreeDragPreview from '@/components/FileTree/FileTreeDragPreview'
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

type PointerLikeEvent = {
    clientX: number
    clientY: number
}

function isPointerLikeEvent(event: Event): event is Event & PointerLikeEvent {
    return (
        typeof (event as { clientX?: unknown }).clientX === 'number' &&
        typeof (event as { clientY?: unknown }).clientY === 'number'
    )
}

function FileTree({ canWrite }: Props): JSX.Element {
    const fileSystemManager = useService(FileSystemManager)
    const { tree, selectedId, fileTreeManager } = useFileTree()
    const { activeId } = useTabs()
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragPreviewOffset, setDragPreviewOffset] = useState({ x: 16, y: 10 })

    const fileLimitReached = canWrite && countFiles(tree) >= MAX_PROJECT_FILES

    useEffect(() => {
        if (!activeId) return
        const meta = fileSystemManager.getMeta(activeId)
        if (meta.type === 'file') {
            fileTreeManager.selectItem(activeId)
        }
    }, [activeId, fileSystemManager, fileTreeManager])

    const handleDragEnd: DragEndEvent = (event) => {
        setDraggedId(null)
        if (!canWrite) return

        const { source, target } = event.operation
        if (!source || !target) return

        const sourceId = String(source.id)
        const targetId = String(target.id)
        if (sourceId === targetId) return

        let targetParentId: NullableString

        if (targetId === 'root') {
            targetParentId = null
        } else {
            const targetNode = fileSystemManager.getMeta(targetId)
            targetParentId = targetNode.type === 'dir' ? targetId : targetNode.parentId
        }

        fileSystemManager.move(sourceId, targetParentId)
    }

    const handleDragStart: DragStartEvent = (event) => {
        const sourceId = event.operation.source?.id
        setDraggedId(sourceId ? String(sourceId) : null)

        const activatorEvent = event.operation.activatorEvent
        const sourceElement = event.operation.source?.element
        if (!activatorEvent || !sourceElement) return

        if (!isPointerLikeEvent(activatorEvent)) return

        const rect = sourceElement.getBoundingClientRect()
        setDragPreviewOffset({
            x: activatorEvent.clientX - rect.left,
            y: activatorEvent.clientY - rect.top,
        })
    }

    const overlayStyle = {
        '--drag-offset-x': `${dragPreviewOffset.x}px`,
        '--drag-offset-y': `${dragPreviewOffset.y}px`,
    } as CSSProperties

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
            <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <FileTreeRoot>
                    {tree.map((node) => (
                        <FileTreeItem key={node.id} node={node} level={0} canWrite={canWrite} />
                    ))}
                </FileTreeRoot>
                <DragOverlay dropAnimation={null} className='tree-overlay-wrapper' style={overlayStyle}>
                    {draggedId && fileSystemManager.exists(draggedId)
                        ? (() => {
                              const meta = fileSystemManager.getMeta(draggedId)
                              return <FileTreeDragPreview type={meta.type} name={meta.name} />
                          })()
                        : null}
                </DragOverlay>
            </DragDropProvider>
        </div>
    )
}

export default FileTree
