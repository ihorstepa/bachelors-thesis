import { IndexeddbPersistence } from 'y-indexeddb'
import type { Doc } from 'yjs'

import type { RoomCache } from '@/core/projectCache'
import { ProjectCache } from '@/core/projectCache'

class LocalProjectCache extends ProjectCache {
    public forScope(scope: string): RoomCache {
        return {
            persist: (room: string, doc: Doc) => new IndexeddbPersistence(`${scope}/${room}`, doc),
            clearRoom: (room: string) => this.deleteDatabase(`${scope}/${room}`),
        }
    }

    public async clearProject(projectId: string): Promise<void> {
        try {
            const dbs = await globalThis.indexedDB.databases()
            const prefix = `${projectId}/`
            const matching = dbs
                .map((db) => db.name)
                .filter((name): name is string => typeof name === 'string' && name.startsWith(prefix))
            await Promise.all(matching.map((name) => this.deleteDatabase(name)))
        } catch {
            // Fails are non-critical
        }
    }

    private deleteDatabase(name: string): Promise<void> {
        return new Promise((resolve) => {
            const req = globalThis.indexedDB.deleteDatabase(name)
            req.onsuccess = () => resolve()
            req.onerror = () => resolve()
        })
    }
}

export default LocalProjectCache
