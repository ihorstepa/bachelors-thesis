import { useState } from 'react'
import { VscLock, VscMail } from 'react-icons/vsc'
import { FaRegUser } from 'react-icons/fa'
import type { SyntheticEvent } from 'react'

import FormInput from '@/components/FormInput/FormInput'
import { useAuth } from '@/contextProviders/AuthProvider'
import { getAuthErrorMessage } from '@/errors/auth'
import {
    AUTH_PASSWORD_MAX_LENGTH,
    AUTH_PASSWORD_MIN_LENGTH,
    AUTH_USERNAME_MAX_LENGTH,
    AUTH_USERNAME_MIN_LENGTH,
    validateAuthFormInput,
} from '@/utils/validators'
import '@/components/AuthForm/AuthForm.css'

type Mode = 'login' | 'register'
type AuthFormFields = 'email' | 'username' | 'password' | 'confirmPassword'
type AuthFormErrors = Partial<Record<AuthFormFields | 'submit', string>>

type ModeFormState = {
    email: string
    username: string
    password: string
    confirmPassword: string
    errors: AuthFormErrors
}

function createEmptyModeState(): ModeFormState {
    return {
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        errors: {},
    }
}

function AuthForm() {
    const { login, register } = useAuth()
    const [busy, setBusy] = useState(false)
    const [mode, setMode] = useState<Mode>('login')
    const [formsByMode, setFormsByMode] = useState<Record<Mode, ModeFormState>>({
        login: createEmptyModeState(),
        register: createEmptyModeState(),
    })

    const title = mode === 'login' ? 'Login' : 'Registration'
    const currentForm = formsByMode[mode]

    const updateCurrentForm = (updater: (prev: ModeFormState) => ModeFormState) => {
        setFormsByMode((prev) => ({
            ...prev,
            [mode]: updater(prev[mode]),
        }))
    }

    const handleFieldChange = (field: AuthFormFields, value: string) => {
        updateCurrentForm((prev) => ({
            ...prev,
            [field]: value,
            errors: { ...prev.errors, [field]: undefined },
        }))
    }

    const handleModeChange = (nextMode: Mode) => {
        setMode(nextMode)
    }

    const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault()

        const normalizedEmail = currentForm.email.trim()
        const normalizedUsername = currentForm.username.trim()
        const validation = validateAuthFormInput({
            mode,
            email: normalizedEmail,
            password: currentForm.password,
            username: normalizedUsername,
            confirmPassword: currentForm.confirmPassword,
        })

        if (!validation.valid) {
            updateCurrentForm((prev) => ({ ...prev, errors: validation.errors }))
            return
        }

        updateCurrentForm((prev) => ({ ...prev, errors: {} }))

        setBusy(true)

        try {
            if (mode === 'login') {
                await login(normalizedEmail, currentForm.password)
            } else {
                await register(normalizedEmail, currentForm.password, normalizedUsername)
            }
        } catch (err) {
            updateCurrentForm((prev) => ({ ...prev, errors: { submit: getAuthErrorMessage(err) } }))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className='auth-shell'>
            <div className='auth-card'>
                <div className='auth-card-header'>
                    <h1 className='auth-title'>{title}</h1>
                </div>

                <form noValidate onSubmit={submit} className='auth-form'>
                    {mode === 'register' && (
                        <FormInput
                            label='Username'
                            type='text'
                            value={currentForm.username}
                            error={currentForm.errors.username}
                            onChange={(value) => handleFieldChange('username', value)}
                            autoComplete='username'
                            minLength={AUTH_USERNAME_MIN_LENGTH}
                            maxLength={AUTH_USERNAME_MAX_LENGTH}
                            required
                            icon={<FaRegUser />}
                        />
                    )}

                    <FormInput
                        label='Email'
                        type='email'
                        value={currentForm.email}
                        error={currentForm.errors.email}
                        onChange={(value) => handleFieldChange('email', value)}
                        autoComplete='email'
                        required
                        icon={<VscMail />}
                    />

                    <FormInput
                        label='Password'
                        type='password'
                        value={currentForm.password}
                        error={currentForm.errors.password}
                        onChange={(value) => handleFieldChange('password', value)}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        minLength={AUTH_PASSWORD_MIN_LENGTH}
                        maxLength={AUTH_PASSWORD_MAX_LENGTH}
                        required
                        icon={<VscLock />}
                    />

                    {mode === 'register' && (
                        <FormInput
                            label='Confirm password'
                            type='password'
                            value={currentForm.confirmPassword}
                            error={currentForm.errors.confirmPassword}
                            onChange={(value) => handleFieldChange('confirmPassword', value)}
                            autoComplete='new-password'
                            minLength={AUTH_PASSWORD_MIN_LENGTH}
                            maxLength={AUTH_PASSWORD_MAX_LENGTH}
                            required
                            icon={<VscLock />}
                        />
                    )}

                    {currentForm.errors.submit != null && (
                        <p className='auth-error' role='alert' aria-live='assertive'>
                            {currentForm.errors.submit}
                        </p>
                    )}

                    <button type='submit' disabled={busy} className='auth-submit'>
                        {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    <p className='auth-footer'>
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            type='button'
                            className='auth-footer-link'
                            onClick={() => handleModeChange(mode === 'login' ? 'register' : 'login')}
                        >
                            {mode === 'login' ? 'Register' : 'Login'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    )
}

export default AuthForm
