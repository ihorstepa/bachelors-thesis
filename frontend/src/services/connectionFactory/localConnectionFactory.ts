import { IndexeddbPersistence } from 'y-indexeddb'
import { Awareness } from 'y-protocols/awareness'
import { Doc } from 'yjs'

import type { Connection, ConnectionConfig } from '@/core/connectionFactory'
import { ConnectionFactory } from '@/core/connectionFactory'

class LocalConnectionFactory extends ConnectionFactory {
    private namespace: string

    public constructor(namespace = 'playground') {
        super()
        this.namespace = namespace
    }

    public async connect(
        room: string,
        { doc = new Doc(), autoconnect = true }: ConnectionConfig = {},
    ): Promise<Connection> {
        const awareness = new Awareness(doc)

        let idb: IndexeddbPersistence | null = null
        let synced = Promise.resolve()

        if (autoconnect) {
            idb = new IndexeddbPersistence(`${this.namespace}/${room}`, doc)
            synced = idb.whenSynced.then(() => undefined)
            await synced
        }

        const connect = () => {
            if (idb != null) {
                synced = idb.whenSynced.then(() => undefined)
                return
            }

            idb = new IndexeddbPersistence(`${this.namespace}/${room}`, doc)
            synced = idb.whenSynced.then(() => undefined)
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
            connect,
            disconnect,
            destroy,
        }
    }
}

export default LocalConnectionFactory
