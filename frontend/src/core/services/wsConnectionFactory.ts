import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Doc } from 'yjs'

import { WS_URL } from '@/config'
import { IConnectionFactory } from '@/core/interfaces/connectionFactory'
import type { Connection, ConnectionConfig } from '@/core/interfaces/connectionFactory'

class WSConnectionFactory extends IConnectionFactory {
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
        const synced = new Promise<void>((resolve) => {
            ws.on('sync', () => {
                console.log('synced', room)
                resolve()
            })
        })

        const connect = () => ws.connect()
        const disconnect = () => ws.disconnect()
        const destroy = () => {
            console.log('destroying', room)
            awareness.setLocalState(null)
            ws.destroy()
            idb.destroy()
        }

        console.log('connected to', room)

        return { room, doc, awareness, synced, connect, disconnect, destroy }
    }
}

export default WSConnectionFactory
