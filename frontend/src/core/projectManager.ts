import { BaseService } from '@/core/general'

export type AccessType = 'r' | 'rw'

export type ProjectInfo = {
    id: string
    name: string
    ownerId: string
    ownerUsername: string
    accessType: AccessType
    favorited: boolean
    memberCount: number
    createdAt: string
    updatedAt: string
}

export type ProjectPreview = ProjectInfo & {
    memberPreviewUsernames: string[]
}

export type Project = ProjectInfo & {
    members: ProjectMember[]
}

export type ProjectMember = {
    userId: string
    username: string
    email: string
    accessType: AccessType
    isOwner: boolean
}

export abstract class ProjectManager extends BaseService {
    public abstract getProject(projectId: string): Promise<Project>
    public abstract listProjects(): Promise<ProjectPreview[]>

    public abstract createProject(name: string): Promise<ProjectPreview>
    public abstract updateProject(projectId: string, name: string): Promise<ProjectPreview>
    public abstract deleteProject(projectId: string): Promise<void>

    public abstract addMember(projectId: string, username: string, accessType: AccessType): Promise<ProjectMember>
    public abstract removeMember(projectId: string, userId: string): Promise<void>

    public abstract favoriteProject(projectId: string): Promise<void>
    public abstract unfavoriteProject(projectId: string): Promise<void>
}
