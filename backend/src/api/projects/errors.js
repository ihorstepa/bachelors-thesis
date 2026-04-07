import { AppError, BASE_ERROR_STATUS, COMMON_ERROR_TYPE, getErrorStatus } from '../errors.js'

export const PROJECT_ERROR_TYPE = COMMON_ERROR_TYPE

export const PROJECT_ERROR_STATUS = Object.freeze({
    ...BASE_ERROR_STATUS,
})

/**
 * @param {string} type
 */
export const getProjectErrorStatus = (type) =>
    getErrorStatus(PROJECT_ERROR_STATUS, PROJECT_ERROR_TYPE.INTERNAL_ERROR, type)

export class ProjectError extends AppError {
    /**
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(type, message) {
        super('ProjectError', type, message)
    }
}

export class ProjectValidationError extends ProjectError {
    /** @param {string | undefined} message */
    constructor(message) {
        super(PROJECT_ERROR_TYPE.VALIDATION_FAILED, message)
        this.name = 'ProjectValidationError'
    }
}

export class ProjectNotFoundError extends ProjectError {
    constructor() {
        super(PROJECT_ERROR_TYPE.NOT_FOUND, 'Project not found')
        this.name = 'ProjectNotFoundError'
    }
}

export class ProjectForbiddenError extends ProjectError {
    constructor() {
        super(PROJECT_ERROR_TYPE.FORBIDDEN, 'Access denied')
        this.name = 'ProjectForbiddenError'
    }
}

export class ProjectUnauthorizedError extends ProjectError {
    constructor() {
        super(PROJECT_ERROR_TYPE.UNAUTHORIZED, 'Authentication required')
        this.name = 'ProjectUnauthorizedError'
    }
}

export class ProjectConflictError extends ProjectError {
    /** @param {string | undefined} message */
    constructor(message) {
        super(PROJECT_ERROR_TYPE.CONFLICT, message)
        this.name = 'ProjectConflictError'
    }
}

export class ProjectPayloadTooLargeError extends ProjectError {
    constructor() {
        super(PROJECT_ERROR_TYPE.PAYLOAD_TOO_LARGE, 'Request body too large')
        this.name = 'ProjectPayloadTooLargeError'
    }
}

export class ProjectInvalidJsonError extends ProjectError {
    constructor() {
        super(PROJECT_ERROR_TYPE.INVALID_JSON, 'Request body must be valid JSON')
        this.name = 'ProjectInvalidJsonError'
    }
}
