import { useEffect } from 'react'
import type { JSX } from 'react'

import { useTabs } from '@/contextProviders/TabsProvider'
import CodeMirror from '@/components/IdeEditor/CodeMirror'
import { useService } from '@/contextProviders/ServiceProvider'
import { PresenceService } from '@/core/presenceService'
import NotificationPopup, { useNotifications } from '@/components/IdeEditor/IdeNotification'
import '@/components/IdeEditor/IdeEditor.css'

type Props = {
    canWrite: boolean
}

function IdeEditor({ canWrite }: Props): JSX.Element {
    const presenceService = useService(PresenceService)
    const { tabs, activeId } = useTabs()
    const { notifications, notify, dismiss, clear } = useNotifications()

    const syncOfflinePopup = () => {
        if (navigator.onLine) {
            clear('offline')
        } else {
            notify('offline', 'error', 'Offline', true)
        }
    }

    useEffect(() => {
        syncOfflinePopup()
        window.addEventListener('offline', syncOfflinePopup)
        window.addEventListener('online', syncOfflinePopup)
        return () => {
            window.removeEventListener('offline', syncOfflinePopup)
            window.removeEventListener('online', syncOfflinePopup)
        }
    }, [syncOfflinePopup])

    useEffect(() => {
        if (tabs.length === 0) {
            presenceService.setLocation(null)
        }
    }, [tabs.length, presenceService])

    return (
        <div className='ide-editor-shell'>
            {tabs.length === 0 ? (
                <div className='ide-editor-empty'>Open a file to start editing</div>
            ) : (
                tabs.map((fileId) => (
                    <div
                        key={fileId}
                        className='ide-editor-container'
                        style={{ display: fileId === activeId ? 'flex' : 'none' }}
                    >
                        <CodeMirror
                            fileId={fileId}
                            isActive={fileId === activeId}
                            canWrite={canWrite}
                            onNotify={notify}
                        />
                    </div>
                ))
            )}
            <NotificationPopup notifications={notifications} onDismiss={dismiss} />
        </div>
    )
}

export default IdeEditor
