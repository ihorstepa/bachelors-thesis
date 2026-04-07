import {
    ProjectError,
    PROJECT_ERROR_TYPE,
    ProjectInvalidJsonError,
    ProjectPayloadTooLargeError,
    ProjectValidationError,
    getProjectErrorStatus,
} from './errors.js'
import { extractBearerToken } from '../auth/api.js'
import { createResponseContext } from '../utils.js'
import { logger } from '../../logger.js'

const log = logger.child({ module: 'projects-api' })

const MAX_BODY_BYTES = 64 * 1024

const ROUTES = Object.freeze({
    PROJECTS: '/api/projects',
    PROJECT: '/api/projects/:id',
    PROJECT_MEMBERS: '/api/projects/:id/members',
    PROJECT_MEMBER: '/api/projects/:id/members/:userId',
    PROJECT_FAVORITE: '/api/projects/:id/favorite',
})

/** @typedef {ReturnType<typeof createResponseContext>} ResponseContext */
/** @typedef {'get'|'post'|'patch'|'put'|'del'} AppMethod */

/**
 * @param {import('uws').HttpRequest} req
 * @param {number} index
 * @param {string} name
 * @returns {string}
 */
const getRequiredRouteParam = (req, index, name) => {
    const value = req.getParameter(index)
    if (typeof value !== 'string' || value.length === 0) {
        throw new ProjectValidationError(`Missing route parameter: ${name}`)
    }
    return value
}

/** @param {ResponseContext} response @param {unknown} err */
const sendProjectError = (response, err) =>
    response.sendError(err, {
        isKnownError: (value) => value instanceof ProjectError,
        getStatus: getProjectErrorStatus,
        internalErrorType: PROJECT_ERROR_TYPE.INTERNAL_ERROR,
        log,
        unexpectedMessage: 'unexpected projects api error',
    })

/** @param {ResponseContext} response */
const readProjectJsonBody = (response) =>
    response.readJsonBody({
        maxBodyBytes: MAX_BODY_BYTES,
        onAborted: () => new ProjectValidationError('Request aborted'),
        onPayloadTooLarge: () => new ProjectPayloadTooLargeError(),
        onInvalidJson: () => new ProjectInvalidJsonError(),
    })

/**
 * @param {ResponseContext} response
 * @param {Promise<unknown>} [bodyPromise]
 * @returns {Promise<unknown|null>}
 */
const readProjectJsonBodyOrNull = async (response, bodyPromise = readProjectJsonBody(response)) => {
    try {
        return await bodyPromise
    } catch (err) {
        sendProjectError(response, err)
        return null
    }
}

/** @param {ResponseContext} response */
const sendUnauthorized = (response) => {
    response.sendJson(getProjectErrorStatus(PROJECT_ERROR_TYPE.UNAUTHORIZED), {
        error: { type: PROJECT_ERROR_TYPE.UNAUTHORIZED },
    })
}

/**
 * Authenticate the request and return userid, or send error and return null.
 * @param {import('uws').HttpRequest} req
 * @param {ResponseContext} response
 * @param {(token: string) => Promise<{ userid: string }>} verifyAccessToken
 * @returns {Promise<number|null>}
 */
const authenticate = async (req, response, verifyAccessToken) => {
    const token = extractBearerToken(req.getHeader('authorization'))
    if (token == null) {
        sendUnauthorized(response)
        return null
    }
    try {
        const payload = await verifyAccessToken(token)
        return Number(payload.userid)
    } catch {
        sendUnauthorized(response)
        return null
    }
}

/**
 * @param {ResponseContext} response
 * @param {() => Promise<void>} handler
 */
const handleProjectRequest = async (response, handler) => {
    try {
        await handler()
    } catch (err) {
        sendProjectError(response, err)
    }
}

/**
 * @template T
 * @param {import('uws').TemplatedApp} app
 * @param {AppMethod} method
 * @param {string} path
 * @param {(req: import('uws').HttpRequest) => T} readReq  - sync, called before any await
 * @param {(params: T, response: ResponseContext, userId: number) => Promise<void>} handler
 * @param {(token: string) => Promise<{ userid: string }>} verifyAccessToken
 */
