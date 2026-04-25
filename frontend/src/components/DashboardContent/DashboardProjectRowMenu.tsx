import { useState } from 'react'
import { VscKebabVertical } from 'react-icons/vsc'

import type { IdeContextMenuItem } from '@/components/ContextMenu/ContextMenu'
import ContextMenu from '@/components/ContextMenu/ContextMenu'

type Props = {
    isOpen: boolean
    isOwner: boolean
    favorited: boolean
    position: { x: number; y: number } | null
    onToggleMenu(): void
    onOpen(): void
    onToggleFavorite(): void
    onOpenMembers(): void
    onRename(): void
    onDelete(): void
}

function DashboardProjectRowMenu({
    isOpen,
    isOwner,
    favorited,
    position,
    onToggleMenu,
    onOpen,
    onToggleFavorite,
    onOpenMembers,
    onRename,
    onDelete,
}: Props) {
    const [fallbackAnchorPoint, setFallbackAnchorPoint] = useState<{ x: number; y: number } | null>(null)

    const menuItems: IdeContextMenuItem[] = [
        { id: 'open', label: 'Open', onSelect: onOpen },
        { id: 'favorite', label: favorited ? 'Unfavorite' : 'Favorite', onSelect: onToggleFavorite },
        { id: 'members', label: 'Members', onSelect: onOpenMembers },
    ]

    if (isOwner) {
        menuItems.push({ id: 'rename', label: 'Rename', onSelect: onRename })
        menuItems.push({
            id: 'delete',
            label: 'Delete project',
            onSelect: onDelete,
            className: 'dashboard-menu-item-danger',
        })
    }

    const anchorPoint = position ?? fallbackAnchorPoint

    return (
        <div className='project-menu-wrap'>
            <button
                type='button'
                className='project-menu-trigger'
                title='Project actions'
                onClick={(e) => {
                    e.stopPropagation()
                    const rect = e.currentTarget.getBoundingClientRect()
                    setFallbackAnchorPoint({ x: rect.right, y: rect.bottom + 6 })
                    onToggleMenu()
                }}
            >
                <VscKebabVertical />
            </button>
            <ContextMenu
                sections={[menuItems]}
                isOpen={isOpen}
                onClose={onToggleMenu}
                anchorPoint={anchorPoint}
                floating
                lockScroll
                isWithinBoundary={(target) => target instanceof Element && target.closest('.project-menu-wrap') != null}
                className='dashboard-project-menu-panel'
            />
        </div>
    )
}

export default DashboardProjectRowMenu
