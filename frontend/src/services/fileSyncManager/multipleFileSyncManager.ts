import { FileSyncManager } from '@/core/fileSyncManager'
import type { SharedFile } from '@/core/fileSyncManager'
import type { ConnectionFactory, Connection } from '@/core/connectionFactory'

class MultipleFileSyncManager extends FileSyncManager {
    private connectionFactory: ConnectionFactory
    private connections: Map<string, Connection> = new Map()

    public constructor(connectionFactory: ConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public destroy(): void {
        this.connections.forEach((connection) => connection.destroy())
        this.connections.clear()
    }

    public async openFile(id: string): Promise<SharedFile> {
        if (!this.connections.has(id)) {
            const connection = await this.connectionFactory.connect(id)
            this.connections.set(id, connection)
        }
        return this.connections.get(id)!
    }

    public closeFile(id: string): void {
        if (this.connections.has(id)) {
            this.connections.get(id)!.destroy()
            this.connections.delete(id)
        }
    }
}

export default MultipleFileSyncManager
