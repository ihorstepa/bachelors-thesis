import '@/components/DashboardContent/DashboardProjectsTable.css'

import { useState } from 'react'
import { useNavigate } from 'react-router'

import DashboardProjectRow from '@/components/DashboardContent/DashboardProjectRow'
import { useAuth } from '@/contextProviders/auth/AuthContext'
import { useProjects } from '@/contextProviders/projects/ProjectsContext'
import type { ProjectPreview } from '@/core/projectManager'

type Props = {
    projects: ProjectPreview[]
    onOpenMembers(project: ProjectPreview): void
    onRenameProject(project: ProjectPreview): void
    onDeleteProject(project: ProjectPreview): void
}

function DashboardProjectsTable({ projects, onOpenMembers, onRenameProject, onDeleteProject }: Props) {
    const navigate = useNavigate()
    const auth = useAuth()
    const { toggleFavorite } = useProjects()
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
    const currentUserId = String(auth.user?.id ?? '')
    const currentUsername = auth.user?.username ?? 'Anonymous'

    const closeMenu = () => {
        setOpenMenuProjectId(null)
        setMenuPosition(null)
    }

    const onToggleProjectMenu = (id: string, position?: { x: number; y: number }) => {
        if (position != null) {
            setOpenMenuProjectId(id)
            setMenuPosition(position)
            return
        }
        if (openMenuProjectId === id) {
            closeMenu()
        } else {
            setOpenMenuProjectId(id)
            setMenuPosition(null)
        }
    }

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
                            menuPosition={isMenuOpen ? menuPosition : null}
                            onSelect={setSelectedProjectId}
                            onOpenProject={(id) => navigate(`/ide/${id}`)}
                            onOpenMembers={onOpenMembers}
                            onToggleProjectMenu={onToggleProjectMenu}
                            onCloseProjectMenu={closeMenu}
                            onToggleFavorite={(projectId, nextFavorited) => {
                                closeMenu()
                                toggleFavorite(projectId, nextFavorited)
                            }}
                            onRenameProject={onRenameProject}
                            onDeleteProject={() => onDeleteProject(project)}
                        />
                    )
                })}
            </tbody>
        </table>
    )
}

export default DashboardProjectsTable
