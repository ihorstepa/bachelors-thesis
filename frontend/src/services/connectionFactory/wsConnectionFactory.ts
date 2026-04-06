import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Doc } from 'yjs'

import { WS_URL } from '@/config'
import { ConnectionFactory } from '@/core/connectionFactory'
import type { Connection, ConnectionConfig } from '@/core/connectionFactory'

class WSConnectionFactory extends ConnectionFactory {
    public projectId: string
    private authToken: string

    public constructor(projectId: string, authToken: string) {
        super()
        this.projectId = projectId
        this.authToken = authToken
    }

    public async connect(
        room: string,
        { doc = new Doc(), autoconnect = true }: ConnectionConfig = {},
    ): Promise<Connection> {
        const idb = new IndexeddbPersistence(`${this.projectId}/${room}`, doc)
        await idb.whenSynced

        const ws = new WebsocketProvider(`${WS_URL}/${this.projectId}`, room, doc, {
            connect: autoconnect,
            params: {
                auth: this.authToken,
            },
        })
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
