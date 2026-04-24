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
import FileTreeRoot from '@/components/FileTree/FileTreeRoot'
import IdeContextMenu from '@/components/IdeContextMenu/IdeContextMenu'
import { buildFileTreeContextMenuSections } from '@/components/FileTree/fileTreeContextMenuSections'
import { MAX_PROJECT_FILES } from '@/config'
import type { FileTreeContextMenuState } from '@/components/FileTree/fileTreeContextMenuSections'
import type { NullableString } from '@/utils/types'
import type { TreeNode } from '@/core/fileTreeManager'
import type { NodeType } from '@/core/fileSystemManager'

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
    const [contextMenu, setContextMenu] = useState<FileTreeContextMenuState | null>(null)
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragPreviewOffset, setDragPreviewOffset] = useState({ x: 16, y: 10 })

    const fileLimitReached = canWrite && countFiles(tree) >= MAX_PROJECT_FILES

    const closeMenu = () => {
        setContextMenu(null)
    }

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

    const handleCreateFile = (parentIdOverride?: NullableString) => {
        if (!canWrite || fileLimitReached) return
        const name = prompt('File name:')
        if (name) {
            const targetParentId =
                parentIdOverride === undefined ? fileTreeManager.getTargetParentId() : parentIdOverride
            fileSystemManager.create(name, 'file', targetParentId)
        }
    }

    const handleCreateDir = (parentIdOverride?: NullableString) => {
        if (!canWrite) return
        const name = prompt('Directory name:')
        if (name) {
            const targetParentId =
                parentIdOverride === undefined ? fileTreeManager.getTargetParentId() : parentIdOverride
            fileSystemManager.create(name, 'dir', targetParentId)
        }
    }

    const canRenameOrDelete = canWrite && !!selectedId && selectedId !== 'root'

    const handleRename = (nodeId?: string) => {
        if (!canWrite) return
        const targetId = nodeId ?? selectedId
        if (!targetId || targetId === 'root') return

        const meta = fileSystemManager.getMeta(targetId)
        const newName = prompt('Rename to:', meta.name)
        if (newName) {
            fileSystemManager.rename(targetId, newName)
        }
    }

    const handleDelete = (nodeId?: string) => {
        if (!canWrite) return
        const targetId = nodeId ?? selectedId
        if (!targetId || targetId === 'root') return

        const meta = fileSystemManager.getMeta(targetId)
        if (confirm(`Delete ${meta.name}?`)) {
            fileSystemManager.delete(targetId)
        }
    }

    const handleNodeContextMenu = (nodeId: string, nodeType: NodeType, x: number, y: number) => {
        if (!canWrite || nodeId === 'root') return

        setContextMenu({
            x,
            y,
            target: {
                nodeId,
                nodeType,
            },
        })
    }

    const handleRootContextMenu = (event: React.MouseEvent) => {
        if (!canWrite) return

        event.preventDefault()
        event.stopPropagation()
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            target: {
                nodeId: null,
                nodeType: 'dir',
            },
        })
    }

    const contextMenuSections = buildFileTreeContextMenuSections({
        menu: contextMenu,
        fileLimitReached,
        onCreateFile: (parentId) => {
            handleCreateFile(parentId)
            closeMenu()
        },
        onCreateDir: (parentId) => {
            handleCreateDir(parentId)
            closeMenu()
        },
        onRename: (nodeId) => {
            handleRename(nodeId)
            closeMenu()
        },
        onDelete: (nodeId) => {
            handleDelete(nodeId)
            closeMenu()
        },
    })

    return (
        <div className='file-tree-container' onScroll={closeMenu}>
            <FileTreeToolBar
                onCreateFile={() => handleCreateFile()}
                onCreateDir={() => handleCreateDir()}
                onRename={() => handleRename()}
                onDelete={() => handleDelete()}
                canWrite={canWrite}
                canRenameOrDelete={canRenameOrDelete}
                fileLimitReached={fileLimitReached}
            />
            <DragDropProvider onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <FileTreeRoot onContextMenu={handleRootContextMenu}>
                    {tree.map((node) => (
                        <FileTreeItem
                            key={node.id}
                            node={node}
                            level={0}
                            canWrite={canWrite}
                            onContextMenu={handleNodeContextMenu}
                        />
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
            <IdeContextMenu
                sections={contextMenuSections}
                isOpen={contextMenu != null}
                onClose={closeMenu}
                lockScroll
                anchorPoint={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
                className='file-tree-context-menu-panel'
            />
        </div>
    )
}

export default FileTree
