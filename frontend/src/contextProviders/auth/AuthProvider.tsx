import type { ReactNode } from 'react'
import { useState } from 'react'

import type { AuthState } from '@/contextProviders/auth/AuthContext'
import { AuthContext } from '@/contextProviders/auth/AuthContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import type { AuthUser } from '@/core/authManager'
import { AuthManager } from '@/core/authManager'
import useAsyncEffect from '@/hooks/useAsyncEffect'

type AuthStatus = 'unknown' | 'authenticated' | 'anonymous'

type Props = {
    children: ReactNode
}

function AuthProvider({ children }: Props) {
    const authClient = useService(AuthManager)
    const [status, setStatus] = useState<AuthStatus>('unknown')
    const [user, setUser] = useState<AuthUser | null>(null)

    const setAnonymousState = (): void => {
        setUser(null)
        setStatus('anonymous')
    }

    const setAuthenticatedState = (nextUser: AuthUser): void => {
        setUser(nextUser)
        setStatus('authenticated')
    }

    useAsyncEffect(
        async (isAborted) => {
            try {
                const nextUser = await authClient.getCurrentUser()
                if (isAborted()) {
                    return
                }
                if (nextUser == null) {
                    setAnonymousState()
                    return
                }
                setAuthenticatedState(nextUser)
            } catch {
                if (isAborted()) {
                    return
                }
                authClient.logout()
                setAnonymousState()
            }
        },
        undefined,
        [authClient],
    )

    const clearSession = (): void => {
        authClient.logout()
        setAnonymousState()
    }

    const login = async (email: string, password: string): Promise<void> => {
        try {
            const nextUser = await authClient.login(email, password)
            setAuthenticatedState(nextUser)
        } catch (error) {
            clearSession()
            throw error
        }
    }

    const register = async (email: string, password: string, username: string): Promise<void> => {
        try {
            const nextUser = await authClient.register(email, password, username)
            setAuthenticatedState(nextUser)
        } catch (error) {
            clearSession()
            throw error
        }
    }

    const token = status === 'authenticated' ? authClient.getToken() : null

    const value: AuthState = {
        isInitializing: status === 'unknown',
        isAuthenticated: status === 'authenticated' && token != null,
        user,
        token,
        login,
        register,
        logout: clearSession,
    }

    return <AuthContext value={value}>{children}</AuthContext>
}

export default AuthProvider
