import { useState, createContext, useContext } from 'react'
import { useService } from '@/core/ServiceContainer'
import { IFileSyncManager } from '@/core/interfaces/fileSyncManager'

type TabsState = {
    tabs: string[]
    activeId: string | null
    openTab: (id: string) => void
    closeTab: (id: string) => void
    reorderTabs: (fromIndex: number, toIndex: number) => void
}

export const TabsContext = createContext<TabsState | null>(null)

export function useTabsState(): TabsState {
    const fileSyncManager = useService(IFileSyncManager)
    const [tabs, setTabs] = useState<string[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)

    const openTab = (id: string) => {
        setTabs((prev) => (prev.includes(id) ? prev : [...prev, id]))
        setActiveId(id)
    }

    const closeTab = (id: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t !== id)

            if (activeId === id) {
                const idx = prev.indexOf(id)
                const nextId = next[idx] ?? next[idx - 1] ?? null
                setActiveId(nextId)
            }

            fileSyncManager.closeFile(id)
            return next
        })
    }

    const reorderTabs = (fromIndex: number, toIndex: number) => {
        setTabs((prev) => {
            const next = [...prev]
            const [removed] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, removed)
            return next
        })
    }

    return { tabs, activeId, openTab, closeTab, reorderTabs }
}

export function useTabs(): TabsState {
    const context = useContext(TabsContext)
    if (!context) throw new Error('useTabs must be used within TabsProvider')
    return context
}
