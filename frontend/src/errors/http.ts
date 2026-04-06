export type HttpErrorType =
    | 'BAD_REQUEST'
    | 'FORBIDDEN'
    | 'INTERNAL_ERROR'
    | 'INVALID_JSON'
    | 'INVALID_RESPONSE'
    | 'METHOD_NOT_ALLOWED'
    | 'NETWORK_ERROR'
    | 'NOT_FOUND'
    | 'PAYLOAD_TOO_LARGE'
    | 'REQUEST_FAILED'
    | 'REQUEST_TIMEOUT'
    | 'UNAUTHORIZED'

function inferTypeFromCode(code: number): HttpErrorType {
    switch (code) {
        case 400:
            return 'BAD_REQUEST'
        case 401:
            return 'UNAUTHORIZED'
        case 403:
            return 'FORBIDDEN'
        case 404:
            return 'NOT_FOUND'
        case 405:
            return 'METHOD_NOT_ALLOWED'
        case 413:
            return 'PAYLOAD_TOO_LARGE'
        default:
            if (code >= 500) {
                return 'INTERNAL_ERROR'
            }
            return 'REQUEST_FAILED'
    }
}

const HTTP_MESSAGE_BY_TYPE = {
    BAD_REQUEST: 'Request is invalid.',
    FORBIDDEN: 'Request is forbidden.',
    INTERNAL_ERROR: 'Service encountered an internal error.',
    INVALID_JSON: 'Request body contains invalid JSON.',
    INVALID_RESPONSE: 'Service returned an unexpected response.',
    METHOD_NOT_ALLOWED: 'Request method is not allowed for this endpoint.',
    NETWORK_ERROR: 'Network error while contacting service.',
    NOT_FOUND: 'Requested endpoint was not found.',
    PAYLOAD_TOO_LARGE: 'Request payload is too large.',
    REQUEST_TIMEOUT: 'Request timed out. Please try again.',
    UNAUTHORIZED: 'Request is unauthorized.',
} as const satisfies Record<Exclude<HttpErrorType, 'REQUEST_FAILED'>, string>

function isMappedErrorType(type: string): type is keyof typeof HTTP_MESSAGE_BY_TYPE {
    return type in HTTP_MESSAGE_BY_TYPE
}

export class HttpError extends Error {
    public readonly status: number
    public readonly type: string

    public constructor(status: number, type: string, message?: string) {
        super(message)
        this.name = 'HttpApiError'
        this.status = status
        this.type = type
    }
}

type ErrorResponse = {
    error?: {
        type?: string
        message?: string
    }
}

function createHttpError(status: number, type?: string, message?: string): HttpError {
    const resolvedType = type && type.length > 0 ? type : inferTypeFromCode(status)
    return new HttpError(status, resolvedType, message)
}

export async function httpErrorFromResponse(response: Response): Promise<HttpError> {
    let payload: ErrorResponse | null = null
    try {
        payload = (await response.json()) as ErrorResponse
    } catch {
        payload = null
    }
    return createHttpError(response.status, payload?.error?.type, payload?.error?.message)
}

export function normalizeHttpError(error: unknown): HttpError {
    if (error instanceof HttpError) {
        return error
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
        return new HttpError(408, 'REQUEST_TIMEOUT', 'Request timed out. Please try again.')
    }
    if (error instanceof TypeError) {
        return new HttpError(0, 'NETWORK_ERROR', 'Network error while contacting service.')
    }
    return new HttpError(0, 'REQUEST_FAILED', 'Request failed')
}

export function getHttpErrorMessage(error: unknown): string {
    const httpError = normalizeHttpError(error)
    const code = isMappedErrorType(httpError.type) ? httpError.type : inferTypeFromCode(httpError.status)
    if (isMappedErrorType(code)) {
        return HTTP_MESSAGE_BY_TYPE[code]
    }
    return httpError.message || 'Request failed.'
}
