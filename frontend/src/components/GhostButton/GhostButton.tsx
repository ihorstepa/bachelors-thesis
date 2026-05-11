import '@/components/GhostButton/GhostButton.css'

import type { ButtonHTMLAttributes } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
    title?: string
}

function GhostButton({ children, title, className = '', ...props }: Props) {
    return (
        <button className={`ghost-btn ${className}`} title={title} {...props}>
            {children}
        </button>
    )
}

export default GhostButton
