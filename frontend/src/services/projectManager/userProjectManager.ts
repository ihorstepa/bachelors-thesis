import type { ApiClient } from '@/core/apiClient'
import type { ProjectCache } from '@/core/projectCache'
import {
    type AccessType,
    type Project,
    ProjectManager,
    type ProjectMember,
    type ProjectPreview,
} from '@/core/projectManager'
import {
    parseGetProjectPayload,
    parseMemberPayload,
    parseProjectListPayload,
    parseProjectPayload,
} from '@/parsers/projectPayloads'

class UserProjectManager extends ProjectManager {
    private apiClient: ApiClient
    private projectCache: ProjectCache

    public constructor(apiClient: ApiClient, projectCache: ProjectCache) {
        super()
        this.apiClient = apiClient
        this.projectCache = projectCache
    }

    public async getProject(projectId: string): Promise<Project> {
        const payload = parseGetProjectPayload(
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
        return parseProjectListPayload(await this.apiClient.request('/projects', { method: 'GET' }))
    }

    public async createProject(name: string): Promise<ProjectPreview> {
        return parseProjectPayload(
            await this.apiClient.request('/projects', {
                method: 'POST',
                body: JSON.stringify({ name }),
            }),
        )
    }

    public async updateProject(projectId: string, name: string): Promise<ProjectPreview> {
        return parseProjectPayload(
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
        const payload = parseMemberPayload(
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
}

export default UserProjectManager
