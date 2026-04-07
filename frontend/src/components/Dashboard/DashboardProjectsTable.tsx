import { VscStarFull, VscKebabVertical, VscLockSmall } from 'react-icons/vsc'

import type { ProjectPreview } from '@/core/projectManager'

type DashboardProjectsTableProps = {
    projects: ProjectPreview[]
    selectedProjectId: string | null
    currentUserId: string
    currentUsername: string
    openMenuProjectId: string | null
    onToggleProjectMenu(projectId: string): void
    onCloseProjectMenu(): void
    onSelectProject(projectId: string): void
    onOpenProject(projectId: string): void
    onOpenMembers(project: ProjectPreview): void
    onToggleFavorite(projectId: string, favorited: boolean): void
    onRenameProject(project: ProjectPreview): void
    onDeleteProject(projectId: string): void
}

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
    const previewInitials = project.memberPreviewUsernames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => name[0].toUpperCase())

    if (previewInitials.length === 0) {
        if (project.ownerId === currentUserId && currentUsername.trim().length > 0) {
            previewInitials.push(currentUsername.trim()[0].toUpperCase())
        } else if (project.ownerUsername.trim().length > 0) {
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

function DashboardProjectsTable({
    projects,
    selectedProjectId,
    currentUserId,
    currentUsername,
    openMenuProjectId,
    onToggleProjectMenu,
    onCloseProjectMenu,
    onSelectProject,
    onOpenProject,
    onOpenMembers,
    onToggleFavorite,
    onRenameProject,
    onDeleteProject,
}: DashboardProjectsTableProps) {
    return (
        <table className='dashboard-table'>
            <colgroup>
                <col className='dashboard-table-col-readonly' />
                <col className='dashboard-table-col-name' />
                <col className='dashboard-table-col-updated' />
                <col className='dashboard-table-col-collabs' />
                <col className='dashboard-table-col-open' />
            </colgroup>
            <thead className='dashboard-table-head'>
                <tr>
                    <th></th>
                    <th>Name</th>
                    <th>Last edited</th>
                    <th>Members</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {projects.map((project) => {
                    const projectId = project.id
                    const isOwner = project.ownerId === currentUserId
                    const isMenuOpen = openMenuProjectId === projectId
                    const isSelected = selectedProjectId === projectId
                    const memberLabels = getMemberDisplay(project, currentUserId, currentUsername)
                    const rowClass = `dashboard-table-row ${isMenuOpen ? 'menu-open' : ''} ${isSelected ? 'selected' : ''}`

                    const openProject = () => {
                        onOpenProject(projectId)
                    }

                    const openMembers = () => {
                        onOpenMembers(project)
                    }

                    const closeMenu = () => {
                        onCloseProjectMenu()
                    }

                    const handleMembersClick = (e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        openMembers()
                    }

                    const handleMenuTriggerClick = (e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation()
                        onToggleProjectMenu(projectId)
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
                            key={projectId}
                            className={rowClass}
                            onClick={() => onSelectProject(projectId)}
                            onDoubleClick={openProject}
                        >
                            <td>
                                {project.accessType === 'r' && (
                                    <span className='project-readonly-icon' title='Read-only access'>
                                        <VscLockSmall size={13} />
                                    </span>
                                )}
                            </td>
                            <td>
                                <div className='project-name-cell'>
                                    <span className='project-name'>{project.name}</span>
                                    {project.favorited && <VscStarFull size={14} color='#e5c07b' />}
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
                                    <div className='project-menu-wrap'>
                                        <button
                                            type='button'
                                            className='project-menu-trigger'
                                            title='Project actions'
                                            onClick={handleMenuTriggerClick}
                                        >
                                            <VscKebabVertical size={14} />
                                        </button>
                                        {isMenuOpen && (
                                            <div className='project-menu-dropdown' onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type='button'
                                                    className='project-menu-item'
                                                    onClick={handleOpenAction}
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    type='button'
                                                    className='project-menu-item'
                                                    onClick={handleFavoriteAction}
                                                >
                                                    {project.favorited ? 'Unfavorite' : 'Favorite'}
                                                </button>
                                                <button
                                                    type='button'
                                                    className='project-menu-item'
                                                    onClick={handleMembersAction}
                                                >
                                                    Members
                                                </button>
                                                {isOwner && (
                                                    <button
                                                        type='button'
                                                        className='project-menu-item'
                                                        onClick={handleRenameAction}
                                                    >
                                                        Rename
                                                    </button>
                                                )}
                                                {isOwner && (
                                                    <button
                                                        type='button'
                                                        className='project-menu-item project-menu-item-danger'
                                                        onClick={handleDeleteAction}
                                                    >
                                                        Delete project
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

export default DashboardProjectsTable
