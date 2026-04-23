import { useEffect, useRef } from 'react'

import '@/components/IdeContextMenu/IdeContextMenu.css'

export type IdeContextMenuItem = {
    id: string
    label: string
    onSelect?: () => void
    shortcut?: string
    disabled?: boolean
}

type Props = {
    sections: IdeContextMenuItem[][]
    isOpen: boolean
    onClose: () => void
    isWithinBoundary?: (target: Node) => boolean
}

function IdeContextMenu({ sections, isOpen, onClose, isWithinBoundary }: Props) {
    const wrapperRef = useRef<HTMLDivElement>(null)

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
            }
        }

        window.addEventListener('mousedown', handlePointerDown)
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('mousedown', handlePointerDown)
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    const handleSelect = (item: IdeContextMenuItem) => {
        if (item.disabled) return
        item.onSelect?.()
        onClose()
    }

    return (
        <>
            {isOpen && (
                <div className='ide-context-menu' ref={wrapperRef}>
                    <div className='ide-context-menu-panel' role='menu'>
                        {sections.map((section, sectionIndex) => (
                            <div className='ide-context-menu-section' key={`section-${sectionIndex}`}>
                                {section.map((item) => (
                                    <button
                                        key={item.id}
                                        type='button'
                                        role='menuitem'
                                        className='ide-context-menu-item'
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
