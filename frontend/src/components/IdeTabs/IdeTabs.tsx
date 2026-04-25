import '@/components/IdeTabs/IdeTabs.css'

import type { DragEndEvent } from '@dnd-kit/react'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable } from '@dnd-kit/react/sortable'

import TabItem from '@/components/IdeTabs/TabItem'
import OverlayScrollbar from '@/components/OverlayScrollbar/OverlayScrollbar'
import { useService } from '@/contextProviders/service/ServiceContext'
import { useTabs } from '@/contextProviders/tabs/TabsContext'
import { FileSystemManager } from '@/core/fileSystemManager'

function IdeTabs() {
    const { tabs, activeId, tabManager } = useTabs()
    const fileSystemManager = useService(FileSystemManager)

    const handleDragEnd: DragEndEvent = (event) => {
        if (event.canceled) return
        const { source, target } = event.operation
        if (!source || !target) return

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
            <OverlayScrollbar variant='tabs' theme='os-theme-ide-tabs' x='scroll' y='hidden'>
                <div className='tabs-content'>
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
            </OverlayScrollbar>
        </DragDropProvider>
    )
}

export default IdeTabs
