import { useSyncExternalStore, createContext, useContext } from 'react'
import { useService } from '@/contextProviders/ServiceProvider'
import { TabManager } from '@/core/tabManager'

type TabsState = {
    readonly tabs: readonly string[]
    readonly activeId: string | null
    readonly tabManager: TabManager
}

const TabsContext = createContext<TabsState | null>(null)

export function useTabs(): TabsState {
    const context = useContext(TabsContext)
    if (!context) throw new Error('useTabs must be used within TabsContext')
    return context
}

type Props = {
    children: React.ReactNode
}

function TabsProvider({ children }: Props) {
    const tabManager = useService(TabManager)

    const tabs = useSyncExternalStore(
        (notify) => tabManager.on('change', notify),
        () => tabManager.getTabs(),
    )
    const activeId = useSyncExternalStore(
        (notify) => tabManager.on('change', notify),
        () => tabManager.getActiveId(),
    )

    const value: TabsState = { tabs, activeId, tabManager }

    return <TabsContext value={value}>{children}</TabsContext>
}

export default TabsProvider
