import { describe, expect, it } from 'vitest'

import {
    AUTH_EMAIL_MAX_LENGTH,
    AUTH_PASSWORD_MAX_LENGTH,
    AUTH_PASSWORD_MIN_LENGTH,
    AUTH_USERNAME_MAX_LENGTH,
    AUTH_USERNAME_MIN_LENGTH,
    validateLoginInput,
    validateNodeName,
    validateRegisterInput,
} from '@/utils/validators'

describe('utils/validators', () => {
    describe('validateNodeName', () => {
        it('rejects empty, reserved, illegal, and too-long names', () => {
            expect(validateNodeName('')).toEqual({ valid: false, msg: 'Name cannot be empty' })
            expect(validateNodeName('   ')).toEqual({ valid: false, msg: 'Name cannot be empty' })
            expect(validateNodeName('.')).toEqual({ valid: false, msg: 'Name is reserved' })
            expect(validateNodeName('..')).toEqual({ valid: false, msg: 'Name is reserved' })
            expect(validateNodeName('bad/name')).toEqual({ valid: false, msg: 'Name includes illegal characters' })
            expect(validateNodeName('a'.repeat(256))).toEqual({ valid: false, msg: 'Name is too long (max 255)' })
        })

        it('accepts normal names', () => {
            expect(validateNodeName('main.cpp')).toEqual({ valid: true })
            expect(validateNodeName('src')).toEqual({ valid: true })
        })
    })

    describe('validateLoginInput', () => {
        it('requires identifier and password', () => {
            const result = validateLoginInput({ identifier: '   ', password: '' })
            expect(result.valid).toBe(false)
            expect(result.errors.identifier).toBe('Username or Email is required.')
            expect(result.errors.password).toBe('Password is required.')
        })

        it('validates email-form identifiers', () => {
            const invalid = validateLoginInput({ identifier: 'bad@email', password: 'secret123' })
            expect(invalid.valid).toBe(false)
            expect(invalid.errors.identifier).toBe('Please enter a valid email address.')

            const valid = validateLoginInput({ identifier: 'ok@example.com', password: 'secret123' })
            expect(valid.valid).toBe(true)
            expect(valid.errors).toEqual({})
        })

        it('validates username identifiers with format and length bounds', () => {
            const short = validateLoginInput({ identifier: 'x', password: 'secret123' })
            expect(short.errors.identifier).toContain(`${AUTH_USERNAME_MIN_LENGTH}`)

            const long = validateLoginInput({
                identifier: 'a'.repeat(AUTH_USERNAME_MAX_LENGTH + 1),
                password: 'secret123',
            })
            expect(long.errors.identifier).toContain(`${AUTH_USERNAME_MAX_LENGTH}`)

            const invalidChars = validateLoginInput({ identifier: 'bad name', password: 'secret123' })
            expect(invalidChars.errors.identifier).toBe(
                'Username can only contain letters, numbers, underscores, dashes, and dots.',
            )
        })

        it('enforces maximum lengths', () => {
            const tooLongIdentifier = validateLoginInput({
                identifier: `x${'a'.repeat(AUTH_EMAIL_MAX_LENGTH)}`,
                password: 'secret123',
            })
            expect(tooLongIdentifier.errors.identifier).toContain(`${AUTH_EMAIL_MAX_LENGTH}`)

            const tooLongPassword = validateLoginInput({
                identifier: 'ok@example.com',
                password: 'a'.repeat(AUTH_PASSWORD_MAX_LENGTH + 1),
            })
            expect(tooLongPassword.errors.password).toContain(`${AUTH_PASSWORD_MAX_LENGTH}`)
        })
    })

    describe('validateRegisterInput', () => {
        it('requires all fields and reports mismatch', () => {
            const result = validateRegisterInput({ email: '', username: '', password: '', confirmPassword: '' })
            expect(result.valid).toBe(false)
            expect(result.errors.email).toBe('Email is required.')
            expect(result.errors.username).toBe('Username is required.')
            expect(result.errors.password).toBe('Password is required.')
            expect(result.errors.confirmPassword).toBe('Please confirm your password.')

            const mismatch = validateRegisterInput({
                email: 'ok@example.com',
                username: 'valid_user',
                password: 'password123',
                confirmPassword: 'different',
            })
            expect(mismatch.errors.confirmPassword).toBe('Passwords do not match.')
        })

        it('validates email, username, and password constraints', () => {
            const bad = validateRegisterInput({
                email: 'bad@domain',
                username: 'bad name',
                password: 'x'.repeat(AUTH_PASSWORD_MIN_LENGTH - 1),
                confirmPassword: 'x'.repeat(AUTH_PASSWORD_MIN_LENGTH - 1),
            })

            expect(bad.errors.email).toBe('Please enter a valid email address.')
            expect(bad.errors.username).toBe(
                'Username can only contain letters, numbers, underscores, dashes, and dots.',
            )
            expect(bad.errors.password).toContain(`${AUTH_PASSWORD_MIN_LENGTH}`)
        })

        it('accepts valid registration input', () => {
            const result = validateRegisterInput({
                email: 'user@example.com',
                username: 'user_name',
                password: 'password123',
                confirmPassword: 'password123',
            })

            expect(result.valid).toBe(true)
            expect(result.errors).toEqual({})
        })
    })
})
