import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthState } from '@/contextProviders/auth/AuthContext'
import type { AccessType, ProjectMember, ProjectPreview } from '@/core/projectManager'

type SidebarProps = {
    onLogout: () => void
}

type TopBarProps = {
    onOpenPlayground: () => void
    onCreateProject: () => void
}

type ContentProps = {
    onOpenMembers: (project: ProjectPreview) => void
    onRenameProject: (project: ProjectPreview) => void
    onDeleteProject: (project: ProjectPreview) => void
}

type ManageMembersProps = {
    onAddMember: (username: string, accessType: AccessType) => Promise<ProjectMember>
    onUpdateMemberAccess: (username: string, accessType: AccessType) => Promise<ProjectMember>
    onRemoveMember: (userId: string) => Promise<void>
    onClose: () => void
}

type NewProjectModalProps = {
    onConfirm: (name: string) => Promise<void>
    onClose: () => void
    title?: string
}

type ConfirmModalProps = {
    onConfirm: () => Promise<void>
    onClose: () => void
}

const dashboardState = vi.hoisted(() => ({
    auth: null as AuthState | null,
    projects: null as {
        reload: ReturnType<typeof vi.fn>
        createProject: ReturnType<typeof vi.fn>
        updateProject: ReturnType<typeof vi.fn>
        deleteProject: ReturnType<typeof vi.fn>
        getProjectMembers: ReturnType<typeof vi.fn>
        addMember: ReturnType<typeof vi.fn>
        updateMemberAccess: ReturnType<typeof vi.fn>
        removeMember: ReturnType<typeof vi.fn>
    } | null,
    sampleProject: {
        id: 'p1',
        name: 'Project One',
        ownerId: 'u1',
        ownerUsername: 'alice',
        accessType: 'rw' as AccessType,
        favorited: false,
        memberCount: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        memberPreviewUsernames: ['alice'],
    } satisfies ProjectPreview,
    sidebarProps: null as SidebarProps | null,
    topBarProps: null as TopBarProps | null,
    contentProps: null as ContentProps | null,
    manageMembersProps: null as ManageMembersProps | null,
    newProjectModalProps: null as NewProjectModalProps | null,
    confirmModalProps: null as ConfirmModalProps | null,
}))

vi.mock('@/contextProviders/auth/AuthContext', () => ({
    useAuth: () => {
        if (dashboardState.auth == null) throw new Error('Auth state not configured')
        return dashboardState.auth
    },
}))

vi.mock('@/contextProviders/projects/ProjectsContext', () => ({
    useProjects: () => {
        if (dashboardState.projects == null) throw new Error('Projects state not configured')
        return {
            projects: [dashboardState.sampleProject],
            loading: false,
            error: null,
            toggleFavorite: vi.fn(),
            ...dashboardState.projects,
        }
    },
}))

vi.mock('@/components/DashboardSidebar/DashboardSidebar', () => ({
    default: (props: SidebarProps) => {
        dashboardState.sidebarProps = props
        return <div data-testid='dashboard-sidebar-stub' />
    },
}))

vi.mock('@/components/DashboardTopBar/DashboardTopBar', () => ({
    default: (props: TopBarProps) => {
        dashboardState.topBarProps = props
        return <div data-testid='dashboard-topbar-stub' />
    },
}))

vi.mock('@/components/DashboardContent/DashboardContent', () => ({
    default: (props: ContentProps) => {
        dashboardState.contentProps = props
        return <div data-testid='dashboard-content-stub' />
    },
}))

vi.mock('@/components/ManageMembersModal/ManageMembersModal', () => ({
    default: (props: ManageMembersProps) => {
        dashboardState.manageMembersProps = props
        return <div data-testid='manage-members-modal' />
    },
}))

vi.mock('@/components/NewProjectModal/NewProjectModal', () => ({
    default: (props: NewProjectModalProps) => {
        dashboardState.newProjectModalProps = props
        return <div data-testid='new-project-modal' data-title={props.title ?? 'New project'} />
    },
}))

vi.mock('@/components/ConfirmModal/ConfirmModal', () => ({
    default: (props: ConfirmModalProps) => {
        dashboardState.confirmModalProps = props
        return <div data-testid='confirm-modal' />
    },
}))

import Dashboard from '@/pages/Dashboard/Dashboard'

