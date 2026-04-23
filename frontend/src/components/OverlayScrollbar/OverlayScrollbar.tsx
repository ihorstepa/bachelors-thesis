import type { JSX, ReactNode } from 'react'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import '@/components/OverlayScrollbar/OverlayScrollbar.css'

export type ScrollbarTheme = 'os-theme-ide' | 'os-theme-ide-tabs'
type OverflowMode = 'scroll' | 'hidden'

export const baseScrollbarOptions = {
    autoHide: 'leave' as const,
    autoHideDelay: 700,
    dragScroll: true,
    clickScroll: false,
    pointers: ['mouse', 'touch', 'pen'] as string[],
}

type Props = {
    variant: 'tabs' | 'tree'
    theme: ScrollbarTheme
    x: OverflowMode
    y: OverflowMode
    children: ReactNode
}

function OverlayScrollbar({ variant, theme, x, y, children }: Props): JSX.Element {
    const className = `overlay-scrollbar overlay-scrollbar--${variant}`

    return (
        <OverlayScrollbarsComponent
            className={className}
            defer
            options={{
                overflow: { x, y },
                scrollbars: { ...baseScrollbarOptions, theme },
            }}
        >
            {children}
        </OverlayScrollbarsComponent>
    )
}

export default OverlayScrollbar
