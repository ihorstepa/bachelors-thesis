import { API_BASE_URL } from '@/config'
import type { AuthUser } from '@/core/authManager'
import { AuthManager } from '@/core/authManager'
import { httpErrorFromResponse } from '@/errors/http'
import { parseAuthPayload, parseMePayload } from '@/parsers/authPayloads'
import { withTimeout } from '@/utils/functions'

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
            return parseMePayload((await response.json()) as unknown)
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
            return parseAuthPayload((await response.json()) as unknown)
        })
    }
}

export default UserAuthManager
