import { vi } from 'vitest'
import * as Y from 'yjs'

import { FileSyncManager, type SharedFile } from '@/core/fileSyncManager'
import { FileSystemManager, type NodeMeta, type NodeType } from '@/core/fileSystemManager'
import { type FileLocation, ProjectIndexService } from '@/core/projectIndexService'
import { TabManager } from '@/core/tabManager'
import CppCodeRunner from '@/services/codeRunner/cppCodeRunner'
import type { WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'

export function deferred<T>(): {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
} {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((innerResolve, innerReject) => {
        resolve = innerResolve
        reject = innerReject
    })
    return { promise, resolve, reject }
}

export class MockWorker {
    public static instances: MockWorker[] = []

    public onmessage: ((event: MessageEvent<WorkerOutMessage>) => void) | null = null
    public onerror: ((event: ErrorEvent) => void) | null = null
    public readonly messages: WorkerInMessage[] = []
    public readonly postMessage = vi.fn((message: WorkerInMessage): void => {
        this.messages.push(message)
    })
    public readonly terminate = vi.fn((): void => {})

    public constructor(...args: unknown[]) {
        void args
        MockWorker.instances.push(this)
    }

    public dispatchMessage(message: WorkerOutMessage): void {
        this.onmessage?.({ data: message } as MessageEvent<WorkerOutMessage>)
    }

    public dispatchError(message: string): void {
        this.onerror?.({ message } as ErrorEvent)
    }

    public static reset(): void {
        MockWorker.instances = []
    }
}

type FileState = {
    doc: Y.Doc
    synced: Promise<void>
    openCount: number
    closeCount: number
}

export class MockFileSyncManager extends FileSyncManager {
    private files = new Map<string, FileState>()

    public registerFile(id: string, content: string, synced: Promise<void> = Promise.resolve()): void {
        const doc = new Y.Doc()
        doc.getText().insert(0, content)
        this.files.set(id, { doc, synced, openCount: 0, closeCount: 0 })
    }

    public async openFile(id: string): Promise<SharedFile> {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        file.openCount += 1
        return { doc: file.doc, awareness: {} as SharedFile['awareness'], synced: file.synced }
    }

    public closeFile(id: string): void {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        file.closeCount += 1
    }

    public getText(id: string): string {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        return file.doc.getText().toString()
    }

    public replaceText(id: string, content: string): void {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)

        const text = file.doc.getText()
        file.doc.transact(() => {
            if (text.length > 0) text.delete(0, text.length)
            text.insert(0, content)
        })
    }

    public getCloseCount(id: string): number {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        return file.closeCount
    }
}

export class MockFileSystemManager extends FileSystemManager {
    private nodes = new Map<string, NodeMeta>()
    private nextId = 1

    public constructor(private readonly fileSyncManager: MockFileSyncManager) {
        super()
    }

    public addRootFile(name: string, content: string): string {
        const id = `root-${this.nextId++}`
        const meta: NodeMeta = { id, name, type: 'file', parentId: null }
        this.nodes.set(id, meta)
        this.fileSyncManager.registerFile(id, content)
        return id
    }

    public create(name: string, type: NodeType, parentId: string | null): string {
        const id = `node-${this.nextId++}`
        const meta: NodeMeta = { id, name, type, parentId }
        this.nodes.set(id, meta)
        if (type === 'file') this.fileSyncManager.registerFile(id, '')
        this.emit('create', meta)
        this.emit('change')
        return id
    }

    public delete(id: string): void {
        const meta = this.getMeta(id)
        this.nodes.delete(id)
        this.emit('delete', meta)
        this.emit('change')
    }

    public rename(id: string, name: string): void {
        const meta = this.getMeta(id)
        this.nodes.set(id, { ...meta, name })
        this.emit('rename', id, meta.name, name)
        this.emit('change')
    }

    public move(nodeId: string, parentId: string | null): void {
        const meta = this.getMeta(nodeId)
        this.nodes.set(nodeId, { ...meta, parentId })
        this.emit('move', nodeId, meta.parentId, parentId)
        this.emit('change')
    }

    public copy(nodeId: string, targetParentId: string | null): string {
        void nodeId
        void targetParentId
        throw new Error('Not implemented in test double')
    }

    public exists(id: string): boolean {
        return this.nodes.has(id)
    }

    public getMeta(id: string): NodeMeta {
        const meta = this.nodes.get(id)
        if (!meta) throw new Error(`Unknown node: ${id}`)
        return meta
    }

    public getChildrenMeta(parentId: string | null): NodeMeta[] {
        return Array.from(this.nodes.values()).filter((node) => node.parentId === parentId)
    }

    public getRootConnection(): never {
        throw new Error('Not implemented in test double')
    }
}

export class MockProjectIndexService extends ProjectIndexService {
    private files: FileLocation[] = []

    public addFile(location: FileLocation): void {
        this.files.push(location)
    }

    public getAllFilePaths(): FileLocation[] {
        return [...this.files]
    }

    public getPathById(id: string): string | null {
        return this.files.find((file) => file.id === id)?.path ?? null
    }
}

export class MockTabManager extends TabManager {
    public readonly opened: string[] = []

    public getTabs(): readonly string[] {
        return this.opened
    }

    public getActiveId(): string | null {
        return this.opened.at(-1) ?? null
    }

    public open(id: string): void {
        this.opened.push(id)
        this.emit('change')
        this.emit('activeChange', id)
    }

    public reorder(fromIndex: number, toIndex: number): void {
        void fromIndex
        void toIndex
    }

    public close(id: string): void {
        const index = this.opened.indexOf(id)
        if (index >= 0) this.opened.splice(index, 1)
        this.emit('change')
        this.emit('activeChange', this.getActiveId())
    }

    public closeAll(): void {
        this.opened.length = 0
        this.emit('change')
        this.emit('activeChange', null)
    }
}

export type Harness = ReturnType<typeof createHarness>

export function createHarness() {
    const fileSyncManager = new MockFileSyncManager()
    const fileSystemManager = new MockFileSystemManager(fileSyncManager)
    const projectIndexService = new MockProjectIndexService()
    const tabManager = new MockTabManager()
    const runner = new CppCodeRunner(fileSystemManager, fileSyncManager, projectIndexService, tabManager)

    return { runner, fileSyncManager, fileSystemManager, projectIndexService, tabManager }
}

export function addProjectFile(
    harness: Harness,
    path: string,
    content: string,
    synced: Promise<void> = Promise.resolve(),
): string {
    const id = `project-${harness.projectIndexService.getAllFilePaths().length + 1}`
    harness.fileSyncManager.registerFile(id, content, synced)
    harness.projectIndexService.addFile({ id, path })
    return id
}

export function decodeBytes(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes)
}
