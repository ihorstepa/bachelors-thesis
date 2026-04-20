import { getHttpErrorMessage, normalizeHttpError } from '@/errors/http'

export type AuthErrorType =
    | 'EMAIL_TAKEN'
    | 'INVALID_CREDENTIALS'
    | 'UNAUTHORIZED'
    | 'USERNAME_TAKEN'
    | 'VALIDATION_FAILED'

const AUTH_MESSAGE_BY_TYPE = {
    EMAIL_TAKEN: 'This email is already registered. Try signing in instead.',
    INVALID_CREDENTIALS: 'Incorrect username/email or password.',
    UNAUTHORIZED: 'Your session is invalid or expired. Please sign in again.',
    USERNAME_TAKEN: 'This username is already taken. Please choose another one.',
} as const satisfies Record<Exclude<AuthErrorType, 'VALIDATION_FAILED'>, string>

function isMappedErrorType(type: string): type is keyof typeof AUTH_MESSAGE_BY_TYPE {
    return type in AUTH_MESSAGE_BY_TYPE
}

export function getAuthErrorMessage(error: unknown): string {
    const httpError = normalizeHttpError(error)

    if (httpError.type === 'VALIDATION_FAILED') {
        return httpError.message ?? 'Validation failed.'
    }

    if (isMappedErrorType(httpError.type)) {
        return AUTH_MESSAGE_BY_TYPE[httpError.type]
    }

    return getHttpErrorMessage(httpError)
}
