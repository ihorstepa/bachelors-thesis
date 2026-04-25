import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { VscClose } from 'react-icons/vsc'

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

type Props = {
    notifications: Notification[]
    onDismiss: (id: string) => void
}

function NotificationPopup({ notifications, onDismiss }: Props): JSX.Element {
    const timeoutByIdRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())

    useEffect(() => {
        const activeIds = new Set(notifications.map((notification) => notification.id))

        // Clear timers for notifications that were dismissed/replaced.
        timeoutByIdRef.current.forEach((timeoutId, id) => {
            if (!activeIds.has(id)) {
                clearTimeout(timeoutId)
                timeoutByIdRef.current.delete(id)
            }
        })

        notifications.forEach((notification) => {
            if (notification.persistent || timeoutByIdRef.current.has(notification.id)) {
                return
            }

            const timeoutId = setTimeout(() => {
                timeoutByIdRef.current.delete(notification.id)
                onDismiss(notification.id)
            }, 3000)

            timeoutByIdRef.current.set(notification.id, timeoutId)
        })
    }, [notifications, onDismiss])

    useEffect(() => {
        return () => {
            timeoutByIdRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
            timeoutByIdRef.current.clear()
        }
    }, [])

    return (
        <div className='notification-stack'>
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`notification-popup notification-${notification.type}`}
                    role='status'
                    aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
                >
                    <div className='notification-content'>{notification.message}</div>
                    {!notification.persistent && (
                        <button
                            className='notification-dismiss'
                            onClick={() => onDismiss(notification.id)}
                            aria-label='Dismiss notification'
                        >
                            <VscClose />
                        </button>
                    )}
                </div>
            ))}
        </div>
    )
}

export default NotificationPopup
