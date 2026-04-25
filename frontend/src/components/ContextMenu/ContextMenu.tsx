import '@/components/ContextMenu/ContextMenu.css'

import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'])

export type FloatingPoint = {
    x: number
    y: number
}

export type IdeContextMenuItem = {
    id: string
    label: string
    onSelect?: () => void
    shortcut?: string
    disabled?: boolean
    className?: string
}

type Props = {
    sections: IdeContextMenuItem[][]
    isOpen: boolean
    onClose: () => void
    lockScroll?: boolean
    anchorPoint?: FloatingPoint | null
    isWithinBoundary?: (target: Node) => boolean
    floating?: boolean
    className?: string
}

function ContextMenu({
    sections,
    isOpen,
    onClose,
    lockScroll = false,
    anchorPoint = null,
    isWithinBoundary,
    floating = false,
    className,
}: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    const getPositionStyle = (left: number, top: number): CSSProperties => {
        return floating ? { position: 'fixed', left, top } : { left, top }
    }

    useLayoutEffect(() => {
        if (!isOpen || !anchorPoint) return

        const panel = panelRef.current
        if (!panel) return

        const viewportPadding = 8
        let left = anchorPoint.x
        let top = anchorPoint.y

        const rect = panel.getBoundingClientRect()

        if (left + rect.width > window.innerWidth - viewportPadding) {
            left = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding)
        }
        if (top + rect.height > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - rect.height - viewportPadding)
        }

        left = Math.max(viewportPadding, left)
        top = Math.max(viewportPadding, top)

        panel.style.left = `${left}px`
        panel.style.top = `${top}px`
    }, [anchorPoint, isOpen, floating, sections])

    useEffect(() => {
        if (!isOpen) return

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node
            if (!wrapperRef.current?.contains(target) && !isWithinBoundary?.(target)) {
                onClose()
            }
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
                return
            }
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
                return
            }
            if (scrollKeys.has(event.key)) {
                event.preventDefault()
            }
        }

        const preventScroll = (event: Event) => {
            event.preventDefault()
        }

        window.addEventListener('mousedown', handlePointerDown)
        window.addEventListener('keydown', handleKeyDown, { capture: true })

        if (lockScroll) {
            window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
            window.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
        }

        return () => {
            window.removeEventListener('mousedown', handlePointerDown)
            window.removeEventListener('keydown', handleKeyDown, { capture: true })

            if (lockScroll) {
                window.removeEventListener('wheel', preventScroll, { capture: true })
                window.removeEventListener('touchmove', preventScroll, { capture: true })
            }
        }
    }, [isOpen, isWithinBoundary, lockScroll, onClose])

    const handleSelect = (item: IdeContextMenuItem) => {
        if (item.disabled) return
        item.onSelect?.()
        onClose()
    }

    const menu = isOpen ? (
        <div className={floating ? 'ide-context-menu-floating' : 'ide-context-menu'} ref={wrapperRef}>
            <div
                ref={panelRef}
                style={anchorPoint ? getPositionStyle(anchorPoint.x, anchorPoint.y) : undefined}
                className={`ide-context-menu-panel ${className ?? ''}`}
                role='menu'
            >
                {sections.map((section, sectionIndex) => (
                    <div className='ide-context-menu-section' key={`section-${sectionIndex}`}>
                        {section.map((item) => (
                            <button
                                key={item.id}
                                type='button'
                                role='menuitem'
                                className={`ide-context-menu-item ${item.className ?? ''}`}
                                disabled={item.disabled}
                                onClick={() => handleSelect(item)}
                            >
                                <span className='ide-context-menu-item-label'>{item.label}</span>
                                {item.shortcut && (
                                    <span className='ide-context-menu-item-shortcut'>{item.shortcut}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    ) : null

    return <>{floating ? createPortal(menu, document.body) : menu}</>
}

export default ContextMenu
