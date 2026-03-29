import { DragDropProvider } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'

import TabItem from '@/components/Tabs/TabItem'
import { FileSystemManager } from '@/core/fileSystemManager'
import { useService } from '@/contextProviders/ServiceProvider'
import { useTabs } from '@/contextProviders/TabsProvider'
import '@/components/Tabs/Tabs.css'

function Tabs() {
    const { tabs, activeId, tabManager } = useTabs()
    const fileSystemManager = useService(FileSystemManager)

    const handleDragEnd = (event: any) => {
        if (event.canceled) return
        const { source, target } = event.operation

        if (isSortable(source) && isSortable(target) && source.index !== target.index) {
            tabManager.reorder(source.index, target.index)
        }
    }

    const handleClose = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        tabManager.close(id)
    }

    return (
        <DragDropProvider onDragEnd={handleDragEnd}>
            <div className='tabs'>
                {tabs.map((id, index) => {
                    const meta = fileSystemManager.getMeta(id)
                    if (!meta) return null

                    return (
                        <TabItem
                            key={id}
                            id={id}
                            index={index}
                            name={meta.name}
                            isActive={activeId === id}
                            onClick={() => tabManager.open(id)}
                            onClose={(e) => handleClose(e, id)}
                        />
                    )
                })}
            </div>
        </DragDropProvider>
    )
}

export default Tabs
