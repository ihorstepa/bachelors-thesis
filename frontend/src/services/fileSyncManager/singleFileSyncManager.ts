import { FileSyncManager } from '@/core/fileSyncManager'
import type { SharedFile } from '@/core/fileSyncManager'
import type { ConnectionFactory, Connection } from '@/core/connectionFactory'

class SingleFileSyncManager extends FileSyncManager {
    private connectionFactory: ConnectionFactory
    private connection: Connection | null = null

    public constructor(connectionFactory: ConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public destroy(): void {
        if (this.connection) {
            this.connection.destroy()
        }
    }

    public async openFile(id: string): Promise<SharedFile> {
        if (this.connection?.doc.guid === id) {
            return this.connection
        }
        this.connection?.destroy()
        this.connection = await this.connectionFactory.connect(id)
        return this.connection
    }

    public closeFile(id: string): void {
        if (this.connection?.room === id) {
            this.connection.destroy()
            this.connection = null
        }
    }

    public getActiveFile(): SharedFile | null {
        return this.connection
    }
}

export default SingleFileSyncManager
