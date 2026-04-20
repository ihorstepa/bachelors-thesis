export type ValidationResult = {
    readonly valid: boolean
    readonly msg?: string
}

export function validateNodeName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
        return { valid: false, msg: 'Name cannot be empty' }
    }

    if (name.length > 255) {
        return { valid: false, msg: 'Name is too long (max 255)' }
    }

    const illegalChars = /[\\/:*?"<>|]/
    if (illegalChars.test(name)) {
        return { valid: false, msg: 'Name includes illegal characters' }
    }

    const reserved = /^(\.+)?$/
    if (reserved.test(name)) {
        return { valid: false, msg: 'Name is reserved' }
    }

    return { valid: true }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-zA-Z0-9_\-.]+$/

export const AUTH_EMAIL_MAX_LENGTH = 256
export const AUTH_USERNAME_MIN_LENGTH = 2
export const AUTH_USERNAME_MAX_LENGTH = 32
export const AUTH_PASSWORD_MIN_LENGTH = 8
export const AUTH_PASSWORD_MAX_LENGTH = 256

export type AuthFormValidationResult = {
    readonly valid: boolean
    readonly errors: {
        readonly identifier?: string
        readonly email?: string
        readonly password?: string
        readonly username?: string
        readonly confirmPassword?: string
    }
}

type LoginValidationInput = {
    identifier: string
    password: string
}

type RegisterValidationInput = {
    email: string
    username: string
    password: string
    confirmPassword?: string
}

export function validateLoginInput({ identifier, password }: LoginValidationInput): AuthFormValidationResult {
    const normalizedIdentifier = identifier.trim()
    const errors: {
        identifier?: string
        password?: string
    } = {}

    if (!normalizedIdentifier) {
        errors.identifier = 'Username or Email is required.'
    } else if (normalizedIdentifier.length > AUTH_EMAIL_MAX_LENGTH) {
        errors.identifier = `Username or Email must be at most ${AUTH_EMAIL_MAX_LENGTH} characters.`
    } else if (normalizedIdentifier.includes('@')) {
        if (!EMAIL_RE.test(normalizedIdentifier)) {
            errors.identifier = 'Please enter a valid email address.'
        }
    } else if (
        normalizedIdentifier.length < AUTH_USERNAME_MIN_LENGTH ||
        normalizedIdentifier.length > AUTH_USERNAME_MAX_LENGTH
    ) {
        errors.identifier = `Username must be between ${AUTH_USERNAME_MIN_LENGTH} and ${AUTH_USERNAME_MAX_LENGTH} characters.`
    } else if (!USERNAME_RE.test(normalizedIdentifier)) {
        errors.identifier = 'Username can only contain letters, numbers, underscores, dashes, and dots.'
    }

    if (!password) {
        errors.password = 'Password is required.'
    } else if (password.length > AUTH_PASSWORD_MAX_LENGTH) {
        errors.password = `Password must be at most ${AUTH_PASSWORD_MAX_LENGTH} characters.`
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    }
}

export function validateRegisterInput({
    email,
    username,
    password,
    confirmPassword,
}: RegisterValidationInput): AuthFormValidationResult {
    const normalizedEmail = email.trim()
    const normalizedUsername = username.trim()
    const errors: {
        email?: string
        password?: string
        username?: string
        confirmPassword?: string
    } = {}

    if (!normalizedEmail) {
        errors.email = 'Email is required.'
    } else if (normalizedEmail.length > AUTH_EMAIL_MAX_LENGTH) {
        errors.email = `Email must be at most ${AUTH_EMAIL_MAX_LENGTH} characters.`
    } else if (!EMAIL_RE.test(normalizedEmail)) {
        errors.email = 'Please enter a valid email address.'
    }

    if (!normalizedUsername) {
        errors.username = 'Username is required.'
    } else if (
        normalizedUsername.length < AUTH_USERNAME_MIN_LENGTH ||
        normalizedUsername.length > AUTH_USERNAME_MAX_LENGTH
    ) {
        errors.username = `Username must be between ${AUTH_USERNAME_MIN_LENGTH} and ${AUTH_USERNAME_MAX_LENGTH} characters.`
    } else if (!USERNAME_RE.test(normalizedUsername)) {
        errors.username = 'Username can only contain letters, numbers, underscores, dashes, and dots.'
    }

    if (!password) {
        errors.password = 'Password is required.'
    } else if (password.length < AUTH_PASSWORD_MIN_LENGTH || password.length > AUTH_PASSWORD_MAX_LENGTH) {
        errors.password = `Password must be between ${AUTH_PASSWORD_MIN_LENGTH} and ${AUTH_PASSWORD_MAX_LENGTH} characters.`
    }

    if (!confirmPassword) {
        errors.confirmPassword = 'Please confirm your password.'
    } else if (confirmPassword !== password) {
        errors.confirmPassword = 'Passwords do not match.'
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    }
}
