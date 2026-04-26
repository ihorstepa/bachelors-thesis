import { act, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type AuthState, useAuth } from '@/contextProviders/auth/AuthContext'
import AuthProvider from '@/contextProviders/auth/AuthProvider'
import { AuthManager, type AuthUser } from '@/core/authManager'

import { mountWithServices, unmountMounted, waitForCondition } from './testHarness'

class MockAuthManager extends AuthManager {
    public token: string | null = null
    public currentUser: AuthUser | null = null

    public readonly registerMock = vi.fn(async (email: string, password: string, username: string) => {
        void email
        void password
        void username
        if (!this.currentUser) {
            throw new Error('No current user configured for register')
        }
        return this.currentUser
    })

    public readonly loginMock = vi.fn(async (identifier: string, password: string) => {
        void identifier
        void password
        if (!this.currentUser) {
            throw new Error('No current user configured for login')
        }
        return this.currentUser
    })

    public readonly logoutMock = vi.fn(() => {
        this.token = null
        this.currentUser = null
    })

    public readonly getCurrentUserMock = vi.fn(async () => this.currentUser)

    public async register(email: string, password: string, username: string): Promise<AuthUser> {
        return this.registerMock(email, password, username)
    }

    public async login(identifier: string, password: string): Promise<AuthUser> {
        return this.loginMock(identifier, password)
    }

    public logout(): void {
        this.logoutMock()
    }

    public async getCurrentUser(): Promise<AuthUser | null> {
        return this.getCurrentUserMock()
    }

    public getToken(): string | null {
        return this.token
    }
}

function AuthProbe({ onState }: { onState: (state: AuthState) => void }) {
    const state = useAuth()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

describe('AuthProvider integration', () => {
    const mounted: Array<Awaited<ReturnType<typeof mountWithServices>>> = []

    afterEach(async () => {
        await Promise.all(mounted.splice(0).map((entry) => unmountMounted(entry)))
        document.body.innerHTML = ''
    })

    it('initializes authenticated state when current user and token exist', async () => {
        const auth = new MockAuthManager()
        auth.currentUser = { id: 'u1', email: 'alice@example.com', username: 'alice' }
        auth.token = 'token-1'

        const latest = { current: null as AuthState | null }
        const registry = new Map([[AuthManager, auth]])

        const rendered = await mountWithServices(
            <AuthProvider>
                <AuthProbe onState={(state) => (latest.current = state)} />
            </AuthProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.isInitializing === false)

        expect(latest.current?.isAuthenticated).toBe(true)
        expect(latest.current?.token).toBe('token-1')
        expect(latest.current?.user?.username).toBe('alice')
    })

    it('falls back to anonymous state and logs out when getCurrentUser fails', async () => {
        const auth = new MockAuthManager()
        auth.token = 'stale-token'
        auth.getCurrentUserMock.mockRejectedValueOnce(new Error('network fail'))

        const latest = { current: null as AuthState | null }
        const registry = new Map([[AuthManager, auth]])

        const rendered = await mountWithServices(
            <AuthProvider>
                <AuthProbe onState={(state) => (latest.current = state)} />
            </AuthProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.isInitializing === false)

        expect(auth.logoutMock).toHaveBeenCalledOnce()
        expect(latest.current?.isAuthenticated).toBe(false)
        expect(latest.current?.token).toBeNull()
        expect(latest.current?.user).toBeNull()
    })

    it('clears session on login failure', async () => {
        const auth = new MockAuthManager()
        auth.loginMock.mockRejectedValueOnce(new Error('invalid credentials'))

        const latest = { current: null as AuthState | null }
        const registry = new Map([[AuthManager, auth]])

        const rendered = await mountWithServices(
            <AuthProvider>
                <AuthProbe onState={(state) => (latest.current = state)} />
            </AuthProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current?.isInitializing === false)

        await act(async () => {
            await expect(latest.current!.login('alice@example.com', 'bad-pass')).rejects.toThrow('invalid credentials')
        })

        await waitForCondition(() => latest.current?.isAuthenticated === false)

        expect(auth.logoutMock).toHaveBeenCalledOnce()
        expect(latest.current?.user).toBeNull()
    })
})
