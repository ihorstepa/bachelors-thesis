import { useCallback, useState } from 'react'

export type Notification = {
    id: string
    source: 'char-limit' | 'offline'
    type: 'error' | 'warning'
    message: string
    persistent?: boolean
}

export type NotifyFn = (
    source: Notification['source'],
    type: Notification['type'],
    message: string,
    persistent?: boolean,
) => void

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const notify = useCallback<NotifyFn>((source, type, message, persistent = false) => {
        const id = `${Date.now()}-${Math.random()}`
        setNotifications((prev) => [
            ...prev.filter((n) => n.source !== source),
            { id, source, type, message, persistent },
        ])
    }, [])

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, [])

    const clear = useCallback((source: Notification['source']) => {
        setNotifications((prev) => prev.filter((n) => n.source !== source))
    }, [])

    return { notifications, notify, dismiss, clear }
}
