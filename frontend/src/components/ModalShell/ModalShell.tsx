import type { ReactNode } from 'react'

import '@/components/ModalShell/ModalShell.css'

type Props = {
    className?: string
    onClose(): void
    ariaLabelledBy: string
    children: ReactNode
}

function ModalShell({ className, onClose, ariaLabelledBy, children }: Props) {
    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className='modal-shell-overlay' onClick={handleOverlayClick}>
            <div className={className ?? ''} role='dialog' aria-modal='true' aria-labelledby={ariaLabelledBy}>
                {children}
            </div>
        </div>
    )
}

export default ModalShell
