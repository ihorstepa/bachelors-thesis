import type { ApiClient } from '@/core/apiClient'
import type { ProjectCache } from '@/core/projectCache'
import {
    type AccessType,
    type Project,
    type ProjectInfo,
    ProjectManager,
    type ProjectMember,
    type ProjectPreview,
} from '@/core/projectManager'
import { HttpError } from '@/errors/http'
import { isObject } from '@/utils/functions'

type GetProjectResponse = {
    project: ProjectInfo
    members: ProjectMember[]
}

class UserProjectManager extends ProjectManager {
    private apiClient: ApiClient
    private projectCache: ProjectCache

    public constructor(apiClient: ApiClient, projectCache: ProjectCache) {
        super()
        this.apiClient = apiClient
        this.projectCache = projectCache
    }

    public async getProject(projectId: string): Promise<Project> {
        const payload = this.decodeGetProjectResponse(
            await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}`, {
                method: 'GET',
            }),
        )
        return {
            ...payload.project,
            members: payload.members,
        }
    }

    public async listProjects(): Promise<ProjectPreview[]> {
        return this.decodeProjectListResponse(await this.apiClient.request('/projects', { method: 'GET' }))
    }

    public async createProject(name: string): Promise<ProjectPreview> {
        return this.decodeProjectResponse(
            await this.apiClient.request('/projects', {
                method: 'POST',
                body: JSON.stringify({ name }),
            }),
        )
    }

    public async updateProject(projectId: string, name: string): Promise<ProjectPreview> {
        return this.decodeProjectResponse(
            await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}`, {
                method: 'PATCH',
                body: JSON.stringify({ name }),
            }),
        )
    }

    public async deleteProject(projectId: string): Promise<void> {
        await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' })
        await this.projectCache.clearProject(projectId)
    }

    public async addMember(projectId: string, username: string, accessType: AccessType): Promise<ProjectMember> {
        const payload = this.decodeMemberResponse(
            await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}/members`, {
                method: 'POST',
                body: JSON.stringify({ username, accessType }),
            }),
        )
        return payload
    }

    public async removeMember(projectId: string, userId: string): Promise<void> {
        await this.apiClient.request(
            `/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`,
            {
                method: 'DELETE',
            },
        )
    }

    public async favoriteProject(projectId: string): Promise<void> {
        await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}/favorite`, { method: 'PUT' })
    }

    public async unfavoriteProject(projectId: string): Promise<void> {
        await this.apiClient.request(`/projects/${encodeURIComponent(projectId)}/favorite`, { method: 'DELETE' })
    }

    private decodeGetProjectResponse(payload: unknown): GetProjectResponse {
        if (!isObject(payload) || !isObject(payload.project) || !Array.isArray(payload.members)) {
            throw new HttpError(200, 'INVALID_RESPONSE', 'Invalid project response')
        }
        return payload as GetProjectResponse
    }

    private decodeProjectListResponse(payload: unknown): ProjectPreview[] {
        if (!isObject(payload) || !Array.isArray(payload.projects)) {
            throw new HttpError(200, 'INVALID_RESPONSE', 'Invalid projects list response')
        }
        return payload.projects as ProjectPreview[]
    }

    private decodeProjectResponse(payload: unknown): ProjectPreview {
        if (!isObject(payload) || !isObject(payload.project)) {
            throw new HttpError(200, 'INVALID_RESPONSE', 'Invalid project response')
        }
        return payload.project as ProjectPreview
    }

    private decodeMemberResponse(payload: unknown): ProjectMember {
        if (!isObject(payload) || !isObject(payload.member)) {
            throw new HttpError(200, 'INVALID_RESPONSE', 'Invalid add member response')
        }
        return payload.member as ProjectMember
    }
}

export default UserProjectManager
