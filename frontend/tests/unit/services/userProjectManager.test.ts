import { describe, expect, it, vi } from 'vitest'

import { ApiClient } from '@/core/apiClient'
import UserProjectManager from '@/services/projectManager/userProjectManager'

class MockApiClient extends ApiClient {
    public readonly requestMock = vi.fn<
        (path: string, init: RequestInit) => Promise<unknown>
    >()

    public async request(path: string, init: RequestInit): Promise<unknown> {
        return this.requestMock(path, init)
    }
}

describe('UserProjectManager', () => {
    it('lists projects from decoded payload', async () => {
        const api = new MockApiClient()
        api.requestMock.mockResolvedValue({
            projects: [
                {
                    id: 'p1',
                    name: 'Project 1',
                    ownerId: 'u1',
                    ownerUsername: 'alice',
                    accessType: 'rw',
                    favorited: false,
                    memberCount: 1,
                    createdAt: '2026-01-01',
                    updatedAt: '2026-01-01',
                    memberPreviewUsernames: ['alice'],
                },
            ],
        })

        const manager = new UserProjectManager(api)
        const projects = await manager.listProjects()

        expect(projects).toHaveLength(1)
        expect(api.requestMock).toHaveBeenCalledWith('/projects', { method: 'GET' })
    })

    it('creates and updates project with encoded id payload routes', async () => {
        const api = new MockApiClient()
        api.requestMock.mockResolvedValue({
            project: {
                id: 'p1',
                name: 'Project 1',
                ownerId: 'u1',
                ownerUsername: 'alice',
                accessType: 'rw',
                favorited: false,
                memberCount: 1,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
                memberPreviewUsernames: ['alice'],
            },
        })

        const manager = new UserProjectManager(api)
        await manager.createProject('Project 1')
        await manager.updateProject('p 1', 'Project 1 renamed')

        expect(api.requestMock).toHaveBeenNthCalledWith(
            1,
            '/projects',
            expect.objectContaining({ method: 'POST' }),
        )
        expect(api.requestMock).toHaveBeenNthCalledWith(
            2,
            '/projects/p%201',
            expect.objectContaining({ method: 'PATCH' }),
        )
    })

    it('returns project with members for getProject', async () => {
        const api = new MockApiClient()
        api.requestMock.mockResolvedValue({
            project: {
                id: 'p1',
                name: 'Project 1',
                ownerId: 'u1',
                ownerUsername: 'alice',
                accessType: 'rw',
                favorited: false,
                memberCount: 2,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
            },
            members: [{ userId: 'u1', username: 'alice', email: 'a@x.com', accessType: 'rw', isOwner: true }],
        })

        const manager = new UserProjectManager(api)
        const project = await manager.getProject('p1')

        expect(project.members).toHaveLength(1)
        expect(api.requestMock).toHaveBeenCalledWith('/projects/p1', { method: 'GET' })
    })

    it('throws INVALID_RESPONSE on malformed payloads', async () => {
        const api = new MockApiClient()
        const manager = new UserProjectManager(api)

        api.requestMock.mockResolvedValueOnce({ invalid: true })
        await expect(manager.listProjects()).rejects.toMatchObject({ type: 'INVALID_RESPONSE' })

        api.requestMock.mockResolvedValueOnce({ project: null })
        await expect(manager.createProject('x')).rejects.toMatchObject({ type: 'INVALID_RESPONSE' })

        api.requestMock.mockResolvedValueOnce({ member: null })
        await expect(manager.addMember('p1', 'bob', 'r')).rejects.toMatchObject({ type: 'INVALID_RESPONSE' })
    })
})
