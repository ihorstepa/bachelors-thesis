import { IFileSyncManager } from '@/core/interfaces/fileSyncManager'
import type { SharedFile } from '@/core/interfaces/fileSyncManager'
import type { IConnectionFactory, Connection } from '@/core/interfaces/connectionFactory'

class MultipleFileSyncManager extends IFileSyncManager {
    private connectionFactory: IConnectionFactory
    private connections: Map<string, Connection> = new Map()
    private activeId: string | null = null

    public constructor(connectionFactory: IConnectionFactory) {
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
            console.log('files open', this.connections.size)
            return this.connections.get(id)!
        }
        // TODO: fix or rework this
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
        console.log('files open', this.connections.size)
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
        console.log('files open', this.connections.size)
    }

    public getActiveFile(): SharedFile | null {
        if (!this.activeId) return null
        return this.connections.get(this.activeId) || null
    }
}

export default MultipleFileSyncManager
