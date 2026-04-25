import '@/components/OverlayScrollbar/OverlayScrollbar.css'

import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import type { JSX, ReactNode } from 'react'

import { baseScrollbarOptions } from '@/components/OverlayScrollbar/baseScrollbarOptions'

export type ScrollbarTheme = 'os-theme-ide' | 'os-theme-ide-tabs'
type OverflowMode = 'scroll' | 'hidden'

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
