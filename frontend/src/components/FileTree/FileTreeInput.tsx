import { useEffect, useRef, useState } from 'react'
import { FaChevronRight } from 'react-icons/fa'
import type { JSX } from 'react'

import FileIcon from '@/components/Icons/FileIcon'
import type { NodeType } from '@/core/fileSystemManager'

type Props = {
    initialValue?: string
    onConfirm: (value: string) => string | null
    onCancel: () => void
    createType?: NodeType
    selectBasenameOnFocus?: boolean
}

function FileTreeInput({
    initialValue = '',
    onConfirm,
    onCancel,
    createType,
    selectBasenameOnFocus = false,
}: Props): JSX.Element {
    const [value, setValue] = useState(initialValue)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const isConfirmingRef = useRef(false)

    useEffect(() => {
        const element = inputRef.current
        if (!element) return
        element.focus()

        if (initialValue) {
            if (selectBasenameOnFocus) {
                const lastDot = initialValue.lastIndexOf('.')
                const hasUsableExtension = lastDot > 0

                if (hasUsableExtension) {
                    element.setSelectionRange(0, lastDot)
                } else {
                    element.select()
                }
            } else {
                element.select()
            }
        }
    }, [initialValue, selectBasenameOnFocus])

    const attemptConfirm = () => {
        if (isConfirmingRef.current) return
        isConfirmingRef.current = true

        const validationError = onConfirm(value)
        setError(validationError)

        if (validationError) {
            requestAnimationFrame(() => {
                inputRef.current?.focus()
                isConfirmingRef.current = false
            })
            return
        }
        isConfirmingRef.current = false
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.target.value)
        if (error) setError(null)
    }

    const handleBlur = () => {
        if (value.trim().length === 0) {
            onCancel()
            return
        }
        if (error) {
            onCancel()
            return
        }
        attemptConfirm()
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            attemptConfirm()
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
        }
    }

    return (
        <div className='file-tree-name-input-wrapper'>
            {createType === 'dir' && (
                <span
                    className='expand-button expand-button-placeholder file-tree-name-input-leading'
                    aria-hidden='true'
                >
                    <FaChevronRight size={10} />
                </span>
            )}
            {createType === 'file' && (
                <span className='file-icon-wrapper file-tree-name-input-leading'>
                    <FileIcon filename={value} />
                </span>
            )}
            <div className='file-tree-name-input-field'>
                <input
                    ref={inputRef}
                    className={`file-tree-name-input${error ? ' file-tree-name-input--error' : ''}`}
                    value={value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                {error && (
                    <div className='file-tree-name-input-error' role='alert' aria-live='assertive'>
                        {error}
                    </div>
                )}
            </div>
        </div>
    )
}

export default FileTreeInput
