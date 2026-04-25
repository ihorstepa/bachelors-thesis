import { createContext, useContext } from 'react'

import type { AuthUser } from '@/core/authManager'

export type AuthState = {
    isInitializing: boolean
    isAuthenticated: boolean
    user: AuthUser | null
    token: string | null
    login(email: string, password: string): Promise<void>
    register(email: string, password: string, username: string): Promise<void>
    logout(): void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
    const context = useContext(AuthContext)
    if (context == null) {
        throw new Error('useAuth must be used inside AuthProvider')
    }
    return context
}
