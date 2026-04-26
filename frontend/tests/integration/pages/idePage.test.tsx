import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthContext, type AuthState } from '@/contextProviders/auth/AuthContext'
import { ServiceContext, type ServiceRegistry } from '@/contextProviders/service/ServiceContext'
import { type Project, ProjectManager, type ProjectMember, type ProjectPreview } from '@/core/projectManager'
import { HttpError } from '@/errors/http'

vi.mock('@/components/FullScreenLoader/FullScreenLoader', () => ({
    default: () => <div data-testid='loader'>Loading</div>,
}))

vi.mock('@/components/IdeEditor/IdeEditor', () => ({
    default: ({ canWrite }: { canWrite: boolean }) => <div data-testid='ide-editor'>{String(canWrite)}</div>,
}))

vi.mock('@/components/IdeSideBar/IdeSideBar', () => ({
    default: ({ canWrite }: { canWrite: boolean }) => <div data-testid='ide-sidebar'>{String(canWrite)}</div>,
}))

vi.mock('@/components/IdeStatusBar/IdeStatusBar', () => ({
    default: () => <div data-testid='ide-status'>status</div>,
}))

vi.mock('@/components/IdeTabs/IdeTabs', () => ({
    default: () => <div data-testid='ide-tabs'>tabs</div>,
}))

vi.mock('@/components/IdeTerminal/IdeTerminal', () => ({
    default: () => <div data-testid='ide-terminal'>terminal</div>,
}))

vi.mock('@/components/IdeTopBar/IdeTopBar', () => ({
    default: ({ canWrite, projectName }: { canWrite: boolean; projectName?: string }) => (
        <div data-testid='ide-topbar' data-can-write={String(canWrite)} data-project-name={projectName ?? ''}>
            topbar
        </div>
    ),
}))

