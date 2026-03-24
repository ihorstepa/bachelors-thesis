import { IFileSyncManager } from '@/core/interfaces/fileSyncManager'
import type { SharedFile } from '@/core/interfaces/fileSyncManager'
import type { IConnectionFactory, Connection } from '@/core/interfaces/connectionFactory'

class FileSyncManager extends IFileSyncManager {
    private connectionFactory: IConnectionFactory
    private connection: Connection | null = null

    public constructor(connectionFactory: IConnectionFactory) {
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

export default FileSyncManager
