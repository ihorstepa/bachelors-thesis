import '@/components/ModalShell/ModalShell.css'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

type Props = {
    className?: string
    onClose(): void
    children: ReactNode
}

function ModalShell({ className, onClose, children }: Props) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div className='modal-shell-overlay' onClick={handleOverlayClick}>
            <div className={className ?? ''} role='dialog'>
                {children}
            </div>
        </div>
    )
}

export default ModalShell
