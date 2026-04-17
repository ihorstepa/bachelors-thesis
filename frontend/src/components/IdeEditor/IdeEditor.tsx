import { useEffect } from 'react'
import type { JSX } from 'react'

import { useTabs } from '@/contextProviders/TabsProvider'
import CodeMirror from '@/components/IdeEditor/CodeMirror'
import { useService } from '@/contextProviders/ServiceProvider'
import { PresenceService } from '@/core/presenceService'
import '@/components/IdeEditor/IdeEditor.css'

type Props = {
    canWrite: boolean
}

function IdeEditor({ canWrite }: Props): JSX.Element {
    const presenceService = useService(PresenceService)
    const { tabs, activeId } = useTabs()

    useEffect(() => {
        if (tabs.length === 0) {
            presenceService.setLocation(null)
        }
    }, [tabs.length, presenceService])

    if (tabs.length === 0) {
        return <div className='ide-editor-empty'>Open a file to start editing</div>
    }

    return (
        <>
            {tabs.map((fileId) => (
                <div
                    key={fileId}
                    className='ide-editor-container'
                    style={{ display: fileId === activeId ? 'flex' : 'none' }}
                >
                    <CodeMirror fileId={fileId} isActive={fileId === activeId} canWrite={canWrite} />
                </div>
            ))}
        </>
    )
}

export default IdeEditor
