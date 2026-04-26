import * as t from 'lib0/testing'
import { createApiTestContext } from './utils.js'

const { request, registerUser } = await createApiTestContext({
    port: 9011,
    redisPrefix: 'yhub:testing:auth-api',
})

/**
 * @param {t.TestCase} tc
 */
export const testAuthRegisterLoginAndMe = async (tc) => {
    // Register a fresh user and authenticate with username/password.
    const user = await registerUser(tc, 'auth-flow')

    const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: user.username, password: user.password },
    })
    t.assert(loginRes.status === 200)
    t.assert(loginRes.data?.token != null)
    t.assert(loginRes.data?.user?.username === user.username)

    // Verify the token can access the authenticated identity endpoint.
    const meRes = await request('/api/auth/me', {
        token: loginRes.data.token,
    })
    t.assert(meRes.status === 200)
    t.assert(meRes.data?.user?.id === user.user.id)

    // /me must reject missing credentials.
    const unauthMeRes = await request('/api/auth/me')
    t.assert(unauthMeRes.status === 401)
}

/**
 * @param {t.TestCase} tc
 */
export const testAuthRegisterConflicts = async (tc) => {
    // First registration succeeds and establishes taken email/username values.
    const user = await registerUser(tc, 'auth-conflict')

    const duplicateEmailRes = await request('/api/auth/register', {
        method: 'POST',
        body: {
            email: user.email,
            username: `${user.username}x`,
            password: 'password123',
        },
    })
    t.assert(duplicateEmailRes.status === 409)
    t.assert(duplicateEmailRes.data?.error?.type === 'EMAIL_TAKEN')

    // Username uniqueness is enforced independently from email.
    const duplicateUsernameRes = await request('/api/auth/register', {
        method: 'POST',
        body: {
            email: `x-${user.email}`,
            username: user.username,
            password: 'password123',
        },
    })
    t.assert(duplicateUsernameRes.status === 409)
    t.assert(duplicateUsernameRes.data?.error?.type === 'USERNAME_TAKEN')
}

/**
 * @param {t.TestCase} tc
 */
export const testAuthLoginFailuresAndValidation = async (tc) => {
    const user = await registerUser(tc, 'auth-login')

    // Wrong password should not authenticate.
    const wrongPasswordRes = await request('/api/auth/login', {
        method: 'POST',
        body: { identifier: user.username, password: 'wrong-password' },
    })
    t.assert(wrongPasswordRes.status === 401)
    t.assert(wrongPasswordRes.data?.error?.type === 'INVALID_CREDENTIALS')

    // Invalid JSON must be rejected before credential handling.
    const invalidJsonRes = await request('/api/auth/login', {
        method: 'POST',
        rawBody: '{"identifier":',
        contentType: 'application/json',
    })
    t.assert(invalidJsonRes.status === 400)
    t.assert(invalidJsonRes.data?.error?.type === 'INVALID_JSON')

    // Large payload protection prevents abuse on auth endpoints.
    const oversizedPayloadRes = await request('/api/auth/login', {
        method: 'POST',
        body: {
            identifier: user.username,
            password: 'x'.repeat(70_000),
        },
    })
    t.assert(oversizedPayloadRes.status === 413)
    t.assert(oversizedPayloadRes.data?.error?.type === 'PAYLOAD_TOO_LARGE')
}
