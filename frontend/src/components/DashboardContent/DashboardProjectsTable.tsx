import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'
import { useProjects } from '@/contextProviders/ProjectsProvider'
import type { ProjectPreview } from '@/core/projectManager'
import DashboardProjectRow from '@/components/DashboardContent/DashboardProjectRow'

import '@/components/DashboardContent/DashboardProjectsTable.css'

type Props = {
    projects: ProjectPreview[]
    onOpenMembers(project: ProjectPreview): void
    onRenameProject(project: ProjectPreview): void
}

function DashboardProjectsTable({ projects, onOpenMembers, onRenameProject }: Props) {
    const navigate = useNavigate()
    const auth = useAuth()
    const { deleteProject, toggleFavorite } = useProjects()
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null)
    const currentUserId = String(auth.user?.id ?? '')
    const currentUsername = auth.user?.username ?? 'Anonymous'

    useEffect(() => {
        if (openMenuProjectId == null) {
            return
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Element)) {
                return
            }
            if (target.closest('.project-menu-wrap') != null) {
                return
            }
            setOpenMenuProjectId(null)
        }

        window.addEventListener('pointerdown', handlePointerDown)
        return () => window.removeEventListener('pointerdown', handlePointerDown)
    }, [openMenuProjectId])

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
                    const isMenuOpen = openMenuProjectId === projectId
                    const isSelected = selectedProjectId === projectId
                    return (
                        <DashboardProjectRow
                            key={projectId}
                            project={project}
                            currentUserId={currentUserId}
                            currentUsername={currentUsername}
                            isSelected={isSelected}
                            isMenuOpen={isMenuOpen}
                            onSelect={setSelectedProjectId}
                            onOpenProject={(id) => navigate(`/ide/${id}`)}
                            onOpenMembers={onOpenMembers}
                            onToggleProjectMenu={(id) => setOpenMenuProjectId((prev) => (prev === id ? null : id))}
                            onCloseProjectMenu={() => setOpenMenuProjectId(null)}
                            onToggleFavorite={(id, nextFavorited) => {
                                void toggleFavorite(id, nextFavorited)
                            }}
                            onRenameProject={onRenameProject}
                            onDeleteProject={(id) => {
                                void deleteProject(id)
                            }}
                        />
                    )
                })}
            </tbody>
        </table>
    )
}

export default DashboardProjectsTable
