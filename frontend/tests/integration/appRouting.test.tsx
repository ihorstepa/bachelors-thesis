import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type AuthSnapshot = {
    isInitializing: boolean
    isAuthenticated: boolean
    user: { id: string; email: string; username: string } | null
    token: string | null
    login: ReturnType<typeof vi.fn>
    register: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
}

const authState = vi.hoisted(() => ({
    value: null as AuthSnapshot | null,
}))

vi.mock('@/contextProviders/auth/AuthContext', () => ({
    useAuth: () => {
        if (authState.value == null) {
            throw new Error('Auth test state is not initialized')
        }
        return authState.value
    },
}))

vi.mock('@/contextProviders/service/ServiceProvider', () => ({
    GlobalServiceProvider: ({ children }: { children: React.ReactNode }) => children,
    IdeServiceProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/contextProviders/auth/AuthProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/contextProviders/projects/ProjectsProvider', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/pages/Auth/Auth', () => ({
    default: () => <div data-testid='auth-page'>Auth Page</div>,
}))

vi.mock('@/pages/Dashboard/Dashboard', () => ({
    default: () => <div data-testid='dashboard-page'>Dashboard Page</div>,
}))

vi.mock('@/pages/Ide/Ide', () => ({
    default: () => <div data-testid='ide-page'>IDE Page</div>,
}))

import App from '@/App'

async function waitForCondition(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition`)
}

describe('App routing integration', () => {
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
        if (container != null) {
            container.remove()
        }
        container = null
        document.body.innerHTML = ''
    })

    const renderAt = async (entry: string | { pathname: string; state?: unknown }) => {
        container = document.createElement('div')
        document.body.appendChild(container)

        root = createRoot(container)
        await act(async () => {
            root!.render(
                <MemoryRouter initialEntries={[entry]}>
                    <App />
                </MemoryRouter>,
            )
        })

        return container
    }

    it('redirects guests from dashboard route to auth route', async () => {
        authState.value = {
            isInitializing: false,
            isAuthenticated: false,
            user: null,
            token: null,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        }

        const node = await renderAt('/')

        await waitForCondition(() => node.querySelector('[data-testid="auth-page"]') != null)
        expect(node.querySelector('[data-testid="dashboard-page"]')).toBeNull()
    })

    it('redirects authenticated users away from auth route', async () => {
        authState.value = {
            isInitializing: false,
            isAuthenticated: true,
            user: { id: 'u1', email: 'alice@example.com', username: 'alice' },
            token: 'token-1',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        }

        const node = await renderAt('/auth')

        await waitForCondition(() => node.querySelector('[data-testid="dashboard-page"]') != null)
        expect(node.querySelector('[data-testid="auth-page"]')).toBeNull()
    })

    it('allows authenticated users to access ide route', async () => {
        authState.value = {
            isInitializing: false,
            isAuthenticated: true,
            user: { id: 'u1', email: 'alice@example.com', username: 'alice' },
            token: 'token-1',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        }

        const node = await renderAt('/ide/project-42')

        await waitForCondition(() => node.querySelector('[data-testid="ide-page"]') != null)
        expect(node.querySelector('[data-testid="auth-page"]')).toBeNull()
    })

    it('restores intended route when authenticated user lands on auth with from state', async () => {
        authState.value = {
            isInitializing: false,
            isAuthenticated: true,
            user: { id: 'u1', email: 'alice@example.com', username: 'alice' },
            token: 'token-1',
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
        }

        const node = await renderAt({ pathname: '/auth', state: { from: { pathname: '/ide/return-target' } } })

        await waitForCondition(() => node.querySelector('[data-testid="ide-page"]') != null)
        expect(node.querySelector('[data-testid="auth-page"]')).toBeNull()
    })
})
