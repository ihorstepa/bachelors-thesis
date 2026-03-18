import * as Y from 'yjs'

import syncManagementService from '@/services/syncManagementService.ts'
import { validateFileName } from '@/utils/validators.ts'
import type { NullableString } from '@/types/generalTypes.ts'
import * as fileErrors from '@/errors/fileErrors.ts'

type NodeType = 'file' | 'dir'

type NodeMeta = {
    id: string
    name: string
    type: NodeType
    parentId: NullableString
}

class FileManagementService {
    private syncService: syncManagementService
    private rootDoc: Y.Doc
    private docsMap: Y.Map<Y.Doc>
    private metaMap: Y.Map<NodeMeta>
    private index: Map<NullableString, Set<string>> = new Map()
    private openFiles: Set<string> = new Set()

    private static readonly rootId: string = '__root__'

    private constructor(syncService: syncManagementService, rootDoc: Y.Doc) {
        this.syncService = syncService
        this.rootDoc = rootDoc
        this.docsMap = rootDoc.getMap('docs') as Y.Map<Y.Doc>
        this.metaMap = rootDoc.getMap('meta') as Y.Map<NodeMeta>
        this.buildIndex()
    }

    public static async build(syncService: syncManagementService): Promise<FileManagementService> {
        const rootDoc = await syncService.connect(this.rootId)
        return new FileManagementService(syncService, rootDoc)
    }

    public destroy(): void {
        for (const id of this.openFiles) {
            this.close(id)
        }
        this.syncService.disconnect(FileManagementService.rootId)
    }

    public open(id: string) {
        // TODO
    }

    public close(id: string) {
        // TODO
    }

    public create(name: string, type: NodeType, parentId: NullableString): string {
        const validationResult = validateFileName(name)
        if (!validationResult.valid) {
            throw new fileErrors.InvalidNodeNameError(name, validationResult.msg)
        }
        if (parentId !== null) {
            if (!this.metaMap.has(parentId)) {
                throw new fileErrors.NodeNotFoundError(parentId)
            }
            if (this.metaMap.get(parentId)!.type !== 'dir') {
                throw new fileErrors.InvalidParentError(parentId)
            }
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
        if (!this.metaMap.has(id)) {
            throw new fileErrors.NodeNotFoundError(id)
        }
        this.rootDoc.transact(() => {
            this.deleteRecursive(id)
        })
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

    private deleteRecursive(id: string): void {
        if (this.metaMap.get(id)!.type === 'file') {
            this.metaMap.delete(id)
            this.docsMap.delete(id)
            // this.openFiles.delete(id)
            return
        }
        if (this.index.has(id)) {
            const children = this.index.get(id)!
            for (const child of children) {
                this.deleteRecursive(child)
            }
        }
        this.deleteRecursive(id)
    }

    private buildIndex(): void {
        this.index.clear()
        for (const key of this.metaMap.keys()) {
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
