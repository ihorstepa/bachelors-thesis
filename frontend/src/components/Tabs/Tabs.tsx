import { DragDropProvider } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'

import TabItem from '@/components/Tabs/TabItem'
import { IFileSystemManager } from '@/core/interfaces/fileSystemManager'
import { useService } from '@/core/ServiceContainer'
import { useTabs } from '@/hooks/useTabs'
import '@/components/Tabs/Tabs.css'

function Tabs() {
    const { tabs, activeId, openTab, closeTab, reorderTabs } = useTabs()
    const fileSystemManager = useService(IFileSystemManager)

    return (
        <DragDropProvider
            onDragEnd={(event) => {
                if (event.canceled) return
                const { source } = event.operation
                if (isSortable(source)) {
                    const { initialIndex, index } = source
                    if (initialIndex !== index) reorderTabs(initialIndex, index)
                }
            }}
        >
            <div className='tabs'>
                {tabs.map((id, index) => (
                    <TabItem
                        key={id}
                        id={id}
                        index={index}
                        name={fileSystemManager.getMeta(id).name}
                        isActive={activeId === id}
                        onActivate={() => openTab(id)}
                        onClose={(e) => {
                            e.stopPropagation()
                            closeTab(id)
                        }}
                    />
                ))}
            </div>
        </DragDropProvider>
    )
}

export default Tabs
