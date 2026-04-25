import '@/pages/Dashboard/Dashboard.css'

import { useState } from 'react'
import { useNavigate } from 'react-router'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import DashboardContent from '@/components/DashboardContent/DashboardContent'
import type { DashboardNav } from '@/components/DashboardSidebar/DashboardSidebar'
import DashboardSidebar from '@/components/DashboardSidebar/DashboardSidebar'
import DashboardTopBar from '@/components/DashboardTopBar/DashboardTopBar'
import ManageMembersModal from '@/components/ManageMembersModal/ManageMembersModal'
import NewProjectModal from '@/components/NewProjectModal/NewProjectModal'
import { useAuth } from '@/contextProviders/auth/AuthContext'
import { useProjects } from '@/contextProviders/projects/ProjectsContext'
import type { ProjectPreview } from '@/core/projectManager'

function Dashboard() {
    const navigate = useNavigate()
    const auth = useAuth()
    const {
        reload,
        createProject,
        updateProject,
        deleteProject,
        getProjectMembers,
        addMember,
        updateMemberAccess,
        removeMember,
    } = useProjects()
    const [activeNav, setActiveNav] = useState<DashboardNav>('all')
    const [search, setSearch] = useState('')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showNewProject, setShowNewProject] = useState(false)
    const [projectToRename, setProjectToRename] = useState<ProjectPreview | null>(null)
    const [projectToDelete, setProjectToDelete] = useState<ProjectPreview | null>(null)
    const [projectToManageMembers, setProjectToManageMembers] = useState<ProjectPreview | null>(null)

    const userInitial = auth.user?.username?.[0]?.toUpperCase() ?? '?'
    const username = auth.user?.username ?? '?'
    const email = auth.user?.email ?? '?'
    const currentUserId = String(auth.user?.id ?? '')

    const handleAddMember = async (projectId: string, memberUsername: string, accessType: 'r' | 'rw') => {
        const member = await addMember(projectId, memberUsername, accessType)
        await reload()
        return member
    }

    const handleUpdateMemberAccess = async (projectId: string, memberUsername: string, accessType: 'r' | 'rw') => {
        const member = await updateMemberAccess(projectId, memberUsername, accessType)
        await reload()
        return member
    }

    const handleRemoveMember = async (projectId: string, userId: string) => {
        await removeMember(projectId, userId)
        await reload()
    }

    return (
        <div className={`dashboard ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            <DashboardSidebar
                userInitial={userInitial}
                username={username}
                email={email}
                activeNav={activeNav}
                onNavChange={(nav) => {
                    setActiveNav(nav)
                    setIsSidebarOpen(false)
                }}
                onLogout={() => {
                    auth.logout()
                    setIsSidebarOpen(false)
                    navigate('/auth')
                }}
            />

            <button
                type='button'
                className='dashboard-sidebar-overlay'
                aria-label='Close sidebar'
                onClick={() => setIsSidebarOpen(false)}
            />

            <div className='dashboard-main'>
                <DashboardTopBar
                    search={search}
                    isSidebarOpen={isSidebarOpen}
                    onSearchChange={setSearch}
                    onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
                    onOpenPlayground={() => navigate('/ide')}
                    onCreateProject={() => setShowNewProject(true)}
                />
                <DashboardContent
                    activeNav={activeNav}
                    search={search}
                    onOpenMembers={setProjectToManageMembers}
                    onRenameProject={setProjectToRename}
                    onDeleteProject={setProjectToDelete}
                />
            </div>

            {projectToDelete != null && (
                <ConfirmModal
                    title='Delete project'
                    message={`Are you sure you want to delete "${projectToDelete.name}"? This action cannot be undone.`}
                    confirmLabel='Delete project'
                    pendingLabel='Deleting...'
                    onConfirm={async () => {
                        await deleteProject(projectToDelete.id)
                    }}
                    onClose={() => setProjectToDelete(null)}
                />
            )}

            {showNewProject && (
                <NewProjectModal
                    onConfirm={async (name) => {
                        await createProject(name)
                    }}
                    onClose={() => setShowNewProject(false)}
                />
            )}

            {projectToRename != null && (
                <NewProjectModal
                    title='Rename project'
                    submitLabel='Save name'
                    pendingLabel='Saving...'
                    initialValue={projectToRename.name}
                    errorMessage='Failed to rename project'
                    onConfirm={async (name) => {
                        await updateProject(projectToRename.id, name)
                    }}
                    onClose={() => setProjectToRename(null)}
                />
            )}

            {projectToManageMembers != null && (
                <ManageMembersModal
                    projectName={projectToManageMembers.name}
                    canManage={projectToManageMembers.ownerId === currentUserId}
                    onLoadMembers={async () => getProjectMembers(projectToManageMembers.id)}
                    onAddMember={async (memberUsername, accessType) => {
                        return handleAddMember(projectToManageMembers.id, memberUsername, accessType)
                    }}
                    onUpdateMemberAccess={async (memberUsername, accessType) => {
                        return handleUpdateMemberAccess(projectToManageMembers.id, memberUsername, accessType)
                    }}
                    onRemoveMember={async (userId) => {
                        await handleRemoveMember(projectToManageMembers.id, userId)
                    }}
                    onClose={() => setProjectToManageMembers(null)}
                />
            )}
        </div>
    )
}

export default Dashboard
