import { FileSyncManager } from '@/core/fileSyncManager'
import type { SharedFile } from '@/core/fileSyncManager'
import type { ConnectionFactory, Connection } from '@/core/connectionFactory'

class MultipleFileSyncManager extends FileSyncManager {
    private connectionFactory: ConnectionFactory
    private connections: Map<string, Connection> = new Map()
    private pendingConnections: Map<string, Promise<Connection>> = new Map()
    private refCounts: Map<string, number> = new Map()
    private destroyed = false

    public constructor(connectionFactory: ConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public destroy(): void {
        this.destroyed = true
        this.connections.forEach((connection) => connection.destroy())
        this.pendingConnections.clear()
        this.connections.clear()
        this.refCounts.clear()
    }

    public async openFile(id: string): Promise<SharedFile> {
        const current = this.refCounts.get(id) ?? 0
        this.refCounts.set(id, current + 1)

        const existing = this.connections.get(id)
        if (existing) {
            return existing
        }

        let pending = this.pendingConnections.get(id)
        if (!pending) {
            pending = this.connectionFactory.connect(id)
            this.pendingConnections.set(id, pending)
        }

        const connection = await pending
        if (!this.pendingConnections.has(id)) {
            return connection
        }
        this.pendingConnections.delete(id)

        const refs = this.refCounts.get(id) ?? 0
        if (this.destroyed || refs <= 0) {
            connection.destroy()
            if (refs <= 0) {
                this.refCounts.delete(id)
            }
            return connection
        }

        const currentConnection = this.connections.get(id)
        if (currentConnection) {
            connection.destroy()
            return currentConnection
        }

        this.connections.set(id, connection)
        return connection
    }

    public closeFile(id: string): void {
        const current = this.refCounts.get(id) ?? 0
        if (current <= 1) {
            const connection = this.connections.get(id)
            if (connection) {
                connection.destroy()
                this.connections.delete(id)
            }
            if (this.pendingConnections.has(id)) {
                this.refCounts.set(id, 0)
            } else {
                this.refCounts.delete(id)
            }
            return
        }
        this.refCounts.set(id, current - 1)
    }
}

export default MultipleFileSyncManager
