import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { VscClose } from 'react-icons/vsc'

import type { Notification } from '@/components/IdeEditor/useNotifications'

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
        const timeoutById = timeoutByIdRef.current
        return () => {
            timeoutById.forEach((timeoutId) => clearTimeout(timeoutId))
            timeoutById.clear()
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
