export const AUTH_ERROR_TYPE = Object.freeze({
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    EMAIL_TAKEN: 'EMAIL_TAKEN',
    USERNAME_TAKEN: 'USERNAME_TAKEN',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INVALID_JSON: 'INVALID_JSON',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
})

export const AUTH_ERROR_STATUS = Object.freeze({
    [AUTH_ERROR_TYPE.VALIDATION_FAILED]: '400 Bad Request',
    [AUTH_ERROR_TYPE.INVALID_JSON]: '400 Bad Request',
    [AUTH_ERROR_TYPE.PAYLOAD_TOO_LARGE]: '413 Payload Too Large',
    [AUTH_ERROR_TYPE.EMAIL_TAKEN]: '409 Conflict',
    [AUTH_ERROR_TYPE.USERNAME_TAKEN]: '409 Conflict',
    [AUTH_ERROR_TYPE.INVALID_CREDENTIALS]: '401 Unauthorized',
    [AUTH_ERROR_TYPE.UNAUTHORIZED]: '401 Unauthorized',
    [AUTH_ERROR_TYPE.METHOD_NOT_ALLOWED]: '405 Method Not Allowed',
    [AUTH_ERROR_TYPE.INTERNAL_ERROR]: '500 Internal Server Error',
})

/**
 * @param {string} type
 */
export const getAuthErrorStatus = (type) =>
    AUTH_ERROR_STATUS[/** @type {keyof typeof AUTH_ERROR_STATUS} */ (type)] ||
    AUTH_ERROR_STATUS[AUTH_ERROR_TYPE.INTERNAL_ERROR]

export class AuthError extends Error {
    /**
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(type, message) {
        super(message)
        this.name = 'AuthError'
        this.type = type
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
