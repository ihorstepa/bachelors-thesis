import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import DashboardContent from '@/components/DashboardContent/DashboardContent'
import { AuthContext, type AuthState } from '@/contextProviders/auth/AuthContext'
import { ProjectsContext, type ProjectsState } from '@/contextProviders/projects/ProjectsContext'

vi.mock('@/components/DashboardContent/DashboardProjectsTable', () => ({
    default: () => <div data-testid='projects-table'>projects-table</div>,
}))

vi.mock('@/components/Spinner/Spinner', () => ({
    default: () => <div data-testid='spinner'>spinner</div>,
}))

function makeAuth(): AuthState {
    return {
        isInitializing: false,
        isAuthenticated: true,
        user: { id: 'u1', username: 'alice', email: 'alice@example.com' },
        token: 'token-1',
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
    }
}

function makeProjects(overrides?: Partial<ProjectsState>): ProjectsState {
    return {
        projects: [],
        loading: false,
        error: null,
        reload: vi.fn(async () => undefined),
        getProjectMembers: vi.fn(async () => []),
        createProject: vi.fn(async () => {
            throw new Error('unused')
        }),
        updateProject: vi.fn(async () => undefined),
        deleteProject: vi.fn(async () => undefined),
        addMember: vi.fn(async () => {
            throw new Error('unused')
        }),
        updateMemberAccess: vi.fn(async () => {
            throw new Error('unused')
        }),
        removeMember: vi.fn(async () => undefined),
        toggleFavorite: vi.fn(async () => undefined),
        ...overrides,
    }
}

describe('DashboardContent integration', () => {
    let root: Root | null = null
    let container: HTMLDivElement | null = null

    beforeEach(() => {
        ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    })

    afterEach(async () => {
        if (root != null) {
            await act(async () => {
                root!.unmount()
            })
        }
        root = null
        container?.remove()
        container = null
        document.body.innerHTML = ''
    })

    const renderWithState = async (projectsState: ProjectsState) => {
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)

        await act(async () => {
            root!.render(
                <AuthContext value={makeAuth()}>
                    <ProjectsContext value={projectsState}>
                        <DashboardContent
                            activeNav='all'
                            search=''
                            onOpenMembers={vi.fn()}
                            onRenameProject={vi.fn()}
                            onDeleteProject={vi.fn()}
                        />
                    </ProjectsContext>
                </AuthContext>,
            )
        })

        return container
    }

    it('renders projects table in ready state', async () => {
        const node = await renderWithState(
            makeProjects({
                projects: [
                    {
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
                    },
                ],
            }),
        )

        expect(node.querySelector('[data-testid="projects-table"]')).not.toBeNull()
    })

    it('shows error and retries project loading', async () => {
        const reload = vi.fn(async () => undefined)
        const node = await renderWithState(makeProjects({ error: 'failed to load', reload }))

        expect(node.textContent).toContain('failed to load')
        const retry = Array.from(node.querySelectorAll('button')).find((btn) => btn.textContent?.includes('Retry'))
        expect(retry).toBeDefined()

        await act(async () => {
            retry!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(reload).toHaveBeenCalledOnce()
    })
})
