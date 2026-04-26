import { act, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type ProjectsState, useProjects } from '@/contextProviders/projects/ProjectsContext'
import ProjectsProvider from '@/contextProviders/projects/ProjectsProvider'
import {
    type AccessType,
    type Project,
    ProjectManager,
    type ProjectMember,
    type ProjectPreview,
} from '@/core/projectManager'

import { mountWithServices, unmountMounted, waitForCondition } from './testHarness'

const baseProject: ProjectPreview = {
    id: 'p1',
    name: 'Project One',
    ownerId: 'u1',
    ownerUsername: 'alice',
    accessType: 'rw',
    favorited: false,
    memberCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    memberPreviewUsernames: ['alice'],
}

class MockProjectManager extends ProjectManager {
    public projects: ProjectPreview[] = [baseProject]

    public readonly getProjectMock = vi.fn(async (projectId: string): Promise<Project> => {
        const project = this.projects.find((p) => p.id === projectId)
        if (!project) throw new Error('Project not found')
        return {
            ...project,
            members: [
                {
                    userId: 'u1',
                    username: 'alice',
                    email: 'alice@example.com',
                    accessType: 'rw',
                    isOwner: true,
                },
            ],
        }
    })

    public readonly listProjectsMock = vi.fn(async (): Promise<ProjectPreview[]> => [...this.projects])

    public readonly createProjectMock = vi.fn(async (name: string): Promise<ProjectPreview> => {
        const next: ProjectPreview = {
            ...baseProject,
            id: `p-${this.projects.length + 1}`,
            name,
        }
        this.projects = [next, ...this.projects]
        return next
    })

    public readonly updateProjectMock = vi.fn(async (projectId: string, name: string): Promise<ProjectPreview> => {
        const existing = this.projects.find((p) => p.id === projectId)
        if (!existing) throw new Error('Project not found')
        const updated = { ...existing, name }
        this.projects = this.projects.map((p) => (p.id === projectId ? updated : p))
        return updated
    })

    public readonly deleteProjectMock = vi.fn(async (projectId: string): Promise<void> => {
        this.projects = this.projects.filter((p) => p.id !== projectId)
    })

    public readonly addMemberMock = vi.fn(
        async (_projectId: string, username: string, accessType: AccessType): Promise<ProjectMember> => ({
            userId: `u-${username}`,
            username,
            email: `${username}@example.com`,
            accessType,
            isOwner: false,
        }),
    )

    public readonly removeMemberMock = vi.fn(async (projectId: string, userId: string): Promise<void> => {
        void projectId
        void userId
    })

    public readonly favoriteProjectMock = vi.fn(async (projectId: string): Promise<void> => {
        void projectId
    })

    public readonly unfavoriteProjectMock = vi.fn(async (projectId: string): Promise<void> => {
        void projectId
    })

    public async getProject(projectId: string): Promise<Project> {
        return this.getProjectMock(projectId)
    }

    public async listProjects(): Promise<ProjectPreview[]> {
        return this.listProjectsMock()
    }

    public async createProject(name: string): Promise<ProjectPreview> {
        return this.createProjectMock(name)
    }

    public async updateProject(projectId: string, name: string): Promise<ProjectPreview> {
        return this.updateProjectMock(projectId, name)
    }

    public async deleteProject(projectId: string): Promise<void> {
        return this.deleteProjectMock(projectId)
    }

    public async addMember(projectId: string, username: string, accessType: AccessType): Promise<ProjectMember> {
        return this.addMemberMock(projectId, username, accessType)
    }

    public async removeMember(projectId: string, userId: string): Promise<void> {
        return this.removeMemberMock(projectId, userId)
    }

    public async favoriteProject(projectId: string): Promise<void> {
        return this.favoriteProjectMock(projectId)
    }

    public async unfavoriteProject(projectId: string): Promise<void> {
        return this.unfavoriteProjectMock(projectId)
    }
}

function ProjectsProbe({ onState }: { onState: (state: ProjectsState) => void }) {
    const state = useProjects()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

describe('ProjectsProvider integration', () => {
    const mounted: Array<Awaited<ReturnType<typeof mountWithServices>>> = []

    afterEach(async () => {
        await Promise.all(mounted.splice(0).map((entry) => unmountMounted(entry)))
        document.body.innerHTML = ''
    })

    it('loads projects on mount and exposes list state', async () => {
        const manager = new MockProjectManager()
        const latest = { current: null as ProjectsState | null }
        const registry = new Map([[ProjectManager, manager]])

        const rendered = await mountWithServices(
            <ProjectsProvider>
                <ProjectsProbe onState={(state) => (latest.current = state)} />
            </ProjectsProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.loading === false)

        expect(manager.listProjectsMock).toHaveBeenCalled()
        expect(latest.current?.projects.map((p) => p.id)).toEqual(['p1'])
        expect(latest.current?.error).toBeNull()
    })

    it('updates local context state on create/update/delete operations', async () => {
        const manager = new MockProjectManager()
        const latest = { current: null as ProjectsState | null }
        const registry = new Map([[ProjectManager, manager]])

        const rendered = await mountWithServices(
            <ProjectsProvider>
                <ProjectsProbe onState={(state) => (latest.current = state)} />
            </ProjectsProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.loading === false)

        let created!: ProjectPreview
        await act(async () => {
            created = await latest.current!.createProject('New Project')
        })
        await waitForCondition(() => latest.current!.projects.some((p) => p.id === created.id))

        await act(async () => {
            await latest.current!.updateProject(created.id, 'Renamed Project')
        })
        await waitForCondition(() =>
            latest.current!.projects.some((p) => p.id === created.id && p.name === 'Renamed Project'),
        )

        await act(async () => {
            await latest.current!.deleteProject(created.id)
        })
        await waitForCondition(() => latest.current!.projects.every((p) => p.id !== created.id))
    })

    it('rolls back optimistic favorite state when manager call fails', async () => {
        const manager = new MockProjectManager()
        manager.favoriteProjectMock.mockRejectedValueOnce(new Error('favorite failed'))

        const latest = { current: null as ProjectsState | null }
        const registry = new Map([[ProjectManager, manager]])

        const rendered = await mountWithServices(
            <ProjectsProvider>
                <ProjectsProbe onState={(state) => (latest.current = state)} />
            </ProjectsProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.loading === false)

        await act(async () => {
            await latest.current!.toggleFavorite('p1', true)
        })

        await waitForCondition(() => latest.current!.projects.find((p) => p.id === 'p1')?.favorited === false)
        expect(manager.favoriteProjectMock).toHaveBeenCalledWith('p1')
    })
})