const registerAuthedRoute = (app, method, path, readReq, handler, verifyAccessToken) => {
    app[method](path, async (res, req) => {
        const response = createResponseContext(res)
        let params
        try {
            params = readReq(req)
        } catch (err) {
            sendProjectError(response, err)
            return
        }
        const userId = await authenticate(req, response, verifyAccessToken)
        if (userId == null) return

        await handleProjectRequest(response, async () => {
            await handler(params, response, userId)
        })
    })
}

/**
 * @template T
 * @param {import('uws').TemplatedApp} app
 * @param {AppMethod} method
 * @param {string} path
 * @param {(req: import('uws').HttpRequest) => T} readReq  - sync, called before any await
 * @param {(params: T, response: ResponseContext, userId: number, body: unknown) => Promise<void>} handler
 * @param {(token: string) => Promise<{ userid: string }>} verifyAccessToken
 */
const registerAuthedJsonRoute = (app, method, path, readReq, handler, verifyAccessToken) => {
    app[method](path, async (res, req) => {
        const response = createResponseContext(res)
        const bodyPromise = readProjectJsonBody(response)
        let params
        try {
            params = readReq(req)
        } catch (err) {
            sendProjectError(response, err)
            return
        }
        const userId = await authenticate(req, response, verifyAccessToken)
        if (userId == null) return

        const body = await readProjectJsonBodyOrNull(response, bodyPromise)
        if (body == null) return

        await handleProjectRequest(response, async () => {
            await handler(params, response, userId, body)
        })
    })
}

/**
 * @param {{
 *   projectService: import('./service.js').ProjectService,
 *   verifyAccessToken: (token: string) => Promise<{ userid: string }>
 * }} params
 */
export const createProjectsApi = ({ projectService, verifyAccessToken }) => {
    /**
     * @param {import('uws').TemplatedApp} app
     */
    const registerRoutes = (app) => {
        registerAuthedJsonRoute(
            app,
            'post',
            ROUTES.PROJECTS,
            (_req) => null,
            async (_params, response, userId, body) => {
                const result = await projectService.createProject(userId, body)
                response.sendJson('201 Created', result)
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'get',
            ROUTES.PROJECTS,
            (_req) => null,
            async (_params, response, userId) => {
                const result = await projectService.listProjects(userId)
                response.sendJson('200 OK', result)
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'get',
            ROUTES.PROJECT,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId) => {
                const result = await projectService.getProject(userId, projectId)
                response.sendJson('200 OK', result)
            },
            verifyAccessToken,
        )

        registerAuthedJsonRoute(
            app,
            'patch',
            ROUTES.PROJECT,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId, body) => {
                const result = await projectService.updateProject(userId, projectId, body)
                response.sendJson('200 OK', result)
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'del',
            ROUTES.PROJECT,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId) => {
                await projectService.deleteProject(userId, projectId)
                response.sendEmpty('204 No Content')
            },
            verifyAccessToken,
        )

        registerAuthedJsonRoute(
            app,
            'post',
            ROUTES.PROJECT_MEMBERS,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId, body) => {
                const result = await projectService.addMember(userId, projectId, body)
                response.sendJson('200 OK', result)
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'del',
            ROUTES.PROJECT_MEMBER,
            (req) => ({
                projectId: getRequiredRouteParam(req, 0, 'id'),
                targetUserId: getRequiredRouteParam(req, 1, 'userId'),
            }),
            async ({ projectId, targetUserId }, response, userId) => {
                await projectService.removeMember(userId, projectId, targetUserId)
                response.sendEmpty('204 No Content')
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'put',
            ROUTES.PROJECT_FAVORITE,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId) => {
                await projectService.favoriteProject(userId, projectId)
                response.sendEmpty('204 No Content')
            },
            verifyAccessToken,
        )

        registerAuthedRoute(
            app,
            'del',
            ROUTES.PROJECT_FAVORITE,
            (req) => getRequiredRouteParam(req, 0, 'id'),
            async (projectId, response, userId) => {
                await projectService.unfavoriteProject(userId, projectId)
                response.sendEmpty('204 No Content')
            },
            verifyAccessToken,
        )
    }

    return { registerRoutes }
}
