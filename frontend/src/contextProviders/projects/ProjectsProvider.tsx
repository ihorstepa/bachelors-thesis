import type { ReactNode } from 'react'
import { useState } from 'react'

import { ProjectsContext } from '@/contextProviders/projects/ProjectsContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { type AccessType,ProjectManager, type ProjectMember, type ProjectPreview } from '@/core/projectManager'
import useAsyncEffect from '@/hooks/useAsyncEffect'

type Props = {
    children: ReactNode
}

async function loadProjects(
    projectManager: ProjectManager,
    setProjects: React.Dispatch<React.SetStateAction<ProjectPreview[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<void> {
    setLoading(true)
    setError(null)
    try {
        const list = await projectManager.listProjects()
        setProjects(list)
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
        setLoading(false)
    }
}

function ProjectsProvider({ children }: Props) {
    const projectManager = useService(ProjectManager)
    const [projects, setProjects] = useState<ProjectPreview[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const reload = async (): Promise<void> => {
        await loadProjects(projectManager, setProjects, setLoading, setError)
    }

    useAsyncEffect(
        async () => {
            await loadProjects(projectManager, setProjects, setLoading, setError)
        },
        undefined,
        [projectManager],
    )

    const createProject = async (name: string): Promise<ProjectPreview> => {
        const project = await projectManager.createProject(name)
        setProjects((prev) => [project, ...prev])
        return project
    }

    const updateProject = async (projectId: string, name: string): Promise<void> => {
        const updated = await projectManager.updateProject(projectId, name)
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, ...updated } : p)))
    }

    const deleteProject = async (projectId: string): Promise<void> => {
        await projectManager.deleteProject(projectId)
        setProjects((prev) => prev.filter((p) => p.id !== projectId))
    }

    const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
        const details = await projectManager.getProject(projectId)
        return details.members
    }

    const addMember = async (projectId: string, username: string, accessType: AccessType): Promise<ProjectMember> => {
        const member = await projectManager.addMember(projectId, username, accessType)
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, memberCount: p.memberCount + 1 } : p)))
        return member
    }

    const updateMemberAccess = async (
        projectId: string,
        username: string,
        accessType: AccessType,
    ): Promise<ProjectMember> => {
        return projectManager.addMember(projectId, username, accessType)
    }

    const removeMember = async (projectId: string, userId: string): Promise<void> => {
        await projectManager.removeMember(projectId, userId)
        setProjects((prev) =>
            prev.map((p) => (p.id === projectId ? { ...p, memberCount: Math.max(0, p.memberCount - 1) } : p)),
        )
    }

    const toggleFavorite = async (projectId: string, favorited: boolean): Promise<void> => {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, favorited } : p)))
        try {
            if (favorited) {
                await projectManager.favoriteProject(projectId)
            } else {
                await projectManager.unfavoriteProject(projectId)
            }
        } catch {
            setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, favorited: !favorited } : p)))
        }
    }

    return (
        <ProjectsContext
            value={{
                projects,
                loading,
                error,
                reload,
                getProjectMembers,
                createProject,
                updateProject,
                deleteProject,
                addMember,
                updateMemberAccess,
                removeMember,
                toggleFavorite,
            }}
        >
            {children}
        </ProjectsContext>
    )
}

export default ProjectsProvider


