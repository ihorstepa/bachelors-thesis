import * as Y from 'yjs'

import * as err from '@/errors/fileSystem'
import { validateNodeName } from '@/utils/validators'
import { IFileSystemManager } from '@/core/interfaces/fileSystemManager'
import type { NodeMeta, NodeType } from '@/core/interfaces/fileSystemManager'
import type { NullableString } from '@/utils/types'
import type { IConnectionFactory, Connection } from '@/core/interfaces/connectionFactory'

type IndexEntry = {
    ids: Set<string>
    names: Set<string>
}

class FileSystemManager extends IFileSystemManager {
    private connectionFactory: IConnectionFactory
    private connection: Connection | null = null
    private rootDoc: Y.Doc = new Y.Doc()
    private metaMap: Y.Map<NodeMeta> = new Y.Map()
    private index: Map<NullableString, IndexEntry> = new Map()

    private static readonly rootId: string = '__root__'

    public constructor(connectionFactory: IConnectionFactory) {
        super()
        this.connectionFactory = connectionFactory
    }

    public async init(): Promise<void> {
        this.connection = await this.connectionFactory.connect(FileSystemManager.rootId)
        await this.connection.synced

        this.rootDoc = this.connection.doc
        this.metaMap = this.rootDoc.getMap('meta') as Y.Map<NodeMeta>

        this.buildIndex()
    }

    public destroy(): void {
        this.connection?.disconnect()
    }

    public create(name: string, type: NodeType, parentId: NullableString): string {
        this.assertValidName(name)
        this.assertValidParent(parentId)
        this.assertNoNameConflict(parentId, name)

        const id = crypto.randomUUID()
        this.metaMap.set(id, { id, name, type, parentId })

        return id
    }

    public remove(id: string): void {
        const traverse = (id: string) => {
            const meta = this.requireMeta(id)
            if (meta.type === 'dir') {
                ;[...this.requireIndex(id).ids].forEach((childId) => traverse(childId))
            }
            this.metaMap.delete(id)
        }

        this.rootDoc.transact(() => traverse(id))
    }

    public rename(id: string, name: string): void {
        const node = this.requireMeta(id)
        if (node.name === name) return

        this.assertValidName(name)
        this.assertNoNameConflict(node.parentId, name)

        this.metaMap.set(id, { ...node, name })
    }

    public move(nodeId: string, parentId: NullableString): void {
        const node = this.requireMeta(nodeId)
        if (node.parentId === parentId) return

        this.assertValidParent(parentId)
        if (nodeId === parentId) {
            throw new err.InvalidParentError(parentId)
        }
        if (node.type === 'dir' && parentId !== null) {
            let current: NullableString = parentId
            while (current !== null) {
                if (current === nodeId) {
                    throw new err.CircularMoveError(parentId)
                }
                current = this.requireMeta(current).parentId
            }
        }
        this.assertNoNameConflict(parentId, node.name)

        this.metaMap.set(nodeId, { ...node, parentId })
    }

    public exists(id: string): boolean {
        return this.metaMap.has(id)
    }

    public getMeta(id: string): NodeMeta {
        return this.requireMeta(id)
    }

    public getChildrenMeta(id: NullableString): NodeMeta[] {
        if (id !== null) {
            this.requireMeta(id)
        }
        return [...this.requireIndex(id).ids].map((id) => this.requireMeta(id))
    }

    private buildIndex(): void {
        this.index.clear()
        this.ensureIndex(null)

        for (const meta of this.metaMap.values()) {
            this.addToIndex(meta)
        }

        this.metaMap.observe((event) => {
            event.changes.keys.forEach((change, key) => {
                if (change.action !== 'add') {
                    this.removeFromIndex(change.oldValue as NodeMeta)
                }
                if (change.action !== 'delete') {
                    this.addToIndex(this.metaMap.get(key)!)
                }
            })
            this.notifyObservers()
        })
    }

    private addToIndex({ id, name, type, parentId }: NodeMeta): void {
        if (type === 'dir') {
            this.ensureIndex(id)
        }
        const entry = this.ensureIndex(parentId)
        entry.ids.add(id)
        entry.names.add(name)
    }

    private removeFromIndex({ id, name, parentId }: NodeMeta): void {
        const entry = this.index.get(parentId)
        if (!entry) return
        entry.ids.delete(id)
        entry.names.delete(name)
    }

    private ensureIndex(id: NullableString): IndexEntry {
        if (!this.index.has(id)) {
            this.index.set(id, { ids: new Set(), names: new Set() })
        }
        return this.index.get(id)!
    }

    private requireIndex(id: NullableString): IndexEntry {
        const entry = this.index.get(id)
        if (!entry) {
            throw new err.MissingIndexError(id)
        }
        return entry
    }

    private requireMeta(id: string): NodeMeta {
        const meta = this.metaMap.get(id)
        if (!meta) {
            throw new err.NodeNotFoundError(id)
        }
        return meta
    }

    private assertValidName(name: string): void {
        const result = validateNodeName(name)
        if (!result.valid) {
            throw new err.InvalidNodeNameError(name, result.msg)
        }
    }

    private assertValidParent(parentId: NullableString): void {
        if (parentId === null) return

        const parent = this.metaMap.get(parentId)
        if (!parent) {
            throw new err.NodeNotFoundError(parentId)
        }
        if (parent.type !== 'dir') {
            throw new err.InvalidParentError(parentId)
        }
    }

    private assertNoNameConflict(parentId: NullableString, name: string): void {
        if (this.index.get(parentId)?.names.has(name)) {
            throw new err.NodeNameConflictError(name)
        }
    }
}

export default FileSystemManager
