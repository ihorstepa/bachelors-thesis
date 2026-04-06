import * as ecdsa from 'lib0/crypto/ecdsa'
import * as json from 'lib0/json'
import * as env from 'lib0/environment'
import { createAuthHttpApi, extractBearerToken } from './api.js'
import { createUserRepository } from './repository.js'
import { createAuthService } from './service.js'

/**
 * @param {import('uws').HttpRequest} req
 */
const getTokenFromRequest = (req) => {
    const fromQuery = req.getQuery('auth')
    if (fromQuery != null && fromQuery.length > 0) {
        return fromQuery
    }
    return extractBearerToken(req.getHeader('authorization'))
}

const readAuthKeyPair = async () => {
    let privateKeyJwk
    let publicKeyJwk

    try {
        privateKeyJwk = json.parse(env.ensureConf('auth-private-key'))
        publicKeyJwk = json.parse(env.ensureConf('auth-public-key'))
    } catch (err) {
        throw new Error(
            'Invalid AUTH_PRIVATE_KEY or AUTH_PUBLIC_KEY in environment',
            { cause: err },
        )
    }

    const [jwtPrivateKey, jwtPublicKey] = await Promise.all([
        ecdsa.importKeyJwk(privateKeyJwk),
        ecdsa.importKeyJwk(publicKeyJwk),
    ])

    return { jwtPrivateKey, jwtPublicKey }
}

/**
 * @param {{ postgresUrl: string }} params
 */
export const createAuthModule = async ({ postgresUrl }) => {
    const { jwtPrivateKey, jwtPublicKey } = await readAuthKeyPair()

    const repository = createUserRepository(postgresUrl)
    await repository.initSchema()

    const authService = createAuthService({
        repository,
        jwtPrivateKey,
        jwtPublicKey,
    })

    const authApi = createAuthHttpApi({ authService })

    /**
     * @param {{ app: import('uws').TemplatedApp, setCorsHeaders: (res: import('uws').HttpResponse) => void }} ctx
     */
    const setupApi = (ctx) => authApi.registerRoutes(ctx.app, ctx.setCorsHeaders)

    const authPlugin = {
        /** @param {import('uws').HttpRequest} req */
        async readAuthInfo(req) {
            const token = getTokenFromRequest(req)
            if (token == null) {
                throw new Error('missing auth token')
            }
            return authService.verifyAccessToken(token)
        },
        /**
         * @param {{ userid: string }} _authInfo
         * @param {import('../types.js').Room} _room
         * @returns {Promise<import('../types.js').AccessType>}
         */
        async getAccessType(_authInfo, _room) {
            return /** @type {const} */ ('rw')
        },
    }

    return {
        authPlugin,
        setupApi,
        destroy: () => repository.destroy(),
    }
}
