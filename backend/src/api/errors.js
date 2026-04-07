export const COMMON_ERROR_TYPE = Object.freeze({
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    INVALID_JSON: 'INVALID_JSON',
    PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
})

export const BASE_ERROR_STATUS = Object.freeze({
    [COMMON_ERROR_TYPE.VALIDATION_FAILED]: '400 Bad Request',
    [COMMON_ERROR_TYPE.INVALID_JSON]: '400 Bad Request',
    [COMMON_ERROR_TYPE.PAYLOAD_TOO_LARGE]: '413 Payload Too Large',
    [COMMON_ERROR_TYPE.UNAUTHORIZED]: '401 Unauthorized',
    [COMMON_ERROR_TYPE.FORBIDDEN]: '403 Forbidden',
    [COMMON_ERROR_TYPE.NOT_FOUND]: '404 Not Found',
    [COMMON_ERROR_TYPE.CONFLICT]: '409 Conflict',
    [COMMON_ERROR_TYPE.METHOD_NOT_ALLOWED]: '405 Method Not Allowed',
    [COMMON_ERROR_TYPE.INTERNAL_ERROR]: '500 Internal Server Error',
})

/**
 * @param {Record<string, string>} statusMap
 * @param {string} fallbackType
 * @param {string} type
 */
export const getErrorStatus = (statusMap, fallbackType, type) =>
    statusMap[type] || statusMap[fallbackType] || BASE_ERROR_STATUS[COMMON_ERROR_TYPE.INTERNAL_ERROR]

export class AppError extends Error {
    /**
     * @param {string} name
     * @param {string} type
     * @param {string | undefined} message
     */
    constructor(name, type, message) {
        super(message)
        this.name = name
        this.type = type
    }
}
