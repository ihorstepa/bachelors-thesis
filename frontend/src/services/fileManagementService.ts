import * as Y from 'yjs'

import syncManagementService from '@/services/syncManagementService.ts'
import { isValidNodeName } from '@/utils/validators.ts'

type NodeType = 'file' | 'dir'

type NullableString = string | null

type NodeMeta = {
    id: string
    name: string
    type: NodeType
    parentId: NullableString
}

class FileManagementService {
    private rootDoc: Y.Doc
    private docsMap: Y.Map<Y.Doc>
    private metaMap: Y.Map<NodeMeta>
    private index: Map<NullableString, Set<string>> = new Map()
    private openFiles: Set<string> = new Set()

    private constructor(rootDoc: Y.Doc) {
        this.rootDoc = rootDoc
        this.docsMap = rootDoc.getMap('docs') as Y.Map<Y.Doc>
        this.metaMap = rootDoc.getMap('meta') as Y.Map<NodeMeta>
        this.buildIndex()
    }

    public static async build(syncService: syncManagementService): Promise<FileManagementService> {
        const rootDoc = await syncService.connect('__root__')
        return new FileManagementService(rootDoc)
    }

    public destroy(): void {
        // TODO
    }

    public open(id: string) {
        // TODO
    }

    public close(id: string) {
        // TODO
    }

    public create(name: string, type: NodeType, parentId: NullableString): string {
        if (!isValidNodeName(name)) {
            throw new Error(`Invalid node name: ${name}`)
        }
        const doc = new Y.Doc()
        const id = doc.guid
        this.rootDoc.transact(() => {
            this.metaMap.set(id, { id, name, type, parentId })
            if (type === 'file') {
                this.docsMap.set(id, doc)
            }
        })
        return id
    }

    public delete(id: string): void {
        // TODO
    }

    public rename(id: string, newName: string): void {
        // TODO
    }

    public move(id: string, newParentId: string): void {
        // TODO
    }

    public getFileTree() {
        // TODO
    }

    private buildIndex(): void {
        this.index.clear()
        for (const [key, _] of this.metaMap) {
            const parentKey = this.metaMap.get(key)!.parentId
            this.addToIndex(key, parentKey)
        }

        this.metaMap.observe((event) => {
            event.changes.keys.forEach((change, key) => {
                const parentKey = (change.oldValue as NodeMeta).parentId
                switch (change.action) {
                    case 'add': {
                        this.addToIndex(key, parentKey)
                        break
                    }
                    case 'update': {
                        const newParentKey = this.metaMap.get(key)!.parentId
                        if (parentKey !== newParentKey) {
                            this.removeFromIndex(key, parentKey)
                            this.addToIndex(key, newParentKey)
                        }
                        break
                    }
                    case 'delete': {
                        const parentKey = (change.oldValue as NodeMeta).parentId
                        this.removeFromIndex(key, parentKey)
                        break
                    }
                }
            })
        })
    }

    private addToIndex(key: string, parentKey: NullableString): void {
        if (!this.index.has(parentKey)) {
            this.index.set(parentKey, new Set())
        }
        this.index.get(parentKey)!.add(key)
    }

    private removeFromIndex(key: string, parentKey: NullableString): void {
        this.index.get(parentKey)!.delete(key)
    }
}

export default FileManagementService
