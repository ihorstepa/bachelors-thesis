import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'

import { WS_URL } from '@/config.ts'

type Connection = {
    idb: IndexeddbPersistence
    ws: WebsocketProvider
}

class SyncManagementService {
    private connections: Map<string, Connection> = new Map()
    private projectId: string

    public constructor(projectId: string) {
        this.projectId = projectId
    }

    public async connect(room: string, doc?: Y.Doc): Promise<Y.Doc> {
        if (this.connections.has(room)) {
            this.disconnect(room)
        }

        const ydoc = doc ?? new Y.Doc()
        const idb = new IndexeddbPersistence(this.projectId, ydoc)
        await idb.whenSynced

        const ws = new WebsocketProvider(`${WS_URL}/${this.projectId}`, room, ydoc)
        this.connections.set(room, { idb, ws })

        return ydoc
    }

    public disconnect(room: string): void {
        const provider = this.connections.get(room)
        if (!provider) return

        const { idb, ws } = this.connections.get(room)!
        ws.disconnect()
        idb.destroy()
        idb.doc.destroy()
        this.connections.delete(room)
    }

    public disconnectAll(): void {
        this.connections.forEach(({ idb, ws }) => {
            ws.disconnect()
            idb.destroy()
            idb.doc.destroy()
        })
        this.connections.clear()
    }
}

export default SyncManagementService
