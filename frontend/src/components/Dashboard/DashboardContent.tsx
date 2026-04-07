import { VscRefresh } from 'react-icons/vsc'

import type { ProjectPreview } from '@/core/projectManager'
import DashboardProjectsTable from '@/components/Dashboard/DashboardProjectsTable'

type DashboardContentProps = {
    loading: boolean
    error: string | null
    projects: ProjectPreview[]
    selectedProjectId: string | null
    currentUserId: string
    currentUsername: string
    openMenuProjectId: string | null
    onReload(): void
    onToggleProjectMenu(projectId: string): void
    onCloseProjectMenu(): void
    onSelectProject(projectId: string): void
    onOpenProject(projectId: string): void
    onOpenMembers(project: ProjectPreview): void
    onToggleFavorite(projectId: string, favorited: boolean): void
    onRenameProject(project: ProjectPreview): void
    onDeleteProject(projectId: string): void
}

function DashboardContent({
    loading,
    error,
    projects,
    selectedProjectId,
    currentUserId,
    currentUsername,
    openMenuProjectId,
    onReload,
    onToggleProjectMenu,
    onCloseProjectMenu,
    onSelectProject,
    onOpenProject,
    onOpenMembers,
    onToggleFavorite,
    onRenameProject,
    onDeleteProject,
}: DashboardContentProps) {
    if (loading) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-empty' />
            </div>
        )
    }

    if (error != null) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-error'>
                    <span>{error}</span>
                    <button className='dashboard-retry-btn' onClick={onReload}>
                        <VscRefresh size={13} /> Retry
                    </button>
                </div>
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-empty' />
            </div>
        )
    }

    return (
        <div className='dashboard-content'>
            <DashboardProjectsTable
                projects={projects}
                selectedProjectId={selectedProjectId}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                openMenuProjectId={openMenuProjectId}
                onToggleProjectMenu={onToggleProjectMenu}
                onCloseProjectMenu={onCloseProjectMenu}
                onSelectProject={onSelectProject}
                onOpenProject={onOpenProject}
                onOpenMembers={onOpenMembers}
                onToggleFavorite={onToggleFavorite}
                onRenameProject={onRenameProject}
                onDeleteProject={onDeleteProject}
            />
        </div>
    )
}

export default DashboardContent
