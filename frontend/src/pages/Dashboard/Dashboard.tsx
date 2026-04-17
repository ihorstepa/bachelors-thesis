import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'
import { useProjects } from '@/contextProviders/ProjectsProvider'
import NewProjectModal from '@/components/NewProjectModal/NewProjectModal'
import ManageMembersModal from '@/components/ManageMembersModal/ManageMembersModal'
import type { ProjectPreview } from '@/core/projectManager'
import DashboardSidebar from '@/components/DashboardSidebar/DashboardSidebar'
import type { DashboardNav } from '@/components/DashboardSidebar/DashboardSidebar'
import DashboardTopBar from '@/components/DashboardTopBar/DashboardTopBar'
import DashboardContent from '@/components/DashboardContent/DashboardContent'
import '@/pages/Dashboard/Dashboard.css'

function Dashboard() {
    const navigate = useNavigate()
    const auth = useAuth()
    const { reload, createProject, updateProject, getProjectMembers, addMember, updateMemberAccess, removeMember } =
        useProjects()
    const [activeNav, setActiveNav] = useState<DashboardNav>('all')
    const [search, setSearch] = useState('')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showNewProject, setShowNewProject] = useState(false)
    const [projectToRename, setProjectToRename] = useState<ProjectPreview | null>(null)
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
                onSignOut={() => {
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
                />
            </div>

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
