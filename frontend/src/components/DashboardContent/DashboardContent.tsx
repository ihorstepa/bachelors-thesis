import { VscRefresh } from 'react-icons/vsc'

import Spinner from '@/components/Spinner/Spinner'
import { useAuth } from '@/contextProviders/AuthProvider'
import { useProjects } from '@/contextProviders/ProjectsProvider'
import type { ProjectPreview } from '@/core/projectManager'
import type { DashboardNav } from '@/components/DashboardSidebar/DashboardSidebar'
import DashboardProjectsTable from '@/components/DashboardContent/DashboardProjectsTable'
import '@/components/DashboardContent/DashboardContent.css'

function filterByNav(projects: ProjectPreview[], activeNav: DashboardNav, currentUserId: string): ProjectPreview[] {
    if (activeNav === 'favorite') {
        return projects.filter((project) => project.favorited)
    }

    if (activeNav === 'mine') {
        return projects.filter((project) => project.ownerId === currentUserId)
    }

    if (activeNav === 'shared') {
        return projects.filter((project) => project.ownerId !== currentUserId)
    }

    return projects
}

function filterBySearch(projects: ProjectPreview[], search: string): ProjectPreview[] {
    const normalizedSearch = search.trim().toLowerCase()
    if (normalizedSearch.length === 0) {
        return projects
    }

    return projects.filter((project) => project.name.toLowerCase().includes(normalizedSearch))
}

type Props = {
    activeNav: DashboardNav
    search: string
    onOpenMembers(project: ProjectPreview): void
    onRenameProject(project: ProjectPreview): void
    onDeleteProject(project: ProjectPreview): void
}

function DashboardContent({ activeNav, search, onOpenMembers, onRenameProject, onDeleteProject }: Props) {
    const auth = useAuth()
    const { projects, loading, error, reload } = useProjects()
    const currentUserId = String(auth.user?.id ?? '')

    const filteredProjects = filterBySearch(filterByNav(projects, activeNav, currentUserId), search)

    if (loading) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-empty' aria-label='Fetching projects'>
                    <Spinner size={24} />
                </div>
            </div>
        )
    }

    if (error != null) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-error'>
                    <span>{error}</span>
                    <button className='dashboard-retry-btn' onClick={reload}>
                        <VscRefresh size={13} /> Retry
                    </button>
                </div>
            </div>
        )
    }

    if (filteredProjects.length === 0) {
        return (
            <div className='dashboard-content'>
                <div className='dashboard-empty'>
                    <p>No projects found</p>
                </div>
            </div>
        )
    }

    return (
        <div className='dashboard-content'>
            <DashboardProjectsTable
                projects={filteredProjects}
                onOpenMembers={onOpenMembers}
                onRenameProject={onRenameProject}
                onDeleteProject={onDeleteProject}
            />
        </div>
    )
}

export default DashboardContent
