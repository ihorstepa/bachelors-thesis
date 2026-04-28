import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthManager } from '@/core/authManager'
import AuthedApiClient from '@/services/apiClient/authedApiClient'

class MockAuthManager extends AuthManager {
    private token: string | null = null

    public async register(): Promise<never> {
        throw new Error('not implemented')
    }

    public async login(): Promise<never> {
        throw new Error('not implemented')
    }

    public logout(): void {
        this.token = null
    }

    public async getCurrentUser(): Promise<null> {
        return null
    }

    public getToken(): string | null {
        return this.token
    }

    public setToken(token: string | null): void {
        this.token = token
    }
}

describe('AuthedApiClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('throws UNAUTHORIZED when token is missing', async () => {
        const auth = new MockAuthManager()
        const client = new AuthedApiClient(auth)

        await expect(client.request('/projects', { method: 'GET' })).rejects.toMatchObject({
            type: 'UNAUTHORIZED',
            status: 401,
        })
    })

    it('sends auth/content-type headers and returns parsed JSON', async () => {
        const auth = new MockAuthManager()
        auth.setToken('tok')

        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

        const client = new AuthedApiClient(auth)
        await expect(client.request('/projects', { method: 'GET' })).resolves.toEqual({ ok: true })

        const [, init] = fetchMock.mock.calls[0]
        expect(init?.headers).toMatchObject({
            'Content-Type': 'application/json',
            Authorization: 'Bearer tok',
        })
    })

    it('returns undefined for 204 responses', async () => {
        const auth = new MockAuthManager()
        auth.setToken('tok')

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

        const client = new AuthedApiClient(auth)
        await expect(client.request('/projects/p1/favorite', { method: 'PUT' })).resolves.toBeUndefined()
    })

    it('normalizes API errors through httpErrorFromResponse', async () => {
        const auth = new MockAuthManager()
        auth.setToken('tok')

        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: { type: 'FORBIDDEN', message: 'No access' } }), { status: 403 }),
        )

        const client = new AuthedApiClient(auth)
        await expect(client.request('/projects', { method: 'GET' })).rejects.toMatchObject({
            type: 'FORBIDDEN',
            status: 403,
        })
    })
})