async function waitForCondition(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition`)
}

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

function makeProjectsState() {
    const defaults = {
        reload: vi.fn(async () => undefined),
        createProject: vi.fn(async (name: string) => {
            void name
            return dashboardState.sampleProject
        }),
        updateProject: vi.fn(async (id: string, name: string) => {
            void id
            void name
            return undefined
        }),
        deleteProject: vi.fn(async (id: string) => {
            void id
            return undefined
        }),
        getProjectMembers: vi.fn(async (id: string) => {
            void id
            return [] as ProjectMember[]
        }),
        addMember: vi.fn(async (id: string, username: string, accessType: AccessType) => {
            void id
            return {
                userId: `u-${username}`,
                username,
                email: `${username}@example.com`,
                accessType,
                isOwner: false,
            }
        }),
        updateMemberAccess: vi.fn(async (id: string, username: string, accessType: AccessType) => {
            void id
            return {
                userId: `u-${username}`,
                username,
                email: `${username}@example.com`,
                accessType,
                isOwner: false,
            }
        }),
        removeMember: vi.fn(async (id: string, userId: string) => {
            void id
            void userId
            return undefined
        }),
    }

    return defaults
}

describe('Dashboard page integration', () => {
    let root: Root | null = null
    let container: HTMLDivElement | null = null

    beforeEach(() => {
        ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
        dashboardState.auth = makeAuth()
        dashboardState.projects = makeProjectsState()
        dashboardState.sidebarProps = null
        dashboardState.topBarProps = null
        dashboardState.contentProps = null
        dashboardState.manageMembersProps = null
        dashboardState.newProjectModalProps = null
        dashboardState.confirmModalProps = null
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

    const renderDashboard = async () => {
        container = document.createElement('div')
        document.body.appendChild(container)

        root = createRoot(container)
        await act(async () => {
            root!.render(
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path='/' element={<Dashboard />} />
                        <Route path='/auth' element={<div data-testid='auth-page'>Auth</div>} />
                        <Route path='/ide' element={<div data-testid='ide-page'>IDE</div>} />
                    </Routes>
                </MemoryRouter>,
            )
        })

        return container
    }

    it('logs out and navigates to auth route', async () => {
        const node = await renderDashboard()
        await waitForCondition(() => dashboardState.sidebarProps != null)

        await act(async () => {
            dashboardState.sidebarProps!.onLogout()
        })

        expect(dashboardState.auth?.logout).toHaveBeenCalledOnce()
        await waitForCondition(() => node.querySelector('[data-testid="auth-page"]') != null)
    })

    it('creates a project through new project modal flow', async () => {
        await renderDashboard()
        await waitForCondition(() => dashboardState.topBarProps != null)

        await act(async () => {
            dashboardState.topBarProps!.onCreateProject()
        })
        await waitForCondition(() => dashboardState.newProjectModalProps != null)
        await act(async () => {
            await dashboardState.newProjectModalProps!.onConfirm('Created Project')
            dashboardState.newProjectModalProps!.onClose()
        })

        expect(dashboardState.projects?.createProject).toHaveBeenCalledWith('Created Project')
    })

    it('renames a project through rename modal flow', async () => {
        await renderDashboard()
        await waitForCondition(() => dashboardState.contentProps != null)

        await act(async () => {
            dashboardState.contentProps!.onRenameProject(dashboardState.sampleProject)
        })
        await waitForCondition(() => dashboardState.newProjectModalProps?.title === 'Rename project')
        await act(async () => {
            await dashboardState.newProjectModalProps!.onConfirm('Renamed Project')
            dashboardState.newProjectModalProps!.onClose()
        })

        expect(dashboardState.projects?.updateProject).toHaveBeenCalledWith('p1', 'Renamed Project')
    })

    it('deletes a project through confirm modal flow', async () => {
        await renderDashboard()
        await waitForCondition(() => dashboardState.contentProps != null)

        await act(async () => {
            dashboardState.contentProps!.onDeleteProject(dashboardState.sampleProject)
        })
        await waitForCondition(() => dashboardState.confirmModalProps != null)
        await act(async () => {
            await dashboardState.confirmModalProps!.onConfirm()
            dashboardState.confirmModalProps!.onClose()
        })

        expect(dashboardState.projects?.deleteProject).toHaveBeenCalledWith('p1')
    })

    it('keeps create modal flow recoverable when project creation fails', async () => {
        const createProject = vi.fn(async () => {
            throw new Error('create failed')
        })
        dashboardState.projects = {
            ...makeProjectsState(),
            createProject,
        }

        await renderDashboard()
        await waitForCondition(() => dashboardState.topBarProps != null)

        await act(async () => {
            dashboardState.topBarProps!.onCreateProject()
        })
        await waitForCondition(() => dashboardState.newProjectModalProps != null)

        await act(async () => {
            await expect(dashboardState.newProjectModalProps!.onConfirm('Broken Project')).rejects.toThrow(
                'create failed',
            )
        })

        expect(createProject).toHaveBeenCalledWith('Broken Project')
        expect(dashboardState.newProjectModalProps).not.toBeNull()
    })

    it('keeps rename modal flow recoverable when project rename fails', async () => {
        const updateProject = vi.fn(async () => {
            throw new Error('rename failed')
        })
        dashboardState.projects = {
            ...makeProjectsState(),
            updateProject,
        }

        await renderDashboard()
        await waitForCondition(() => dashboardState.contentProps != null)

        await act(async () => {
            dashboardState.contentProps!.onRenameProject(dashboardState.sampleProject)
        })
        await waitForCondition(() => dashboardState.newProjectModalProps?.title === 'Rename project')

        await act(async () => {
            await expect(dashboardState.newProjectModalProps!.onConfirm('Still Broken')).rejects.toThrow(
                'rename failed',
            )
        })

        expect(updateProject).toHaveBeenCalledWith('p1', 'Still Broken')
        expect(dashboardState.newProjectModalProps?.title).toBe('Rename project')
    })

    it('keeps delete modal flow recoverable when project deletion fails', async () => {
        const deleteProject = vi.fn(async () => {
            throw new Error('delete failed')
        })
        dashboardState.projects = {
            ...makeProjectsState(),
            deleteProject,
        }

        await renderDashboard()
        await waitForCondition(() => dashboardState.contentProps != null)

        await act(async () => {
            dashboardState.contentProps!.onDeleteProject(dashboardState.sampleProject)
        })
        await waitForCondition(() => dashboardState.confirmModalProps != null)

        await act(async () => {
            await expect(dashboardState.confirmModalProps!.onConfirm()).rejects.toThrow('delete failed')
        })

        expect(deleteProject).toHaveBeenCalledWith('p1')
        expect(dashboardState.confirmModalProps).not.toBeNull()
    })
})
