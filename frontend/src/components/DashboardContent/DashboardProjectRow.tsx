import { useRef } from 'react'
import { VscEye, VscStarFull } from 'react-icons/vsc'

import type { ProjectPreview } from '@/core/projectManager'
import DashboardProjectRowMenu from '@/components/DashboardContent/DashboardProjectRowMenu'

function formatRelativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime()
    const minutes = Math.floor(diff / 60_000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks}w ago`
    const months = Math.floor(days / 30)
    return `${months}mo ago`
}

function getMemberDisplay(project: ProjectPreview, currentUserId: string, currentUsername: string): string[] {
    const previewUsernames = Array.isArray(project.memberPreviewUsernames) ? project.memberPreviewUsernames : []
    const previewInitials = previewUsernames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => name[0].toUpperCase())

    if (previewInitials.length === 0) {
        if (project.ownerId === currentUserId && currentUsername.trim().length > 0) {
            previewInitials.push(currentUsername.trim()[0].toUpperCase())
        } else if (typeof project.ownerUsername === 'string' && project.ownerUsername.trim().length > 0) {
            previewInitials.push(project.ownerUsername.trim()[0].toUpperCase())
        }
    }

    const visibleUsers = previewInitials.slice(0, 3)
    const totalUsers = 1 + Math.max(0, project.memberCount)
    if (totalUsers > 3) {
        return [...visibleUsers, `+${totalUsers - 3}`]
    }
    return visibleUsers
}

type Props = {
    project: ProjectPreview
    currentUserId: string
    currentUsername: string
    isSelected: boolean
    isMenuOpen: boolean
    onSelect(projectId: string): void
    onOpenProject(projectId: string): void
    onOpenMembers(project: ProjectPreview): void
    onToggleProjectMenu(projectId: string): void
    onCloseProjectMenu(): void
    onToggleFavorite(projectId: string, nextFavorited: boolean): void
    onRenameProject(project: ProjectPreview): void
    onDeleteProject(projectId: string): void
}

function DashboardProjectRow({
    project,
    currentUserId,
    currentUsername,
    isSelected,
    isMenuOpen,
    onSelect,
    onOpenProject,
    onOpenMembers,
    onToggleProjectMenu,
    onCloseProjectMenu,
    onToggleFavorite,
    onRenameProject,
    onDeleteProject,
}: Props) {
    const projectId = project.id
    const isOwner = project.ownerId === currentUserId
    const memberLabels = getMemberDisplay(project, currentUserId, currentUsername)
    const rowClass = `dashboard-table-row ${isMenuOpen ? 'menu-open' : ''} ${isSelected ? 'selected' : ''}`
    const lastTouchRef = useRef<number>(0)

    const openProject = () => {
        onOpenProject(projectId)
    }

    const handleTouchEnd = () => {
        const now = Date.now()
        const timeSinceLastTap = now - lastTouchRef.current
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            openProject()
        }
        lastTouchRef.current = now
    }

    const openMembers = () => {
        onOpenMembers(project)
    }

    const closeMenu = () => {
        onCloseProjectMenu()
    }

    const handleMembersClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        openMembers()
    }

    const handleOpenAction = () => {
        openProject()
        closeMenu()
    }

    const handleFavoriteAction = () => {
        onToggleFavorite(projectId, !project.favorited)
        closeMenu()
    }

    const handleMembersAction = () => {
        openMembers()
        closeMenu()
    }

    const handleRenameAction = () => {
        onRenameProject(project)
        closeMenu()
    }

    const handleDeleteAction = () => {
        onDeleteProject(projectId)
        closeMenu()
    }

    return (
        <tr
            className={rowClass}
            onClick={() => onSelect(projectId)}
            onDoubleClick={openProject}
            onTouchEnd={handleTouchEnd}
        >
            <td>
                {project.accessType === 'r' && (
                    <span className='project-readonly-icon' title='Read-only access'>
                        <VscEye size={13} />
                    </span>
                )}
            </td>
            <td>
                <div className='project-name-cell'>
                    <span className='project-name'>{project.name}</span>
                    {project.favorited && <VscStarFull size={14} className='project-favorited-icon' />}
                </div>
            </td>
            <td>
                <span className='project-updated'>{formatRelativeTime(project.updatedAt)}</span>
            </td>
            <td>
                <button
                    type='button'
                    className='project-collaborators interactive'
                    onClick={handleMembersClick}
                    title='View members'
                >
                    {memberLabels.map((label, index) => (
                        <span key={`${projectId}-${index}`} className='project-collab-dot'>
                            {label}
                        </span>
                    ))}
                </button>
            </td>
            <td>
                <div className='project-row-actions'>
                    <DashboardProjectRowMenu
                        isOpen={isMenuOpen}
                        isOwner={isOwner}
                        favorited={project.favorited}
                        onToggleMenu={() => onToggleProjectMenu(projectId)}
                        onOpen={handleOpenAction}
                        onToggleFavorite={handleFavoriteAction}
                        onOpenMembers={handleMembersAction}
                        onRename={handleRenameAction}
                        onDelete={handleDeleteAction}
                    />
                </div>
            </td>
        </tr>
    )
}

export default DashboardProjectRow
