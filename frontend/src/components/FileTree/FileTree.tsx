import '@/components/FileTree/FileTree.css'

import type { DragEndEvent,DragStartEvent } from '@dnd-kit/react'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import type { CSSProperties, JSX } from 'react'
import { useEffect, useState } from 'react'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import ContextMenu from '@/components/ContextMenu/ContextMenu'
import type { FileTreeContextMenuState } from '@/components/FileTree/fileTreeContextMenuSections'
import { buildFileTreeContextMenuSections } from '@/components/FileTree/fileTreeContextMenuSections'
import FileTreeDragPreview from '@/components/FileTree/FileTreeDragPreview'
import FileTreeInput from '@/components/FileTree/FileTreeInput'
import type { FileTreeEditState } from '@/components/FileTree/FileTreeItem'
import { FileTreeItem } from '@/components/FileTree/FileTreeItem'
import FileTreeRoot from '@/components/FileTree/FileTreeRoot'
import FileTreeToolBar from '@/components/FileTree/FileTreeToolBar'
import { MAX_PROJECT_FILES } from '@/config'
import { useFileTree } from '@/contextProviders/fileTree/FileTreeContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { useTabs } from '@/contextProviders/tabs/TabsContext'
import type { NodeType } from '@/core/fileSystemManager'
import { FileSystemManager } from '@/core/fileSystemManager'
import type { TreeNode } from '@/core/fileTreeManager'
import * as err from '@/errors/fileSystem'
import type { NullableString } from '@/utils/types'
import { validateNodeName } from '@/utils/validators'

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

type DeleteTarget = {
    id: string
    name: string
    type: NodeType
}

function FileTree({ canWrite }: Props): JSX.Element {
    const fileSystemManager = useService(FileSystemManager)
    const { tree, expanded, selectedId, fileTreeManager } = useFileTree()
    const { activeId } = useTabs()
    const [contextMenu, setContextMenu] = useState<FileTreeContextMenuState | null>(null)
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragPreviewOffset, setDragPreviewOffset] = useState({ x: 16, y: 10 })
    const [editState, setEditState] = useState<FileTreeEditState | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

    const fileLimitReached = canWrite && countFiles(tree) >= MAX_PROJECT_FILES

    const closeMenu = () => {
        setContextMenu(null)
    }

    const beginCreate = (kind: NodeType, parentId: NullableString) => {
        if (parentId !== null && !expanded.has(parentId)) {
            fileTreeManager.toggleExpand(parentId)
        }
        setEditState({ mode: 'create', type: kind, parentId })
    }

    const beginRename = (nodeId: string) => {
        setEditState({ mode: 'rename', nodeId })
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

        try {
            fileSystemManager.move(sourceId, targetParentId)
        } catch (error) {
            window.alert(mapMoveError(error))
        }
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
        const targetParentId = parentIdOverride === undefined ? fileTreeManager.getTargetParentId() : parentIdOverride
        beginCreate('file', targetParentId)
    }

    const handleCreateDir = (parentIdOverride?: NullableString) => {
        if (!canWrite) return
        const targetParentId = parentIdOverride === undefined ? fileTreeManager.getTargetParentId() : parentIdOverride
        beginCreate('dir', targetParentId)
    }

    const canRenameOrDelete = canWrite && !!selectedId && selectedId !== 'root'

    const handleRename = (nodeId?: string) => {
        if (!canWrite) return
        const targetId = nodeId ?? selectedId
        if (!targetId || targetId === 'root') return

        beginRename(targetId)
    }

    const handleCancelEdit = () => {
        setEditState(null)
    }

    const mapEditError = (error: unknown): string => {
        if (error instanceof err.InvalidNodeNameError) {
            return 'Invalid name'
        }
        if (error instanceof err.NodeNameConflictError) {
            return 'Name already exists in this directory'
        }
        return 'Could not apply this name'
    }

    const mapMoveError = (error: unknown): string => {
        if (error instanceof err.NodeNameConflictError) {
            return 'Name already exists in the target directory'
        }
        return 'Could not move this item'
    }

    const handleConfirmEdit = (value: string): string | null => {
        if (!editState) {
            return null
        }

        const trimmedValue = value.trim()
        const validation = validateNodeName(trimmedValue)
        if (!validation.valid) {
            return validation.msg ?? 'Invalid name'
        }

        try {
            if (editState.mode === 'create') {
                fileSystemManager.create(trimmedValue, editState.type, editState.parentId)
            } else {
                fileSystemManager.rename(editState.nodeId, trimmedValue)
            }
            setEditState(null)
            return null
        } catch (error) {
            return mapEditError(error)
        }
    }

    const handleDelete = (nodeId?: string) => {
        if (!canWrite) return
        const targetId = nodeId ?? selectedId
        if (!targetId || targetId === 'root') return

        const meta = fileSystemManager.getMeta(targetId)
        setDeleteTarget({
            id: targetId,
            name: meta.name,
            type: meta.type,
        })
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
                    {editState?.mode === 'create' && editState.parentId === null && (
                        <div
                            className='tree-node tree-node-create-row'
                            style={{ paddingLeft: 'var(--tree-indent-base)' }}
                        >
                            <div className='tree-node-left'>
                                <FileTreeInput
                                    createType={editState.type}
                                    onConfirm={handleConfirmEdit}
                                    onCancel={handleCancelEdit}
                                />
                            </div>
                        </div>
                    )}
                    {tree.map((node) => (
                        <FileTreeItem
                            key={node.id}
                            node={node}
                            level={0}
                            canWrite={canWrite}
                            onContextMenu={handleNodeContextMenu}
                            editState={editState}
                            onConfirmEdit={handleConfirmEdit}
                            onCancelEdit={handleCancelEdit}
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
            <ContextMenu
                sections={contextMenuSections}
                isOpen={contextMenu != null}
                onClose={closeMenu}
                lockScroll
                anchorPoint={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
                className='file-tree-context-menu-panel'
            />
            {deleteTarget != null && (
                <ConfirmModal
                    title={deleteTarget.type === 'dir' ? 'Delete directory' : 'Delete file'}
                    message={
                        deleteTarget.type === 'dir'
                            ? `Are you sure you want to delete "${deleteTarget.name}" and all of its contents? This action cannot be undone.`
                            : `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
                    }
                    confirmLabel='Delete'
                    pendingLabel='Deleting...'
                    onConfirm={async () => {
                        fileSystemManager.delete(deleteTarget.id)
                    }}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    )
}

export default FileTree

