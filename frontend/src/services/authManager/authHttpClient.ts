import { API_BASE_URL } from '@/config'
import { AuthManager } from '@/core/authManager'
import { HttpError, httpErrorFromResponse, normalizeHttpError } from '@/errors/http'
import type { AuthUser } from '@/core/authManager'

class UserAuthManager extends AuthManager {
    private static readonly requestTimeout = 12000
    private static readonly tokenStorageKey = 'auth_token'

    public async register(email: string, password: string, username: string): Promise<AuthUser> {
        const response = await this.authRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, username }),
        })
        this.setToken(response.token)
        return response.user
    }

    public async login(email: string, password: string): Promise<AuthUser> {
        const response = await this.authRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        })
        this.setToken(response.token)
        return response.user
    }

    public logout(): void {
        this.setToken(null)
    }

    public async getCurrentUser(): Promise<AuthUser | null> {
        const token = this.getToken()
        if (!token) return null

        return this.withTimeout(async (signal) => {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                method: 'GET',
                signal,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!response.ok) {
                const error = await httpErrorFromResponse(response)
                if (error.type === 'UNAUTHORIZED') {
                    this.logout()
                    return null
                }
                throw error
            }
            const payload = this.decodeMeResponsePayload((await response.json()) as unknown, response.status)
            return payload
        })
    }

    public getToken(): string | null {
        return localStorage.getItem(UserAuthManager.tokenStorageKey)
    }

    private setToken(token: string | null): void {
        if (token == null) {
            localStorage.removeItem(UserAuthManager.tokenStorageKey)
        } else {
            localStorage.setItem(UserAuthManager.tokenStorageKey, token)
        }
    }

    private async authRequest(path: string, init: RequestInit): Promise<{ token: string; user: AuthUser }> {
        return this.withTimeout(async (signal) => {
            const response = await fetch(`${API_BASE_URL}${path}`, {
                ...init,
                signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...(init.headers ?? {}),
                },
            })
            if (!response.ok) {
                throw await httpErrorFromResponse(response)
            }
            const payload = (await response.json()) as unknown
            return this.decodeAuthResponsePayload(payload, response.status)
        })
    }

    private decodeAuthResponsePayload(payload: unknown, status: number): { token: string; user: AuthUser } {
        if (!this.isObject(payload)) {
            throw new HttpError(status, 'INVALID_RESPONSE', 'Authentication response must be a JSON object')
        }
        const token = payload.token
        const user = payload.user
        if (typeof token !== 'string' || token.length === 0 || !this.isAuthUser(user)) {
            throw new HttpError(status, 'INVALID_RESPONSE', 'Authentication response is missing token or user fields')
        }
        return { token, user }
    }

    private decodeMeResponsePayload(payload: unknown, status: number): AuthUser {
        if (!this.isObject(payload) || !this.isAuthUser(payload.user)) {
            throw new HttpError(status, 'INVALID_RESPONSE', 'Profile response is missing user fields')
        }
        return payload.user
    }

    private isAuthUser(value: unknown): value is AuthUser {
        if (!this.isObject(value)) {
            return false
        }
        return typeof value.id === 'string' && typeof value.email === 'string' && typeof value.username === 'string'
    }

    private isObject(value: unknown): value is Record<string, unknown> {
        return value != null && typeof value === 'object'
    }

    private async withTimeout<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), UserAuthManager.requestTimeout)
        try {
            return await task(controller.signal)
        } catch (error) {
            throw normalizeHttpError(error)
        } finally {
            clearTimeout(timeout)
        }
    }
}

export default UserAuthManager
