import { BaseService } from '@/core/general'

export type AuthUser = {
    id: string
    email: string
    username: string
}

export abstract class AuthManager extends BaseService {
    public abstract register(email: string, password: string, username: string): Promise<AuthUser>
    public abstract login(email: string, password: string): Promise<AuthUser>
    public abstract logout(): void
    public abstract getCurrentUser(): Promise<AuthUser | null>
    public abstract getToken(): string | null
}
