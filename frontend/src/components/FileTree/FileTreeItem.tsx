import { useEffect, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/react'
import { FaChevronRight, FaChevronDown } from 'react-icons/fa'
import type { JSX } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { useFileTree } from '@/contextProviders/FileTreeProvider'
import { PresenceService } from '@/core/presenceService'
import { useTabs } from '@/contextProviders/TabsProvider'
import FileIcon from '@/components/Icons/FileIcon'
import type { TreeNode } from '@/core/fileTreeManager'

type Props = {
    node: TreeNode
    level: number
    canWrite: boolean
}

export function FileTreeItem({ node, level, canWrite }: Props): JSX.Element {
    const { expanded, selectedId, fileTreeManager } = useFileTree()
    const { tabManager } = useTabs()
    const presenceService = useService(PresenceService)

    const isExpanded = expanded.has(node.id)
    const hasChildren = node.children.length > 0
    const showUsers = node.type === 'file' || (node.type === 'dir' && !isExpanded)

    const [, setPresenceVersion] = useState(0)
    useEffect(() => presenceService.on('change', () => setPresenceVersion((v) => v + 1)), [presenceService])

    const users = showUsers ? presenceService.getUsersInBranch(node.id) : []

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
                onClick={handleRowClick}
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
                {users.length > 0 && (
                    <div className='presence-indicator'>
                        {users.map(({ clientId, user }) => (
                            <span
                                key={clientId}
                                className='presence-dot'
                                style={{ backgroundColor: user.color }}
                                title={user.name}
                            >
                                {user.name.trim().slice(0, 1).toUpperCase() || '?'}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            {isExpanded &&
                hasChildren &&
                node.children.map((child) => (
                    <FileTreeItem key={child.id} node={child} level={level + 1} canWrite={canWrite} />
                ))}
        </>
    )
}
