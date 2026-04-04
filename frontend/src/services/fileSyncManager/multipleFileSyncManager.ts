import { FileSyncManager } from '@/core/fileSyncManager'
import type { SharedFile } from '@/core/fileSyncManager'
import type { ConnectionFactory, Connection } from '@/core/connectionFactory'

// TODO: close on delete?
// TODO: check file existance
class MultipleFileSyncManager extends FileSyncManager {
    private connectionFactory: ConnectionFactory
    private connections: Map<string, Connection> = new Map()
    private refCounts: Map<string, number> = new Map()

    public constructor(connectionFactory: ConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public destroy(): void {
        this.connections.forEach((connection) => connection.destroy())
        this.connections.clear()
        this.refCounts.clear()
    }

    public async openFile(id: string): Promise<SharedFile> {
        if (!this.connections.has(id)) {
            const connection = await this.connectionFactory.connect(id)
            this.connections.set(id, connection)
            this.refCounts.set(id, 0)
        }
        const current = this.refCounts.get(id) ?? 0
        this.refCounts.set(id, current + 1)
        return this.connections.get(id)!
    }

    public closeFile(id: string): void {
        if (this.connections.has(id)) {
            const current = this.refCounts.get(id) ?? 0
            if (current <= 1) {
                this.connections.get(id)!.destroy()
                this.connections.delete(id)
                this.refCounts.delete(id)
                return
            }
            this.refCounts.set(id, current - 1)
        }
    }
}

export default MultipleFileSyncManager
