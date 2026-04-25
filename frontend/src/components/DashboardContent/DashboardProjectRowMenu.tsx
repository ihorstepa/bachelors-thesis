import { useRef } from 'react'
import { VscKebabVertical } from 'react-icons/vsc'

import IdeContextMenu from '@/components/IdeContextMenu/IdeContextMenu'
import type { IdeContextMenuItem } from '@/components/IdeContextMenu/IdeContextMenu'

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
    const triggerRef = useRef<HTMLButtonElement | null>(null)

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

    const triggerRect = triggerRef.current?.getBoundingClientRect()
    const anchorPoint = position ?? (triggerRect != null ? { x: triggerRect.right, y: triggerRect.bottom + 6 } : null)

    return (
        <div className='project-menu-wrap'>
            <button
                ref={triggerRef}
                type='button'
                className='project-menu-trigger'
                title='Project actions'
                onClick={(e) => {
                    e.stopPropagation()
                    onToggleMenu()
                }}
            >
                <VscKebabVertical />
            </button>
            <IdeContextMenu
                sections={[menuItems]}
                isOpen={isOpen}
                onClose={onToggleMenu}
                anchorPoint={anchorPoint}
                floating
                lockScroll
                isWithinBoundary={(target) => triggerRef.current?.contains(target) ?? false}
                className='dashboard-project-menu-panel'
            />
        </div>
    )
}

export default DashboardProjectRowMenu
