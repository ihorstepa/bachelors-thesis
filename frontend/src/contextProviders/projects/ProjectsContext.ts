import { createContext, useContext } from 'react'

import type { AccessType, ProjectMember, ProjectPreview } from '@/core/projectManager'

export type ProjectsState = {
    projects: ProjectPreview[]
    loading: boolean
    error: string | null
    reload(): Promise<void>
    getProjectMembers(projectId: string): Promise<ProjectMember[]>
    createProject(name: string): Promise<ProjectPreview>
    updateProject(projectId: string, name: string): Promise<void>
    deleteProject(projectId: string): Promise<void>
    addMember(projectId: string, username: string, accessType: AccessType): Promise<ProjectMember>
    updateMemberAccess(projectId: string, username: string, accessType: AccessType): Promise<ProjectMember>
    removeMember(projectId: string, userId: string): Promise<void>
    toggleFavorite(projectId: string, favorited: boolean): Promise<void>
}

export const ProjectsContext = createContext<ProjectsState | null>(null)

export function useProjects(): ProjectsState {
    const context = useContext(ProjectsContext)
    if (context == null) {
        throw new Error('useProjects must be used inside ProjectsProvider')
    }
    return context
}
