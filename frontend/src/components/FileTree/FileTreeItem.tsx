import { useDraggable, useDroppable } from '@dnd-kit/react'
import type { JSX } from 'react'
import { useSyncExternalStore } from 'react'
import { FaChevronDown, FaChevronRight } from 'react-icons/fa'

import FileTreeInput from '@/components/FileTree/FileTreeInput'
import FileIcon from '@/components/Icons/FileIcon'
import { useFileTree } from '@/contextProviders/fileTree/FileTreeContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { useTabs } from '@/contextProviders/tabs/TabsContext'
import type { NodeType } from '@/core/fileSystemManager'
import type { TreeNode } from '@/core/fileTreeManager'
import type { PresenceEntry } from '@/core/presenceService'
import { PresenceService } from '@/core/presenceService'
import type { NullableString } from '@/utils/types'

export type FileTreeEditState =
    | { mode: 'create'; type: NodeType; parentId: NullableString }
    | { mode: 'rename'; nodeId: string }

type Props = {
    node: TreeNode
    level: number
    canWrite: boolean
    onContextMenu: (nodeId: string, nodeType: NodeType, x: number, y: number) => void
    editState: FileTreeEditState | null
    onConfirmEdit: (value: string) => string | null
    onCancelEdit: () => void
}

const maxVisiblePresenceDots = 3
const emptyPresenceEntries: PresenceEntry[] = []

export function FileTreeItem({
    node,
    level,
    canWrite,
    onContextMenu,
    editState,
    onConfirmEdit,
    onCancelEdit,
}: Props): JSX.Element {
    const { expanded, selectedId, fileTreeManager } = useFileTree()
    const { tabManager } = useTabs()
    const presenceService = useService(PresenceService)

    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const shouldShowPresence = node.type === 'file' || (node.type === 'dir' && !isExpanded)

    const presenceEntries = useSyncExternalStore(
        (notify) => {
            if (!shouldShowPresence) return () => {}
            return presenceService.on('change', notify)
        },
        () => (shouldShowPresence ? presenceService.getUsersInBranch(node.id) : emptyPresenceEntries),
    )
    const visibleUsers = presenceEntries.slice(0, maxVisiblePresenceDots)
    const hiddenUsersCount = Math.max(0, presenceEntries.length - maxVisiblePresenceDots)

    const { ref: dragRef, isDragging } = useDraggable({
        id: node.id,
        disabled: !canWrite || node.id === 'root',
        data: { type: node.type, parentId: node.parentId },
    })

    const { ref: dropRef, isDropTarget } = useDroppable({
        id: node.id,
        data: { type: node.type, parentId: node.parentId },
    })

    const isRenameEditing = editState?.mode === 'rename' && editState.nodeId === node.id
    const showCreateChildRow =
        editState?.mode === 'create' && editState.parentId === node.id && isExpanded && node.type === 'dir'

    const handleRowClick = () => {
        if (isRenameEditing) return

        fileTreeManager.selectItem(node.id)
        if (node.type === 'dir') {
            fileTreeManager.toggleExpand(node.id)
        } else {
            tabManager.open(node.id)
        }
    }

    const handleArrowClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        fileTreeManager.toggleExpand(node.id)
    }

    const handleRowContextMenu = (event: React.MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        onContextMenu(node.id, node.type, event.clientX, event.clientY)
    }

    return (
        <>
            <div
                ref={(element) => {
                    dragRef(element)
                    dropRef(element)
                }}
                title={node.name}
                className={`tree-node ${isRenameEditing ? 'tree-node-editing' : ''} ${selectedId === node.id ? 'selected' : ''} ${isDropTarget ? 'drop-target' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{ paddingLeft: `calc(${level} * var(--tree-indent-step) + var(--tree-indent-base))` }}
                data-tree-node-id={node.id}
                data-tree-node-type={node.type}
                onClick={handleRowClick}
                onContextMenu={handleRowContextMenu}
            >
                <div className='tree-node-left'>
                    {node.type === 'dir' && (
                        <button className='expand-button' onClick={handleArrowClick}>
                            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                        </button>
                    )}
                    {node.type === 'file' && !isRenameEditing && (
                        <span className='file-icon-wrapper'>
                            <FileIcon filename={node.name} />
                        </span>
                    )}
                    {isRenameEditing ? (
                        <FileTreeInput
                            initialValue={node.name}
                            createType={node.type === 'file' ? 'file' : undefined}
                            selectBasenameOnFocus={node.type === 'file'}
                            onConfirm={onConfirmEdit}
                            onCancel={onCancelEdit}
                        />
                    ) : (
                        <span className='node-name'>{node.name}</span>
                    )}
                </div>
                {presenceEntries.length > 0 && (
                    <div className='presence-indicator'>
                        {visibleUsers.map(({ clientId, user }) => (
                            <span
                                key={clientId}
                                className='presence-dot'
                                style={{ backgroundColor: user.color }}
                                title={user.name}
                            >
                                {user.name.trim().slice(0, 1).toUpperCase() || '?'}
                            </span>
                        ))}
                        {hiddenUsersCount > 0 && (
                            <span
                                className='presence-dot presence-dot-overflow'
                                title={`+${hiddenUsersCount} more users`}
                            >
                                +{hiddenUsersCount}
                            </span>
                        )}
                    </div>
                )}
            </div>
            {showCreateChildRow && (
                <div
                    className='tree-node tree-node-create-row'
                    style={{ paddingLeft: `calc(${level + 1} * var(--tree-indent-step) + var(--tree-indent-base))` }}
                >
                    <div className='tree-node-left'>
                        <FileTreeInput createType={editState.type} onConfirm={onConfirmEdit} onCancel={onCancelEdit} />
                    </div>
                </div>
            )}
            {isExpanded &&
                hasChildren &&
                node.children.map((child) => (
                    <FileTreeItem
                        key={child.id}
                        node={child}
                        level={level + 1}
                        canWrite={canWrite}
                        onContextMenu={onContextMenu}
                        editState={editState}
                        onConfirmEdit={onConfirmEdit}
                        onCancelEdit={onCancelEdit}
                    />
                ))}
        </>
    )
}
