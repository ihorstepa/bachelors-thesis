import argon2 from 'argon2'
import * as jwt from 'lib0/crypto/jwt'
import * as s from 'lib0/schema'
import * as time from 'lib0/time'
import {
    AUTH_ERROR_TYPE,
    AuthConflictError,
    AuthInvalidCredentialsError,
    AuthValidationError,
} from './errors.js'

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LEN = 256

const PASSWORD_MIN_LEN = 8
const PASSWORD_MAX_LEN = 256

const USERNAME_RE = /^[a-zA-Z0-9_\-.]+$/
const USERNAME_MIN_LEN = 2
const USERNAME_MAX_LEN = 32

const ARGON2_OPTIONS = Object.freeze({
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
})

/**
 * @param {string} value
 */
const normalizeEmail = (value) => value.trim().toLowerCase()

/**
 * @param {string} value
 */
const normalizeUsername = (value) => value.trim()

/**
 * @param {string} value
 */
const validateEmail = (value) => {
    if (!EMAIL_RE.test(value) || value.length > EMAIL_MAX_LEN) {
        throw new AuthValidationError('A valid email is required')
    }
}

/**
 * @param {string} value
 */
const validatePasswordForRegister = (value) => {
    if (value.length < PASSWORD_MIN_LEN || value.length > PASSWORD_MAX_LEN) {
        throw new AuthValidationError(`Password must be between ${PASSWORD_MIN_LEN} and ${PASSWORD_MAX_LEN} characters`)
    }
}

/**
 * @param {string} value
 */
const validatePasswordForLogin = (value) => {
    if (value.length === 0 || value.length > PASSWORD_MAX_LEN) {
        throw new AuthValidationError('Invalid password')
    }
}

/**
 * @param {string} value
 */
const validateUsername = (value) => {
    if (value.length < USERNAME_MIN_LEN || value.length > USERNAME_MAX_LEN) {
        throw new AuthValidationError(`Username must be between ${USERNAME_MIN_LEN} and ${USERNAME_MAX_LEN} characters`)
    }
    if (!USERNAME_RE.test(value)) {
        throw new AuthValidationError('Username can only contain letters, numbers, underscores, dashes, and dots')
    }
}

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
 * @param {unknown} body
 */
const parseRegisterInput = (body) => {
    const input = s
        .$object({
            email: s.$string,
            password: s.$string,
            username: s.$string,
        })
        .expect(/** @type {any} */(body))

    const email = normalizeEmail(input.email)
    const password = input.password
    const username = normalizeUsername(input.username)

    validateEmail(email)
    validatePasswordForRegister(password)
    validateUsername(username)

    return { email, password, username }
}

/**
 * @param {unknown} body
 */
const parseLoginInput = (body) => {
    const input = s
        .$object({
            email: s.$string,
            password: s.$string,
        })
        .expect(/** @type {any} */(body))

    const email = normalizeEmail(input.email)
    const password = input.password

    validateEmail(email)
    validatePasswordForLogin(password)

    return { email, password }
}

/**
 * @param {{ id: number, email: string, username: string }} user
 */
const publicUser = (user) => ({
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
        return { token, user: publicUser(user) }
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
        return { token, user: publicUser(user) }
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
        return {
            userid: payload.userid,
            email: payload.email,
            username: payload.username,
        }
    }

    /**
     * @param {string} token
     */
    async getCurrentUser(token) {
        const payload = await this.verifyAccessToken(token)
        return {
            id: payload.userid,
            email: payload.email,
            username: payload.username,
        }
    }
}

/**
 * @param {ConstructorParameters<typeof AuthService>[0]} params
 */
export const createAuthService = (params) => new AuthService(params)
