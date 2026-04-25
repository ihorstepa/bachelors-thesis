import { createContext, useContext } from 'react'

import type { TabManager } from '@/core/tabManager'

export type TabsState = {
    readonly tabs: readonly string[]
    readonly activeId: string | null
    readonly tabManager: TabManager
}

export const TabsContext = createContext<TabsState | null>(null)

export function useTabs(): TabsState {
    const context = useContext(TabsContext)
    if (!context) throw new Error('useTabs must be used within TabsContext')
    return context
}
