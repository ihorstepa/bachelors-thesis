import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'

import type { SharedFile } from '@/core/fileSyncManager'
import { FileSyncManager } from '@/core/fileSyncManager'
import type { PresenceEntry, UserStatus } from '@/core/presenceService'
import { PresenceService } from '@/core/presenceService'
import type { FileLocation } from '@/core/projectIndexService'
import { ProjectIndexService } from '@/core/projectIndexService'
import { TabManager } from '@/core/tabManager'
import CppLanguageServerManager from '@/services/languageServer/cppLanguageServerManager'

class MockWorker {
    public static instances: MockWorker[] = []

    public onmessage: ((event: MessageEvent<unknown>) => void) | null = null
    public onerror: ((event: ErrorEvent) => void) | null = null

    public readonly postMessage = vi.fn((message: unknown) => {
        void message
    })
    public readonly terminate = vi.fn()

    public constructor(url: URL, options: WorkerOptions) {
        void url
        void options
        MockWorker.instances.push(this)
    }

    public dispatchMessage(message: unknown): void {
        this.onmessage?.({ data: message } as MessageEvent<unknown>)
    }

    public static reset(): void {
        MockWorker.instances = []
    }
}

class MockFileSyncManager extends FileSyncManager {
    private readonly files = new Map<string, SharedFile>()
    public readonly openFile = vi.fn(async (id: string): Promise<SharedFile> => {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        return file
    })
    public readonly closeFile = vi.fn((id: string): void => {
        void id
    })

    public setFile(id: string, content: string): void {
        const doc = new Y.Doc()
        doc.getText().insert(0, content)
        this.files.set(id, {
            doc,
            awareness: {} as SharedFile['awareness'],
            synced: Promise.resolve(),
        })
    }

    public setText(id: string, nextContent: string): void {
        const file = this.files.get(id)
        if (!file) throw new Error(`Unknown file: ${id}`)
        const text = file.doc.getText()
        text.delete(0, text.length)
        text.insert(0, nextContent)
    }
}

class MockProjectIndexService extends ProjectIndexService {
    public files: FileLocation[] = []

    public getAllFilePaths(): FileLocation[] {
        return [...this.files]
    }

    public getPathById(id: string): string | null {
        return this.files.find((file) => file.id === id)?.path ?? null
    }

    public triggerChange(): void {
        this.emit('change')
    }
}

class MockPresenceService extends PresenceService {
    public users: PresenceEntry[] = []

    public setLocation(fileId: string | null): UserStatus {
        return { name: 'me', color: '#fff', activeFileId: fileId }
    }

    public getUsersInBranch(): PresenceEntry[] {
        return [...this.users]
    }

    public getOnlineUsers(): PresenceEntry[] {
        return [...this.users]
    }

    public triggerChange(): void {
        this.emit('change')
    }
}

class MockTabManager extends TabManager {
    private activeId: string | null = null

    public setActive(id: string | null): void {
        this.activeId = id
        this.emit('activeChange', id)
    }

    public getTabs(): readonly string[] {
        return []
    }

    public getActiveId(): string | null {
        return this.activeId
    }

    public open(): void {}
    public reorder(): void {}
    public close(): void {}
    public closeAll(): void {}
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
}

