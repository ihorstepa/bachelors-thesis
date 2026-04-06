import {
    AuthError,
    AUTH_ERROR_TYPE,
    AuthInvalidJsonError,
    AuthPayloadTooLargeError,
    AuthValidationError,
    getAuthErrorStatus,
} from './errors.js'
import { logger } from '../logger.js'

const log = logger.child({ module: 'auth-api' })

const MAX_BODY_BYTES = 64 * 1024

const AUTH_ROUTE = Object.freeze({
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
})

/**
 * @param {string|undefined} authHeader
 */
export const extractBearerToken = (authHeader) => {
    if (authHeader == null) {
        return null
    }
    const [scheme, token] = authHeader.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || token == null || token.length === 0) {
        return null
    }
    return token
}

/**
 * @param {import('uws').HttpResponse} res
 * @param {(res: import('uws').HttpResponse) => void} setCorsHeaders
 * @returns {(status: string, body: object) => void}
 */
const createJsonSender = (res, setCorsHeaders) => {
    let aborted = false
    res.onAborted(() => {
        aborted = true
    })

    /**
     * @param {string} status
     * @param {object} body
     */
    return (status, body) => {
        if (aborted) {
            return
        }
        res.cork(() => {
            res.writeStatus(status)
            setCorsHeaders(res)
            res.writeHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify(body))
        })
    }
}

/**
 * @param {(status: string, body: object) => void} sendJson
 * @param {unknown} err
 */
const sendAuthError = (sendJson, err) => {
    if (err instanceof AuthError) {
        sendJson(getAuthErrorStatus(err.type), {
            error: {
                type: err.type,
                ...(err.message != null && err.message.length > 0 ? { message: err.message } : {}),
            },
        })
        return
    }
    log.error({ err }, 'unexpected auth api error')
    sendJson(getAuthErrorStatus(AUTH_ERROR_TYPE.INTERNAL_ERROR), {
        error: { type: AUTH_ERROR_TYPE.INTERNAL_ERROR },
    })
}

/**
 * @param {import('uws').HttpResponse} res
 * @returns {Promise<unknown>}
 */
const readJsonBody = (res) =>
    new Promise((resolve, reject) => {
        let aborted = false
        /** @type {Buffer[]} */
        const chunks = []
        let totalBytes = 0

        res.onAborted(() => {
            aborted = true
            reject(new AuthValidationError('Request aborted'))
        })

        res.onData((chunk, isLast) => {
            if (aborted) {
                return
            }
            const buf = Buffer.from(chunk)
            totalBytes += buf.byteLength

            if (totalBytes > MAX_BODY_BYTES) {
                reject(new AuthPayloadTooLargeError())
                return
            }

            chunks.push(buf)

            if (!isLast) {
                return
            }

            try {
                const raw = Buffer.concat(chunks).toString('utf8')
                resolve(raw.length === 0 ? {} : JSON.parse(raw))
            } catch (_err) {
                reject(new AuthInvalidJsonError())
            }
        })
    })

/**
 * @param {import('uws').TemplatedApp} app
 * @param {(res: import('uws').HttpResponse) => void} setCorsHeaders
 * @param {string} path
 * @param {(req: import('uws').HttpRequest, body: unknown) => Promise<object>} handler
 * @param {{ successStatus: string }} options
 */
const registerJsonBodyRoute = (app, setCorsHeaders, path, handler, { successStatus }) => {
    app.post(path, async (res, req) => {
        const sendJson = createJsonSender(res, setCorsHeaders)
        let body

        try {
            body = await readJsonBody(res)
        } catch (err) {
            sendAuthError(sendJson, err)
            return
        }

        try {
            const payload = await handler(req, body)
            sendJson(successStatus, payload)
        } catch (err) {
            sendAuthError(sendJson, err)
        }
    })
}

/**
 * @param {{ authService: import('./service.js').AuthService }} params
 */
export const createAuthHttpApi = ({ authService }) => {
    /**
     * @param {import('uws').TemplatedApp} app
     * @param {(res: import('uws').HttpResponse) => void} setCorsHeaders
     */
    const registerRoutes = (app, setCorsHeaders) => {
        registerJsonBodyRoute(
            app,
            setCorsHeaders,
            AUTH_ROUTE.REGISTER,
            async (_req, body) => authService.register(body),
            { successStatus: '201 Created' },
        )

        registerJsonBodyRoute(
            app,
            setCorsHeaders,
            AUTH_ROUTE.LOGIN,
            async (_req, body) => authService.login(body),
            { successStatus: '200 OK' },
        )

        app.get(AUTH_ROUTE.ME, async (res, req) => {
            const sendJson = createJsonSender(res, setCorsHeaders)
            try {
                const token = extractBearerToken(req.getHeader('authorization'))

                if (token == null) {
                    sendJson(getAuthErrorStatus(AUTH_ERROR_TYPE.UNAUTHORIZED), {
                        error: { type: AUTH_ERROR_TYPE.UNAUTHORIZED },
                    })
                    return
                }

                const user = await authService.getCurrentUser(token)
                sendJson('200 OK', { user })
            } catch (_err) {
                sendJson(getAuthErrorStatus(AUTH_ERROR_TYPE.UNAUTHORIZED), {
                    error: { type: AUTH_ERROR_TYPE.UNAUTHORIZED },
                })
            }
        })
    }

    return { registerRoutes }
}
