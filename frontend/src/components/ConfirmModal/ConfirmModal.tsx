import '@/components/ConfirmModal/ConfirmModal.css'

import { useState } from 'react'
import { VscClose } from 'react-icons/vsc'

import ModalShell from '@/components/ModalShell/ModalShell'
import Spinner from '@/components/Spinner/Spinner'

type Props = {
    title: string
    message: string
    confirmLabel: string
    pendingLabel?: string
    onConfirm(): Promise<void>
    onClose(): void
}

function ConfirmModal({ title, message, confirmLabel, pendingLabel, onConfirm, onClose }: Props) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleConfirm = async () => {
        setSubmitting(true)
        setError(null)
        try {
            await onConfirm()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
            setSubmitting(false)
        }
    }

    return (
        <ModalShell className='confirm-modal' onClose={onClose} ariaLabelledBy='confirm-modal-title'>
            <div className='confirm-modal-header'>
                <h2 className='confirm-modal-title' id='confirm-modal-title'>
                    {title}
                </h2>
                <button
                    type='button'
                    className='confirm-modal-close modal-close-btn'
                    onClick={onClose}
                    aria-label='Close'
                    disabled={submitting}
                >
                    <VscClose />
                </button>
            </div>

            <p className='confirm-modal-message'>{message}</p>

            {error != null && <p className='confirm-modal-error modal-error'>{error}</p>}

            <div className='confirm-modal-actions'>
                <button
                    type='button'
                    className='confirm-modal-cancel modal-btn'
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type='button'
                    className='confirm-modal-confirm modal-btn modal-btn-danger'
                    onClick={handleConfirm}
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <Spinner size={13} />
                            {pendingLabel}
                        </>
                    ) : (
                        confirmLabel
                    )}
                </button>
            </div>
        </ModalShell>
    )
}

export default ConfirmModal
