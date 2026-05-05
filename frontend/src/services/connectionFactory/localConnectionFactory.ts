import { Awareness } from 'y-protocols/awareness'
import { Doc } from 'yjs'

import { type Connection, type ConnectionConfig, ConnectionFactory } from '@/core/connectionFactory'
import type { Persistence, RoomCache } from '@/core/projectCache'

class LocalConnectionFactory extends ConnectionFactory {
    private roomCache: RoomCache

    public constructor(roomCache: RoomCache) {
        super()
        this.roomCache = roomCache
    }

    public clearRoom(room: string): Promise<void> {
        return this.roomCache.clearRoom(room)
    }

    public async connect(
        room: string,
        { doc = new Doc(), autoconnect = true }: ConnectionConfig = {},
    ): Promise<Connection> {
        const awareness = new Awareness(doc)
        let idb: Persistence | null = null
        let synced: Promise<void> = Promise.resolve()

        const openIdb = () => {
            if (idb == null) {
                idb = this.roomCache.persist(room, doc)
            }
            synced = idb.whenSynced.then(() => undefined)
        }

        if (autoconnect) {
            openIdb()
            await synced
        }

        const disconnect = () => {
            idb?.destroy()
            idb = null
        }

        const destroy = () => {
            awareness.setLocalState(null)
            disconnect()
            awareness.destroy()
        }

        return {
            room,
            doc,
            awareness,
            get synced() {
                return synced
            },
            connect: openIdb,
            disconnect,
            destroy,
        }
    }
}

export default LocalConnectionFactory
