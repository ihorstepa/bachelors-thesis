import {
    AuthError,
    AUTH_ERROR_TYPE,
    AuthInvalidJsonError,
    AuthPayloadTooLargeError,
    AuthValidationError,
    getAuthErrorStatus,
} from './errors.js'
import {
    createResponseContext,
} from '../utils.js'
import { logger } from '../../logger.js'

const log = logger.child({ module: 'auth-api' })

const MAX_BODY_BYTES = 64 * 1024

const AUTH_ROUTE = Object.freeze({
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
})

/** @typedef {ReturnType<typeof createResponseContext>} ResponseContext */
/** @typedef {'get'|'post'} AppMethod */

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

/** @param {ResponseContext} response @param {unknown} err */
const sendAuthError = (response, err) =>
    response.sendError(err, {
        isKnownError: (value) => value instanceof AuthError,
        getStatus: getAuthErrorStatus,
        internalErrorType: AUTH_ERROR_TYPE.INTERNAL_ERROR,
        log,
        unexpectedMessage: 'unexpected auth api error',
    })

/** @param {ResponseContext} response */
const readAuthJsonBody = (response) =>
    response.readJsonBody({
        maxBodyBytes: MAX_BODY_BYTES,
        onAborted: () => new AuthValidationError('Request aborted'),
        onPayloadTooLarge: () => new AuthPayloadTooLargeError(),
        onInvalidJson: () => new AuthInvalidJsonError(),
    })

/**
 * @param {ResponseContext} response
 * @returns {Promise<unknown|null>}
 */
const readAuthJsonBodyOrNull = async (response) => {
    try {
        return await readAuthJsonBody(response)
    } catch (err) {
        sendAuthError(response, err)
        return null
    }
}

/** @param {ResponseContext} response */
const sendUnauthorized = (response) => {
    response.sendJson(getAuthErrorStatus(AUTH_ERROR_TYPE.UNAUTHORIZED), {
        error: { type: AUTH_ERROR_TYPE.UNAUTHORIZED },
    })
}

/**
 * @param {ResponseContext} response
 * @param {() => Promise<void>} handler
 */
const handleAuthRequest = async (response, handler) => {
    try {
        await handler()
    } catch (err) {
        sendAuthError(response, err)
    }
}

/**
 * @param {import('uws').TemplatedApp} app
 * @param {AppMethod} method
 * @param {string} path
 * @param {(req: import('uws').HttpRequest, response: ResponseContext) => Promise<void>} handler
 */
const registerRoute = (app, method, path, handler) => {
    app[method](path, async (res, req) => {
        const response = createResponseContext(res)
        await handleAuthRequest(response, async () => {
            await handler(req, response)
        })
    })
}

/**
 * @param {import('uws').TemplatedApp} app
 * @param {string} path
 * @param {(req: import('uws').HttpRequest, response: ResponseContext, body: unknown) => Promise<void>} handler
 */
const registerJsonBodyRoute = (app, path, handler) => {
    registerRoute(app, 'post', path, async (req, response) => {
        const body = await readAuthJsonBodyOrNull(response)
        if (body == null) return

        await handler(req, response, body)
    })
}

/**
 * @param {{ authService: import('./service.js').AuthService }} params
 */
export const createAuthHttpApi = ({ authService }) => {
    /**
     * @param {import('uws').TemplatedApp} app
     */
    const registerRoutes = (app) => {
        registerJsonBodyRoute(
            app,
            AUTH_ROUTE.REGISTER,
            async (_req, response, body) => {
                const result = await authService.register(body)
                response.sendJson('201 Created', result)
            },
        )

        registerJsonBodyRoute(
            app,
            AUTH_ROUTE.LOGIN,
            async (_req, response, body) => {
                const result = await authService.login(body)
                response.sendJson('200 OK', result)
            },
        )

        registerRoute(app, 'get', AUTH_ROUTE.ME, async (req, response) => {
            const token = extractBearerToken(req.getHeader('authorization'))
            if (token == null) {
                sendUnauthorized(response)
                return
            }

            const user = await authService.getCurrentUser(token).catch(() => null)
            if (user == null) {
                sendUnauthorized(response)
                return
            }

            response.sendJson('200 OK', { user })
        })
    }

    return { registerRoutes }
}
