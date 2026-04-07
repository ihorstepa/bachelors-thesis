import { AppError, BASE_ERROR_STATUS, COMMON_ERROR_TYPE, getErrorStatus } from '../errors.js'

export const AUTH_ERROR_TYPE = Object.freeze({
    ...COMMON_ERROR_TYPE,
    EMAIL_TAKEN: 'EMAIL_TAKEN',
    USERNAME_TAKEN: 'USERNAME_TAKEN',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
})

export const AUTH_ERROR_STATUS = Object.freeze({
    ...BASE_ERROR_STATUS,
    [AUTH_ERROR_TYPE.EMAIL_TAKEN]: '409 Conflict',
    [AUTH_ERROR_TYPE.USERNAME_TAKEN]: '409 Conflict',
    [AUTH_ERROR_TYPE.INVALID_CREDENTIALS]: '401 Unauthorized',
})

/**
 * @param {string} type
 */
export const getAuthErrorStatus = (type) => getErrorStatus(AUTH_ERROR_STATUS, AUTH_ERROR_TYPE.INTERNAL_ERROR, type)

export class AuthError extends AppError {
    /**
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(type, message) {
        super('AuthError', type, message)
    }
}

export class AuthValidationError extends AuthError {
    /**
     * @param {string | undefined} message
     */
    constructor(message) {
        super(AUTH_ERROR_TYPE.VALIDATION_FAILED, message)
        this.name = 'AuthValidationError'
    }
}

export class AuthConflictError extends AuthError {
    /**
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(type, message) {
        super(type, message)
        this.name = 'AuthConflictError'
    }
}

export class AuthUnauthorizedError extends AuthError {
    /**
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(type = AUTH_ERROR_TYPE.UNAUTHORIZED, message) {
        super(type, message)
        this.name = 'AuthUnauthorizedError'
    }
}

export class AuthInvalidCredentialsError extends AuthUnauthorizedError {
    constructor() {
        super(AUTH_ERROR_TYPE.INVALID_CREDENTIALS, 'Invalid email or password')
        this.name = 'AuthInvalidCredentialsError'
    }
}

export class AuthPayloadTooLargeError extends AuthError {
    constructor() {
        super(AUTH_ERROR_TYPE.PAYLOAD_TOO_LARGE, 'Request body too large')
        this.name = 'AuthPayloadTooLargeError'
    }
}

export class AuthInvalidJsonError extends AuthError {
    constructor() {
        super(AUTH_ERROR_TYPE.INVALID_JSON, 'Request body must be valid JSON')
        this.name = 'AuthInvalidJsonError'
    }
}
