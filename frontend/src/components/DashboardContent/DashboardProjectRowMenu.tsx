import { VscKebabVertical } from 'react-icons/vsc'

type Props = {
    isOpen: boolean
    isOwner: boolean
    favorited: boolean
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
    onToggleMenu,
    onOpen,
    onToggleFavorite,
    onOpenMembers,
    onRename,
    onDelete,
}: Props) {
    const handleMenuTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onToggleMenu()
    }

    return (
        <div className='project-menu-wrap'>
            <button
                type='button'
                className='project-menu-trigger'
                title='Project actions'
                onClick={handleMenuTriggerClick}
            >
                <VscKebabVertical size={14} />
            </button>
            {isOpen && (
                <div className='project-menu-dropdown' onClick={(event) => event.stopPropagation()}>
                    <button type='button' className='project-menu-item' onClick={onOpen}>
                        Open
                    </button>
                    <button type='button' className='project-menu-item' onClick={onToggleFavorite}>
                        {favorited ? 'Unfavorite' : 'Favorite'}
                    </button>
                    <button type='button' className='project-menu-item' onClick={onOpenMembers}>
                        Members
                    </button>
                    {isOwner && (
                        <button type='button' className='project-menu-item' onClick={onRename}>
                            Rename
                        </button>
                    )}
                    {isOwner && (
                        <button type='button' className='project-menu-item project-menu-item-danger' onClick={onDelete}>
                            Delete project
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default DashboardProjectRowMenu
