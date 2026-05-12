import '@/components/NewProjectModal/NewProjectModal.css'

import { useState } from 'react'
import { VscClose } from 'react-icons/vsc'

import ModalShell from '@/components/ModalShell/ModalShell'
import Spinner from '@/components/Spinner/Spinner'

type Props = {
    title?: string
    submitLabel?: string
    pendingLabel?: string
    initialValue?: string
    errorMessage?: string
    onConfirm(name: string): Promise<void>
    onClose(): void
}

function NewProjectModal({
    title = 'New project',
    submitLabel = 'Create project',
    pendingLabel = 'Creating...',
    initialValue = '',
    errorMessage = 'Failed to save project',
    onConfirm,
    onClose,
}: Props) {
    const [name, setName] = useState(initialValue)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (trimmed.length === 0) {
            setError('Project name is required')
            return
        }
        setError(null)
        setSubmitting(true)
        try {
            await onConfirm(trimmed)
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : errorMessage)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <ModalShell className='new-project-modal' onClose={onClose}>
            <div className='new-project-header'>
                <h2 className='new-project-title' id='new-project-title'>
                    {title}
                </h2>
                <button type='button' className='new-project-close modal-close-btn' onClick={onClose} title='Close'>
                    <VscClose />
                </button>
            </div>

            <form className='new-project-form' onSubmit={handleSubmit}>
                <div>
                    <label className='new-project-label' htmlFor='project-name'>
                        Project name
                    </label>
                    <input
                        id='project-name'
                        autoFocus
                        className='new-project-input modal-input'
                        type='text'
                        placeholder='my-project'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        disabled={submitting}
                    />
                    {error != null && <p className='new-project-error modal-error'>{error}</p>}
                </div>

                <div className='new-project-actions'>
                    <button
                        type='button'
                        className='new-project-cancel modal-btn'
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type='submit'
                        className='new-project-submit modal-btn modal-btn-primary'
                        disabled={submitting || name.trim().length === 0}
                    >
                        {submitting && <Spinner size={14} />}
                        {submitting ? pendingLabel : submitLabel}
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export default NewProjectModal
