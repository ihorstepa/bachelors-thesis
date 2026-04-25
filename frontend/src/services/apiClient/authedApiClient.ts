import { API_BASE_URL } from '@/config'
import { ApiClient } from '@/core/apiClient'
import type { AuthManager } from '@/core/authManager'
import { HttpError, httpErrorFromResponse } from '@/errors/http'
import { withTimeout } from '@/utils/functions'

class AuthedApiClient extends ApiClient {
    private authManager: AuthManager

    private static readonly requestTimeout = 12000

    public constructor(authManager: AuthManager) {
        super()
        this.authManager = authManager
    }

    public async request(path: string, init: RequestInit): Promise<unknown> {
        const token = this.authManager.getToken()
        if (token == null) {
            throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated')
        }

        return withTimeout(AuthedApiClient.requestTimeout, async (signal) => {
            const response = await fetch(`${API_BASE_URL}${path}`, {
                ...init,
                signal,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    ...(init.headers ?? {}),
                },
            })
            if (response.status === 204) {
                return undefined
            }
            if (!response.ok) {
                throw await httpErrorFromResponse(response)
            }
            return await response.json()
        })
    }
}

export default AuthedApiClient
