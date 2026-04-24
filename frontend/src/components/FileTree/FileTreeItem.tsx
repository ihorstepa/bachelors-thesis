import { useSyncExternalStore } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/react'
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'
import type { JSX } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { useFileTree } from '@/contextProviders/FileTreeProvider'
import { PresenceService } from '@/core/presenceService'
import type { PresenceEntry } from '@/core/presenceService'
import { useTabs } from '@/contextProviders/TabsProvider'
import FileIcon from '@/components/Icons/FileIcon'
import type { TreeNode } from '@/core/fileTreeManager'
import type { NodeType } from '@/core/fileSystemManager'

type Props = {
    node: TreeNode
    level: number
    canWrite: boolean
    onContextMenu: (nodeId: string, nodeType: NodeType, x: number, y: number) => void
}

const maxVisiblePresenceDots = 3
const emptyPresenceEntries: PresenceEntry[] = []

export function FileTreeItem({ node, level, canWrite, onContextMenu }: Props): JSX.Element {
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

    const handleRowClick = () => {
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
                className={`tree-node ${selectedId === node.id ? 'selected' : ''} ${isDropTarget ? 'drop-target' : ''} ${isDragging ? 'dragging' : ''}`}
                style={{ paddingLeft: level * 20 + 12 }}
                data-tree-node-id={node.id}
                data-tree-node-type={node.type}
                onClick={handleRowClick}
                onContextMenu={handleRowContextMenu}
            >
                <div className='tree-node-left'>
                    {node.type === 'dir' && (
                        <button className='expand-button' onClick={handleArrowClick}>
                            {isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                        </button>
                    )}
                    {node.type === 'file' && (
                        <span className='file-icon-wrapper'>
                            <FileIcon filename={node.name} />
                        </span>
                    )}
                    <span className='node-name'>{node.name}</span>
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
            {isExpanded &&
                hasChildren &&
                node.children.map((child) => (
                    <FileTreeItem
                        key={child.id}
                        node={child}
                        level={level + 1}
                        canWrite={canWrite}
                        onContextMenu={onContextMenu}
                    />
                ))}
        </>
    )
}
