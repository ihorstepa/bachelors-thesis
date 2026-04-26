import { beforeEach, describe, expect, it, vi } from 'vitest'

import UserAuthManager from '@/services/authManager/userAuthManager'

const user = { id: 'u1', email: 'u@example.com', username: 'user' }

describe('UserAuthManager', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('registers user and stores token', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ token: 'tok', user }), { status: 200 }),
        )

        const manager = new UserAuthManager()
        const result = await manager.register('u@example.com', 'password123', 'user')

        expect(result).toEqual(user)
        expect(manager.getToken()).toBe('tok')
        expect(fetchMock).toHaveBeenCalledOnce()
    })

    it('logs in user and can logout', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ token: 'tok', user }), { status: 200 }))

        const manager = new UserAuthManager()
        await manager.login('user', 'password123')
        expect(manager.getToken()).toBe('tok')

        manager.logout()
        expect(manager.getToken()).toBeNull()
    })

    it('returns null from getCurrentUser when no token is stored', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch')
        const manager = new UserAuthManager()

        await expect(manager.getCurrentUser()).resolves.toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('clears token and returns null when /auth/me is unauthorized', async () => {
        localStorage.setItem('auth_token', 'tok')
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(JSON.stringify({ error: { type: 'UNAUTHORIZED', message: 'nope' } }), { status: 401 }),
        )

        const manager = new UserAuthManager()
        await expect(manager.getCurrentUser()).resolves.toBeNull()
        expect(manager.getToken()).toBeNull()
    })

    it('throws INVALID_RESPONSE when auth payload misses fields', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ token: '', user: {} }), { status: 200 }))

        const manager = new UserAuthManager()

        await expect(manager.login('user', 'password123')).rejects.toMatchObject({
            type: 'INVALID_RESPONSE',
        })
    })

    it('throws INVALID_RESPONSE when /auth/me payload is malformed', async () => {
        localStorage.setItem('auth_token', 'tok')
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ nope: true }), { status: 200 }))

        const manager = new UserAuthManager()

        await expect(manager.getCurrentUser()).rejects.toMatchObject({
            type: 'INVALID_RESPONSE',
        })
    })
})
