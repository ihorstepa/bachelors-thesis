import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import '@/components/FormInput/FormInput.css'

interface Props extends Omit<ComponentPropsWithoutRef<'input'>, 'onChange'> {
    label: string
    error?: string
    onChange: (value: string) => void
    icon?: ReactNode
}

function FormInput({ label, error, onChange, icon, className, ...inputProps }: Props) {
    return (
        <label className='form-field'>
            <span className='form-label'>{label}</span>
            <div className='form-input-wrapper'>
                {icon && <span className='form-input-icon'>{icon}</span>}
                <input
                    {...inputProps}
                    className={`form-input${error ? ' form-input--error' : ''}${className ? ` ${className}` : ''}`}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
            {error && (
                <p className='form-error' role='alert'>
                    {error}
                </p>
            )}
        </label>
    )
}

export default FormInput
