import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import '@/components/IdeContextMenu/IdeContextMenu.css'

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
    className?: string
}

function IdeContextMenu({
    sections,
    isOpen,
    onClose,
    lockScroll = false,
    anchorPoint = null,
    isWithinBoundary,
    className,
}: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const [panelStyle, setPanelStyle] = useState<CSSProperties>({})

    useLayoutEffect(() => {
        if (!isOpen || !anchorPoint) {
            setPanelStyle({})
        } else {
            setPanelStyle({ left: anchorPoint.x, top: anchorPoint.y })
        }
    }, [anchorPoint, isOpen])

    useLayoutEffect(() => {
        if (!isOpen || !anchorPoint || !panelRef.current) return

        const viewportPadding = 8
        const rect = panelRef.current.getBoundingClientRect()
        let left = anchorPoint.x
        let top = anchorPoint.y

        if (left + rect.width > window.innerWidth - viewportPadding) {
            left = Math.max(viewportPadding, window.innerWidth - rect.width - viewportPadding)
        }
        if (top + rect.height > window.innerHeight - viewportPadding) {
            top = Math.max(viewportPadding, window.innerHeight - rect.height - viewportPadding)
        }
        setPanelStyle({ left, top })
    }, [anchorPoint, isOpen])

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

    return (
        <>
            {isOpen && (
                <div className='ide-context-menu' ref={wrapperRef}>
                    <div
                        ref={panelRef}
                        style={anchorPoint ? panelStyle : undefined}
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
            )}
        </>
    )
}

export default IdeContextMenu
