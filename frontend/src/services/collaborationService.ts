import type { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

import { WS_URL } from '@/config.ts'

export type CollaborationSession = {
    readonly text: Y.Text
    readonly awareness: Awareness
}

class CollaborationService {
    private sessions = new Map<string, WebsocketProvider>()

    public connect(room: string): CollaborationSession {
        if (this.sessions.has(room)) {
            return this.constructSession(this.sessions.get(room)!)
        }

        const ydoc = new Y.Doc()
        const provider = new WebsocketProvider(WS_URL, room, ydoc)
        const session = this.constructSession(provider)
        this.sessions.set(room, provider)

        return session
    }

    public disconnect(room: string) {
        const provider = this.sessions.get(room)
        if (!provider) return

        provider.disconnect()
        provider.doc.destroy()
        this.sessions.delete(room)
    }

    public disconnectAll() {
        this.sessions.forEach((provider) => {
            provider.disconnect()
            provider.doc.destroy()
        })
        this.sessions.clear()
    }

    private constructSession(provider: WebsocketProvider): CollaborationSession {
        return {
            text: provider.doc.getText('content'),
            awareness: provider.awareness,
        }
    }
}

export default new CollaborationService()
