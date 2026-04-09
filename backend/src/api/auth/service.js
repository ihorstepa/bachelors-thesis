import argon2 from 'argon2'
import * as jwt from 'lib0/crypto/jwt'
import * as s from 'lib0/schema'
import * as time from 'lib0/time'
import { parseLoginInput, parseRegisterInput } from './validators.js'
import { AUTH_ERROR_TYPE, AuthConflictError, AuthInvalidCredentialsError, AuthUnauthorizedError } from './errors.js'

export {
    AUTH_ERROR_TYPE as AUTH_ERROR_CODE,
    AUTH_ERROR_STATUS,
    AuthConflictError,
    AuthError,
    AuthInvalidJsonError,
    AuthInvalidCredentialsError,
    AuthPayloadTooLargeError,
    AuthUnauthorizedError,
    AuthValidationError,
    getAuthErrorStatus,
} from './errors.js'

const ARGON2_OPTIONS = Object.freeze({
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
})

/**
 * @param {string} value
 * @returns {Promise<string>}
 */
const hashPassword = async (value) => argon2.hash(value, ARGON2_OPTIONS)

/**
 * @param {string} password
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (password, storedHash) => {
    try {
        return await argon2.verify(storedHash, password)
    } catch (_err) {
        return false
    }
}

/**
 * @param {{ id: number|string, email: string, username: string }} user
 */
const serializeAuthUser = (user) => ({
    id: String(user.id),
    email: user.email,
    username: user.username,
})

export class AuthService {
    /**
     * @param {{
     *   repository: import('./repository.js').UserRepository,
     *   jwtPrivateKey: CryptoKey,
     *   jwtPublicKey: CryptoKey,
     *   tokenIssuer?: string,
     *   tokenTtlMs?: number
     * }} params
     */
    constructor({
        repository,
        jwtPrivateKey,
        jwtPublicKey,
        tokenIssuer = 'yhub-backend',
        tokenTtlMs = 24 * 60 * 60 * 1000,
    }) {
        this.repository = repository
        this.jwtPrivateKey = jwtPrivateKey
        this.jwtPublicKey = jwtPublicKey
        this.tokenIssuer = tokenIssuer
        this.tokenTtlMs = tokenTtlMs
    }

    /**
     * @param {{ id: number, email: string, username: string }} user
     */
    async issueAccessToken(user) {
        return jwt.encodeJwt(this.jwtPrivateKey, {
            iss: this.tokenIssuer,
            exp: time.getUnixTime() + this.tokenTtlMs,
            userid: String(user.id),
            email: user.email,
            username: user.username,
        })
    }

    /**
     * @param {unknown} body
     */
    async register(body) {
        const { email, password, username } = parseRegisterInput(body)

        const [existingEmail, existingUsername] = await Promise.all([
            this.repository.getUserByEmail(email),
            this.repository.getUserByUsername(username),
        ])

        if (existingEmail != null) {
            throw new AuthConflictError(AUTH_ERROR_TYPE.EMAIL_TAKEN, 'Email is already registered')
        }
        if (existingUsername != null) {
            throw new AuthConflictError(AUTH_ERROR_TYPE.USERNAME_TAKEN, 'Username is already taken')
        }

        const passwordHash = await hashPassword(password)

        const user = await this.repository.createUser({ email, username, passwordHash })
        const token = await this.issueAccessToken(user)
        return { token, user: serializeAuthUser(user) }
    }

    /**
     * @param {unknown} body
     */
    async login(body) {
        const { email, password } = parseLoginInput(body)
        const user = await this.repository.getUserByEmail(email)

        if (user == null) {
            throw new AuthInvalidCredentialsError()
        }

        const ok = await verifyPassword(password, user.passwordHash)
        if (!ok) {
            throw new AuthInvalidCredentialsError()
        }

        const token = await this.issueAccessToken(user)
        return { token, user: serializeAuthUser(user) }
    }

    /**
     * @param {string} token
     */
    async verifyAccessToken(token) {
        const verified = await jwt.verifyJwt(this.jwtPublicKey, token)
        const payload = s
            .$object({
                userid: s.$string,
                email: s.$string,
                username: s.$string,
            })
            .expect(verified.payload)

        const userId = Number(payload.userid)
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new AuthUnauthorizedError(AUTH_ERROR_TYPE.UNAUTHORIZED, 'Invalid token subject')
        }

        const user = await this.repository.getUserById(userId)
        if (user == null) {
            throw new AuthUnauthorizedError(AUTH_ERROR_TYPE.UNAUTHORIZED, 'User no longer exists')
        }

        return {
            userid: String(user.id),
            email: user.email,
            username: user.username,
        }
    }

    /**
     * @param {string} token
     */
    async getCurrentUser(token) {
        const payload = await this.verifyAccessToken(token)
        return serializeAuthUser({
            id: payload.userid,
            email: payload.email,
            username: payload.username,
        })
    }
}

/**
 * @param {ConstructorParameters<typeof AuthService>[0]} params
 */
export const createAuthService = (params) => new AuthService(params)