vi.mock('@/contextProviders/service/ServiceProvider', () => ({
    IdeServiceProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/NestedProviders', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/tabs/TabsProvider', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/fileTree/FileTreeProvider', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/editor/EditorProvider', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/codeRunner/CodeRunnerProvider', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/terminal/TerminalProvider', () => ({
    default: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('@/contextProviders/tabs/TabsContext', () => ({
    useTabs: () => ({ tabs: [] as string[] }),
}))

vi.mock('@/contextProviders/terminal/TerminalContext', () => ({
    useTerminal: () => ({ terminalOpen: false }),
}))

import Ide from '@/pages/Ide/Ide'

class MockProjectManager extends ProjectManager {
    public getProjectMock = vi.fn(async (projectId: string): Promise<Project> => {
        void projectId
        return {
            id: 'p1',
            name: 'Project One',
            ownerId: 'u1',
            ownerUsername: 'alice',
            accessType: 'rw',
            favorited: false,
            memberCount: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
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

    public async getProject(projectId: string): Promise<Project> {
        return this.getProjectMock(projectId)
    }

    public async listProjects(): Promise<ProjectPreview[]> {
        return []
    }

    public async createProject(name: string): Promise<ProjectPreview> {
        void name
        throw new Error('unused in test')
    }

    public async updateProject(projectId: string, name: string): Promise<ProjectPreview> {
        void projectId
        void name
        throw new Error('unused in test')
    }

    public async deleteProject(projectId: string): Promise<void> {
        void projectId
        throw new Error('unused in test')
    }

    public async addMember(projectId: string, username: string, accessType: 'r' | 'rw'): Promise<ProjectMember> {
        void projectId
        void username
        void accessType
        throw new Error('unused in test')
    }

    public async removeMember(projectId: string, userId: string): Promise<void> {
        void projectId
        void userId
        throw new Error('unused in test')
    }

    public async favoriteProject(projectId: string): Promise<void> {
        void projectId
        throw new Error('unused in test')
    }

    public async unfavoriteProject(projectId: string): Promise<void> {
        void projectId
        throw new Error('unused in test')
    }
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition`)
}

function makeAuthState(overrides?: Partial<AuthState>): AuthState {
    return {
        isInitializing: false,
        isAuthenticated: true,
        user: { id: 'u1', username: 'alice', email: 'alice@example.com' },
        token: 'token-1',
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        ...overrides,
    }
}

describe('Ide page integration', () => {
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

    const renderIde = async (path: string, auth: AuthState, projectManager: ProjectManager) => {
        container = document.createElement('div')
        document.body.appendChild(container)

        const registry: ServiceRegistry = new Map([[ProjectManager, projectManager]])

        root = createRoot(container)
        await act(async () => {
            root!.render(
                <MemoryRouter initialEntries={[path]}>
                    <ServiceContext value={registry}>
                        <AuthContext value={auth}>
                            <Routes>
                                <Route path='/' element={<div data-testid='dashboard-page'>Dashboard</div>} />
                                <Route path='/auth' element={<div data-testid='auth-page'>Auth</div>} />
                                <Route path='/ide/:projectId?' element={<Ide />} />
                            </Routes>
                        </AuthContext>
                    </ServiceContext>
                </MemoryRouter>,
            )
        })

        return container
    }

    it('redirects to auth when user is unauthenticated', async () => {
        const manager = new MockProjectManager()
        const node = await renderIde('/ide/project-1', makeAuthState({ isAuthenticated: false, token: null }), manager)

        await waitForCondition(() => node.querySelector('[data-testid="auth-page"]') != null)
        expect(node.querySelector('[data-testid="ide-topbar"]')).toBeNull()
        expect(manager.getProjectMock).not.toHaveBeenCalled()
    })

    it('redirects to auth when project access check returns unauthorized', async () => {
        const manager = new MockProjectManager()
        manager.getProjectMock.mockRejectedValueOnce(new HttpError(401, 'UNAUTHORIZED', 'expired'))

        const node = await renderIde('/ide/project-1', makeAuthState(), manager)

        await waitForCondition(() => node.querySelector('[data-testid="auth-page"]') != null)
        expect(manager.getProjectMock).toHaveBeenCalledWith('project-1')
    })

    it('shows access error state when project access is forbidden', async () => {
        const manager = new MockProjectManager()
        manager.getProjectMock.mockRejectedValueOnce(new HttpError(403, 'FORBIDDEN', 'no access'))

        const node = await renderIde('/ide/project-1', makeAuthState(), manager)

        await waitForCondition(() => node.textContent?.includes('Unable to open project') === true)
        expect(node.textContent).toContain('403 FORBIDDEN')
        expect(node.textContent).toContain('no access')
    })

    it('renders ide layout with read-only mode for read access projects', async () => {
        const manager = new MockProjectManager()
        manager.getProjectMock.mockResolvedValueOnce({
            id: 'p1',
            name: 'Read Only Project',
            ownerId: 'u1',
            ownerUsername: 'alice',
            accessType: 'r',
            favorited: false,
            memberCount: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            members: [],
        })

        const node = await renderIde('/ide/project-1', makeAuthState(), manager)

        await waitForCondition(() => node.querySelector('[data-testid="ide-topbar"]') != null)

        const topbar = node.querySelector('[data-testid="ide-topbar"]') as HTMLDivElement
        expect(topbar.dataset.canWrite).toBe('false')
        expect(topbar.dataset.projectName).toBe('Read Only Project')
    })

    it('opens playground mode without fetching project when no projectId is present', async () => {
        const manager = new MockProjectManager()
        const node = await renderIde('/ide', makeAuthState(), manager)

        await waitForCondition(() => node.querySelector('[data-testid="ide-topbar"]') != null)

        const topbar = node.querySelector('[data-testid="ide-topbar"]') as HTMLDivElement
        expect(topbar.dataset.canWrite).toBe('true')
        expect(topbar.dataset.projectName).toBe('')
        expect(manager.getProjectMock).not.toHaveBeenCalled()
    })
})
