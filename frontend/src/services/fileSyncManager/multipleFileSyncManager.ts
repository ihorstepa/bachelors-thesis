import { FileSyncManager } from '@/core/fileSyncManager'
import type { SharedFile } from '@/core/fileSyncManager'
import type { ConnectionFactory, Connection } from '@/core/connectionFactory'

class MultipleFileSyncManager extends FileSyncManager {
    private connectionFactory: ConnectionFactory
    private connections: Map<string, Connection> = new Map()
    private activeId: string | null = null

    public constructor(connectionFactory: ConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public destroy(): void {
        this.connections.forEach((connection) => connection.destroy())
        this.connections.clear()
        this.activeId = null
    }

    public async openFile(id: string): Promise<SharedFile> {
        if (this.activeId === id) {
            return this.connections.get(id)!
        }
        // TODO: fix or remove this
        if (this.activeId !== null) {
            // this.connections.get(this.activeId)!.disconnect()
        }
        if (this.connections.has(id)) {
            // await this.connections.get(id)!.connect()
        } else {
            const connection = await this.connectionFactory.connect(id)
            this.connections.set(id, connection)
        }
        this.activeId = id
        return this.connections.get(id)!
    }

    public closeFile(id: string): void {
        if (this.connections.has(id)) {
            this.connections.get(id)!.destroy()
            this.connections.delete(id)
        }
        if (this.activeId === id) {
            this.activeId = null
        }
    }

    public getActiveFile(): SharedFile | null {
        if (!this.activeId) return null
        return this.connections.get(this.activeId) || null
    }
}

export default MultipleFileSyncManager
