import { WebsocketProvider } from 'y-websocket'
import { Doc } from 'yjs'

import { WS_URL } from '@/config'
import { type Connection, type ConnectionConfig, ConnectionFactory } from '@/core/connectionFactory'
import type { Persistence, RoomCache } from '@/core/projectCache'

class WSConnectionFactory extends ConnectionFactory {
    private projectId: string
    private authToken: string
    private roomCache: RoomCache

    public constructor(projectId: string, authToken: string, roomCache: RoomCache) {
        super()
        this.projectId = projectId
        this.authToken = authToken
        this.roomCache = roomCache
    }

    public clearRoom(room: string): Promise<void> {
        return this.roomCache.clearRoom(room)
    }

    public async connect(
        room: string,
        { doc = new Doc(), autoconnect = true }: ConnectionConfig = {},
    ): Promise<Connection> {
        const idb: Persistence = this.roomCache.persist(room, doc)
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