describe('services/languageServer/CppLanguageServerManager', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.stubGlobal('Worker', MockWorker)
        MockWorker.reset()
    })

    it('queues sync messages before worker ready, flushes on ready, and resolves document URIs', async () => {
        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f1', 'int main(){}')

        const index = new MockProjectIndexService()
        index.files = [{ id: 'f1', path: 'src/main.cpp' }]

        const presence = new MockPresenceService()
        const tabs = new MockTabManager()
        tabs.setActive('f1')

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        await flushMicrotasks()

        expect(worker.postMessage).not.toHaveBeenCalled()

        worker.dispatchMessage({ type: 'ready' })

        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'sync',
            path: 'src/main.cpp',
            content: 'int main(){}',
        })
        expect(manager.getDocumentUri('f1')).toBe('file:///project/src/main.cpp')

        manager.destroy()
    })

    it('emits JSON-stringified LSP worker messages to observers', async () => {
        const fileSync = new MockFileSyncManager()
        const index = new MockProjectIndexService()
        const presence = new MockPresenceService()
        const tabs = new MockTabManager()

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        const onMessage = vi.fn()
        manager.on('message', onMessage)

        worker.dispatchMessage({ type: 'lsp', payload: { method: 'test', value: 123 } })

        expect(onMessage).toHaveBeenCalledWith('{"method":"test","value":123}')

        manager.destroy()
    })

    it('debounces collaborator edits and sends sync only after delay', async () => {
        vi.useFakeTimers()

        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f2', 'int x = 1;')

        const index = new MockProjectIndexService()
        index.files = [{ id: 'f2', path: 'src/lib.cpp' }]

        const presence = new MockPresenceService()
        presence.users = [
            {
                clientId: 2,
                user: { name: 'peer', color: '#0ff', activeFileId: 'f2' },
            },
        ]
        const tabs = new MockTabManager()

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        worker.dispatchMessage({ type: 'ready' })
        await flushMicrotasks()

        worker.postMessage.mockClear()
        fileSync.setText('f2', 'int x = 42;')

        expect(worker.postMessage).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(3000)

        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'sync',
            path: 'src/lib.cpp',
            content: 'int x = 42;',
        })

        manager.destroy()
        vi.useRealTimers()
    })

    it('sends delete message when indexed file is removed and terminates worker on destroy', async () => {
        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f1', 'int main(){}')

        const index = new MockProjectIndexService()
        index.files = [{ id: 'f1', path: 'src/main.cpp' }]

        const presence = new MockPresenceService()
        const tabs = new MockTabManager()
        tabs.setActive('f1')

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        await flushMicrotasks()
        worker.dispatchMessage({ type: 'ready' })
        worker.postMessage.mockClear()

        index.files = []
        index.triggerChange()

        expect(worker.postMessage).toHaveBeenCalledWith({ type: 'delete', path: 'src/main.cpp' })

        manager.destroy()

        expect(worker.terminate).toHaveBeenCalledOnce()
    })

    it('syncs active tab changes and queues sync for new active file', async () => {
        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f1', 'int main(){}')
        fileSync.setFile('f2', 'void util(){}')

        const index = new MockProjectIndexService()
        index.files = [
            { id: 'f1', path: 'src/main.cpp' },
            { id: 'f2', path: 'src/util.cpp' },
        ]

        const presence = new MockPresenceService()
        const tabs = new MockTabManager()
        tabs.setActive('f1')

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        await flushMicrotasks()
        worker.dispatchMessage({ type: 'ready' })
        worker.postMessage.mockClear()

        tabs.setActive('f2')
        await flushMicrotasks()

        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'sync',
            path: 'src/util.cpp',
            content: 'void util(){}',
        })

        manager.destroy()
    })

    it('sends rename message when file path changes due to project index update', async () => {
        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f1', 'int main(){}')

        const index = new MockProjectIndexService()
        index.files = [{ id: 'f1', path: 'src/main.cpp' }]

        const presence = new MockPresenceService()
        const tabs = new MockTabManager()
        tabs.setActive('f1')

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        await flushMicrotasks()
        worker.dispatchMessage({ type: 'ready' })
        worker.postMessage.mockClear()

        index.files = [{ id: 'f1', path: 'src/renamed.cpp' }]
        index.triggerChange()
        await flushMicrotasks()

        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'rename',
            oldPath: 'src/main.cpp',
            newPath: 'src/renamed.cpp',
        })

        manager.destroy()
    })

    it('handles collaborator presence changes and syncs their active files', async () => {
        const fileSync = new MockFileSyncManager()
        fileSync.setFile('f1', 'int main(){}')
        fileSync.setFile('f2', 'void peer(){}')

        const index = new MockProjectIndexService()
        index.files = [
            { id: 'f1', path: 'src/main.cpp' },
            { id: 'f2', path: 'src/peer.cpp' },
        ]

        const presence = new MockPresenceService()
        const tabs = new MockTabManager()
        tabs.setActive('f1')

        const manager = new CppLanguageServerManager(fileSync, index, presence, tabs)
        const worker = MockWorker.instances[0]

        await flushMicrotasks()
        worker.dispatchMessage({ type: 'ready' })
        worker.postMessage.mockClear()

        presence.users = [
            {
                clientId: 2,
                user: { name: 'peer', color: '#0ff', activeFileId: 'f2' },
            },
        ]
        presence.triggerChange()
        await flushMicrotasks()

        expect(worker.postMessage).toHaveBeenCalledWith({
            type: 'sync',
            path: 'src/peer.cpp',
            content: 'void peer(){}',
        })

        manager.destroy()
    })
})
