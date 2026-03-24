import '@/components/GhostButton/GhostButton.css'

import type { ButtonHTMLAttributes } from 'react'

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
    title?: string
}

function GhostButton({ children, title, className = '', ...props }: GhostButtonProps) {
    return (
        <button className={`ghost-btn ${className}`} title={title} {...props}>
            {children}
        </button>
    )
}

export default GhostButton
