import { useSyncExternalStore } from 'react'

import { useService } from '@/contextProviders/service/ServiceContext'
import { TabsContext, type TabsState } from '@/contextProviders/tabs/TabsContext'
import { TabManager } from '@/core/tabManager'

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


