import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Doc } from 'yjs'

import { WS_URL } from '@/config'
import { ConnectionFactory } from '@/core/connectionFactory'
import type { Connection, ConnectionConfig } from '@/core/connectionFactory'

class WSConnectionFactory extends ConnectionFactory {
    public projectId: string

    public constructor(projectId: string) {
        super()
        this.projectId = projectId
    }

    public async connect(
        room: string,
        { doc = new Doc(), autoconnect = true }: ConnectionConfig = {},
    ): Promise<Connection> {
        const idb = new IndexeddbPersistence(`${this.projectId}/${room}`, doc)
        await idb.whenSynced

        const ws = new WebsocketProvider(`${WS_URL}/${this.projectId}`, room, doc, { connect: autoconnect })
        const awareness = ws.awareness

        let syncedResolve: () => void
        const createSyncedPromise = () =>
            new Promise<void>((resolve) => {
                syncedResolve = resolve
            })

        let synced = createSyncedPromise()
        ws.on('sync', (isSynced) => {
            if (isSynced) {
                syncedResolve()
            }
        })

        const connect = () => {
            synced = createSyncedPromise()
            ws.connect()
        }
        const disconnect = () => ws.disconnect()
        const destroy = () => {
            awareness.setLocalState(null)
            ws.destroy()
            idb.destroy()
        }

        return {
            room,
            doc,
            awareness,
            get synced() {
                return synced
            },
            connect,
            disconnect,
            destroy,
        }
    }
}

export default WSConnectionFactory
