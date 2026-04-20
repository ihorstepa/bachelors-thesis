import { API_BASE_URL } from '@/config'
import { AuthManager } from '@/core/authManager'
import { HttpError, httpErrorFromResponse } from '@/errors/http'
import type { AuthUser } from '@/core/authManager'
import { isObject, withTimeout } from '@/utils/functions'

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

    public async login(identifier: string, password: string): Promise<AuthUser> {
        const response = await this.authRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
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

        return withTimeout(UserAuthManager.requestTimeout, async (signal) => {
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
        return withTimeout(UserAuthManager.requestTimeout, async (signal) => {
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
        if (!isObject(payload)) {
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
        if (!isObject(payload) || !this.isAuthUser(payload.user)) {
            throw new HttpError(status, 'INVALID_RESPONSE', 'Profile response is missing user fields')
        }
        return payload.user
    }

    private isAuthUser(value: unknown): value is AuthUser {
        if (!isObject(value)) {
            return false
        }
        return typeof value.id === 'string' && typeof value.email === 'string' && typeof value.username === 'string'
    }
}

export default UserAuthManager
