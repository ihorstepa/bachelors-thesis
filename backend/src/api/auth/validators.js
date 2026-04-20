import * as s from 'lib0/schema'
import { AuthValidationError } from './errors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LEN = 256
const PASSWORD_MIN_LEN = 8
const PASSWORD_MAX_LEN = 256
const USERNAME_RE = /^[a-zA-Z0-9_\-.]+$/
const USERNAME_MIN_LEN = 2
const USERNAME_MAX_LEN = 32

/**
 * @param {string} value
 */
export const normalizeEmail = (value) => value.trim().toLowerCase()

/**
 * @param {string} value
 */
export const normalizeUsername = (value) => value.trim()

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
 * @param {unknown} body
 */
export const parseRegisterInput = (body) => {
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
export const parseLoginInput = (body) => {
    const input = s
        .$object({
            password: s.$string,
        })
        .expect(/** @type {any} */(body))

    const payload = /** @type {{ identifier?: unknown, email?: unknown }} */ (body)
    const rawIdentifierInput =
        typeof payload.identifier === 'string'
            ? payload.identifier
            : typeof payload.email === 'string'
                ? payload.email
                : ''
    const rawIdentifier = rawIdentifierInput.trim()
    const password = input.password
    const isEmailIdentifier = rawIdentifier.includes('@')
    const identifier = isEmailIdentifier ? normalizeEmail(rawIdentifier) : normalizeUsername(rawIdentifier)

    if (identifier.length === 0 || identifier.length > EMAIL_MAX_LEN) {
        throw new AuthValidationError('Username or Email is required')
    }

    if (isEmailIdentifier) {
        validateEmail(identifier)
    } else {
        validateUsername(identifier)
    }

    validatePasswordForLogin(password)

    return {
        identifier,
        identifierType: isEmailIdentifier ? 'email' : 'username',
        password,
    }
}
