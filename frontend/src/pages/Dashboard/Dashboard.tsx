import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/contextProviders/AuthProvider'
import { useProjects } from '@/contextProviders/ProjectsProvider'
import NewProjectModal from '@/components/NewProjectModal/NewProjectModal'
import ManageMembersModal from '@/components/ManageMembersModal/ManageMembersModal'
import type { ProjectPreview } from '@/core/projectManager'
import DashboardSidebar from '@/components/Dashboard/DashboardSidebar'
import DashboardTopBar from '@/components/Dashboard/DashboardTopBar'
import DashboardContent from '@/components/Dashboard/DashboardContent'

import '@/pages/Dashboard/Dashboard.css'

function Dashboard() {
    const navigate = useNavigate()
    const auth = useAuth()
    const {
        projects,
        loading,
        error,
        reload,
        createProject,
        updateProject,
        deleteProject,
        toggleFavorite,
        getProjectMembers,
        addMember,
        updateMemberAccess,
        removeMember,
    } = useProjects()
    const [activeNav, setActiveNav] = useState<'all' | 'mine' | 'shared' | 'favorite'>('all')
    const [search, setSearch] = useState('')
    const [showNewProject, setShowNewProject] = useState(false)
    const [projectToRename, setProjectToRename] = useState<ProjectPreview | null>(null)
    const [projectToManageMembers, setProjectToManageMembers] = useState<ProjectPreview | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
    const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null)

    const userInitial = auth.user?.username?.[0]?.toUpperCase() ?? '?'
    const username = auth.user?.username ?? 'Anonymous'
    const email = auth.user?.email ?? ''
    const currentUserId = String(auth.user?.id ?? '')

    useEffect(() => {
        if (openMenuProjectId == null) return

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target
            if (!(target instanceof Element)) return
            if (target.closest('.project-menu-wrap') != null) return
            setOpenMenuProjectId(null)
        }

        window.addEventListener('pointerdown', handlePointerDown)
        return () => window.removeEventListener('pointerdown', handlePointerDown)
    }, [openMenuProjectId])

    let filteredProjects = projects
    if (activeNav === 'favorite') filteredProjects = filteredProjects.filter((p) => p.favorited)
    if (activeNav === 'mine') filteredProjects = filteredProjects.filter((p) => p.ownerId === currentUserId)
    if (activeNav === 'shared') filteredProjects = filteredProjects.filter((p) => p.ownerId !== currentUserId)
    if (search) filteredProjects = filteredProjects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className='dashboard'>
            <DashboardSidebar
                userInitial={userInitial}
                username={username}
                email={email}
                activeNav={activeNav}
                onNavChange={setActiveNav}
                onSignOut={() => {
                    auth.logout()
                    navigate('/auth')
                }}
            />

            <div className='dashboard-main'>
                <DashboardTopBar
                    search={search}
                    onSearchChange={setSearch}
                    onOpenPlayground={() => navigate('/ide')}
                    onCreateProject={() => setShowNewProject(true)}
                />
                <DashboardContent
                    loading={loading}
                    error={error}
                    projects={filteredProjects}
                    selectedProjectId={selectedProjectId}
                    currentUserId={currentUserId}
                    currentUsername={username}
                    openMenuProjectId={openMenuProjectId}
                    onReload={reload}
                    onToggleProjectMenu={(projectId) =>
                        setOpenMenuProjectId((prev) => (prev === projectId ? null : projectId))
                    }
                    onCloseProjectMenu={() => setOpenMenuProjectId(null)}
                    onSelectProject={setSelectedProjectId}
                    onOpenProject={(projectId) => navigate(`/ide/${projectId}`)}
                    onOpenMembers={setProjectToManageMembers}
                    onToggleFavorite={toggleFavorite}
                    onRenameProject={setProjectToRename}
                    onDeleteProject={deleteProject}
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
                        const member = await addMember(projectToManageMembers.id, memberUsername, accessType)
                        await reload()
                        return member
                    }}
                    onUpdateMemberAccess={async (memberUsername, accessType) => {
                        const member = await updateMemberAccess(projectToManageMembers.id, memberUsername, accessType)
                        await reload()
                        return member
                    }}
                    onRemoveMember={async (userId) => {
                        await removeMember(projectToManageMembers.id, userId)
                        await reload()
                    }}
                    onClose={() => setProjectToManageMembers(null)}
                />
            )}
        </div>
    )
}

export default Dashboard
