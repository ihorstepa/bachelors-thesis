import * as ecdsa from 'lib0/crypto/ecdsa'
import * as json from 'lib0/json'
import * as env from 'lib0/environment'
import { createAuthHttpApi, extractBearerToken } from './api.js'
import { createUserRepository } from './repository.js'
import { createAuthService } from './service.js'
import { logger } from '../../logger.js'

const log = logger.child({ module: 'auth-module' })

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
        log.error({ err }, 'failed to parse auth keys from environment')
        throw new Error('Invalid AUTH_PRIVATE_KEY or AUTH_PUBLIC_KEY in environment', { cause: err })
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
    log.info('initializing auth module')
    const { jwtPrivateKey, jwtPublicKey } = await readAuthKeyPair()

    const repository = createUserRepository(postgresUrl)

    const authService = createAuthService({
        repository,
        jwtPrivateKey,
        jwtPublicKey,
    })

    const authApi = createAuthHttpApi({ authService })

    /** @param {{ app: import('uws').TemplatedApp }} ctx */
    const setupApi = (ctx) => {
        log.info('registering auth api routes')
        authApi.registerRoutes(ctx.app)
    }

    const authPlugin = {
        /** @param {import('uws').HttpRequest} req */
        async readAuthInfo(req) {
            const token = getTokenFromRequest(req)
            if (token == null) {
                log.debug('authentication failed: missing auth token')
                throw new Error('missing auth token')
            }
            try {
                return await authService.verifyAccessToken(token)
            } catch (err) {
                log.debug({ err }, 'authentication failed: invalid access token')
                throw err
            }
        },
        /**
         * @param {{ userid: string }} _authInfo
         * @param {import('../../types.js').Room} _room
         * @returns {Promise<import('../../types.js').AccessType>}
         */
        async getAccessType(_authInfo, _room) {
            return /** @type {const} */ ('rw')
        },
    }

    return {
        authPlugin,
        setupApi,
        /** @param {string} token */
        verifyAccessToken: (token) => authService.verifyAccessToken(token),
        destroy: () => {
            log.info('destroying auth module resources')
            repository.destroy()
        },
    }
}
