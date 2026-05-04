import type * as Y from 'yjs'

import type { FileSyncManager } from '@/core/fileSyncManager'
import { LanguageServerManager } from '@/core/languageServerManager'
import type { PresenceService } from '@/core/presenceService'
import type { ProjectIndexService } from '@/core/projectIndexService'
import type { TabManager } from '@/core/tabManager'
import { assertNever } from '@/utils/functions'
import { toProjectUri } from '@/workers/languageServer/projectFileSystem'
import type { LanguageServerWorkerInMessage, LanguageServerWorkerOutMessage } from '@/workers/languageServer/shared'

type ObservedFile = {
    readonly text: Y.Text
    readonly observer: () => void
    source: FileObservationSource
}

type FileObservationSource = 'active' | 'collaborator'

type SyncedFileState = {
    path: string
    content: string
}

class CppLanguageServerManager extends LanguageServerManager {
    private fileSyncManager: FileSyncManager
    private projectIndexService: ProjectIndexService
    private presenceService: PresenceService
    private tabManager: TabManager

    private worker: Worker
    private workerReady = false
    private pendingWorkerMessages: LanguageServerWorkerInMessage[] = []

    private activeFileId: string | null = null
    private observedFiles = new Map<string, ObservedFile>()
    private openRequests = new Set<string>()
    private dirtyFiles = new Set<string>()
    private pathById = new Map<string, string>()
    private synced = new Map<string, SyncedFileState>()

    private flushTimer: ReturnType<typeof setTimeout> | null = null

    private preloaded = false
    private preloadPromise: Promise<void> | null = null

    private static readonly supportedExtensions = new Set(['c', 'h', 'cpp', 'hpp', 'hxx', 'cxx'])
    private static readonly collaboratorSyncDebounceMs = 3000

    public constructor(
        fileSyncManager: FileSyncManager,
        projectIndexService: ProjectIndexService,
        presenceService: PresenceService,
        tabManager: TabManager,
    ) {
        super()

        this.fileSyncManager = fileSyncManager
        this.projectIndexService = projectIndexService
        this.presenceService = presenceService
        this.tabManager = tabManager

        this.handleWorkerMessage = this.handleWorkerMessage.bind(this)
        this.handleWorkerError = this.handleWorkerError.bind(this)
        this.handlePresenceChange = this.handlePresenceChange.bind(this)
        this.handleProjectIndexChange = this.handleProjectIndexChange.bind(this)
        this.handleActiveTabChange = this.handleActiveTabChange.bind(this)

        this.worker = new Worker(new URL('../../workers/languageServer/clangdWorker.ts', import.meta.url), {
            type: 'module',
        })
        this.worker.onmessage = this.handleWorkerMessage
        this.worker.onerror = this.handleWorkerError

        this.presenceService.on('change', this.handlePresenceChange)
        this.projectIndexService.on('change', this.handleProjectIndexChange)
        this.tabManager.on('activeChange', this.handleActiveTabChange)

        this.activeFileId = tabManager.getActiveId()
        this.seedPathsFromIndex()
        this.syncFiles()
    }

    public destroy(): void {
        this.presenceService.off('change', this.handlePresenceChange)
        this.projectIndexService.off('change', this.handleProjectIndexChange)
        this.tabManager.off('activeChange', this.handleActiveTabChange)

        this.activeFileId = null

        this.observedFiles.forEach((obs, fileId) => {
            obs.text.unobserve(obs.observer)
            this.fileSyncManager.closeFile(fileId)
        })
        this.observedFiles.clear()
        this.openRequests.clear()
        this.dirtyFiles.clear()
        this.synced.clear()
        this.pendingWorkerMessages = []
        this.workerReady = false

        if (this.flushTimer != null) {
            clearTimeout(this.flushTimer)
            this.flushTimer = null
        }

        this.worker.onmessage = null
        this.worker.onerror = null
        this.worker.terminate()
    }

    public send(message: string): void {
        this.postToWorker({ type: 'lsp', payload: message })
    }

    public getDocumentUri(fileId: string): string | null {
        const path = this.pathById.get(fileId)
        return path ? toProjectUri(path) : null
    }

    private handleActiveTabChange(fileId: string | null): void {
        if (this.activeFileId === fileId) return
        this.activeFileId = fileId
        this.syncFiles()
    }

    private handleWorkerMessage(event: MessageEvent<LanguageServerWorkerOutMessage>): void {
        const msg = event.data

        switch (msg.type) {
            case 'ready':
                this.workerReady = true
                for (const pending of this.pendingWorkerMessages.splice(0)) {
                    this.worker.postMessage(pending)
                }
                this.preloadWorker()
                break
            case 'error':
                console.error('clangd worker error:', msg.message)
                break
            case 'lsp':
                this.emit('message', JSON.stringify(msg.payload))
                break
            default:
                assertNever(msg)
        }
    }

    private handleWorkerError(event: ErrorEvent): void {
        console.error('clangd worker failed:', event.message, event.filename, event.lineno)
    }

    private handlePresenceChange(): void {
        this.syncFiles()
    }

    private handleProjectIndexChange(): void {
        const previousPaths = new Map(this.pathById)
        this.seedPathsFromIndex()

        for (const [fileId, obs] of this.observedFiles) {
            const nextPath = this.pathById.get(fileId)
            if (!nextPath) {
                this.detach(fileId)
                continue
            }

            const oldPath = previousPaths.get(fileId)
            if (oldPath !== undefined && oldPath !== nextPath) {
                const syncedState = this.synced.get(fileId)
                if (syncedState) {
                    this.postToWorker({ type: 'rename', oldPath: syncedState.path, newPath: nextPath })
                    this.synced.set(fileId, { path: nextPath, content: syncedState.content })
                } else {
                    this.syncPathContent(fileId, nextPath, obs.text.toString(), true)
                }
            }
        }

        for (const [fileId, syncedState] of this.synced) {
            if (this.observedFiles.has(fileId)) continue
            const nextPath = this.pathById.get(fileId)
            if (!nextPath || syncedState.path === nextPath) continue
            this.postToWorker({ type: 'rename', oldPath: syncedState.path, newPath: nextPath })
            this.synced.set(fileId, { path: nextPath, content: syncedState.content })
        }

        for (const [fileId, oldPath] of previousPaths) {
            if (!this.pathById.has(fileId)) {
                this.postToWorker({ type: 'delete', path: oldPath })
                this.synced.delete(fileId)
            }
        }

        this.syncFiles()

        if (this.preloaded) {
            void this.preloadWorker(true)
        }
    }

    private seedPathsFromIndex(): void {
        this.pathById.clear()
        for (const file of this.projectIndexService.getAllFilePaths()) {
            if (this.isSupportedPath(file.path)) {
                this.pathById.set(file.id, file.path)
            }
        }
    }

    private syncFiles(): void {
        const desired = new Map<string, FileObservationSource>()

        if (this.activeFileId && this.pathById.has(this.activeFileId)) {
            desired.set(this.activeFileId, 'active')
        }

        for (const { user } of this.presenceService.getOnlineUsers()) {
            const active = user.activeFileId
            if (!active || active === this.activeFileId) {
                continue
            }
            if (this.pathById.has(active)) {
                desired.set(active, 'collaborator')
            }
        }

        for (const [fileId, source] of desired) {
            const obs = this.observedFiles.get(fileId)
            if (obs) {
                obs.source = source
            } else if (!this.openRequests.has(fileId)) {
                this.attach(fileId)
            }
        }

        for (const [fileId] of this.observedFiles) {
            if (!desired.has(fileId)) {
                this.detach(fileId)
            }
        }
    }

    private async attach(fileId: string): Promise<void> {
        const path = this.pathById.get(fileId)
        if (!path) return

        this.openRequests.add(fileId)
        let opened = false

        try {
            const file = await this.fileSyncManager.openFile(fileId)
            opened = true
            await file.synced

            if (!this.openRequests.has(fileId)) {
                return
            }

            const source = this.getSource(fileId)
            if (!source) {
                this.fileSyncManager.closeFile(fileId)
                return
            }

            const text = file.doc.getText()
            const observer = () => this.onTextChange(fileId)
            text.observe(observer)

            this.observedFiles.set(fileId, { text, observer, source })
            this.syncPathContent(fileId, path, text.toString())
        } catch {
            if (opened) {
                this.fileSyncManager.closeFile(fileId)
            }
            return
        } finally {
            this.openRequests.delete(fileId)
        }

        const stillDesired = this.getSource(fileId)
        if (!stillDesired) {
            this.detach(fileId)
            return
        }

        const obs = this.observedFiles.get(fileId)
        if (obs) {
            obs.source = stillDesired
        }
    }

    private detach(fileId: string): void {
        const obs = this.observedFiles.get(fileId)
        if (!obs) {
            this.openRequests.delete(fileId)
            return
        }

        obs.text.unobserve(obs.observer)
        this.fileSyncManager.closeFile(fileId)
        this.observedFiles.delete(fileId)
        this.dirtyFiles.delete(fileId)
    }

    private onTextChange(fileId: string): void {
        const obs = this.observedFiles.get(fileId)
        if (!obs || obs.source !== 'collaborator') return

        this.dirtyFiles.add(fileId)
        this.scheduleFlush()
    }

    private scheduleFlush(): void {
        if (this.flushTimer != null) {
            return
        }
        this.flushTimer = setTimeout(() => {
            this.flushTimer = null
            this.flush()
        }, CppLanguageServerManager.collaboratorSyncDebounceMs)
    }

    private flush(): void {
        for (const fileId of this.dirtyFiles) {
            const obs = this.observedFiles.get(fileId)
            if (!obs) continue

            const path = this.pathById.get(fileId)
            if (!path) continue

            this.syncPathContent(fileId, path, obs.text.toString())
        }
        this.dirtyFiles.clear()
    }

    private syncPathContent(fileId: string, path: string, content: string, force = false): boolean {
        const curr = this.synced.get(fileId)
        if (!force && curr?.path === path && curr.content === content) {
            return false
        }

        this.postToWorker({ type: 'sync', path, content })
        this.synced.set(fileId, { path, content })
        return true
    }

    private async syncSnapshot(fileId: string, path: string, force = false): Promise<boolean> {
        const obs = this.observedFiles.get(fileId)
        if (obs) {
            return this.syncPathContent(fileId, path, obs.text.toString(), force)
        }

        let opened = false

        try {
            const shared = await this.fileSyncManager.openFile(fileId)
            opened = true
            await shared.synced

            return this.syncPathContent(fileId, path, shared.doc.getText().toString(), force)
        } catch {
            return false
        } finally {
            if (opened) {
                this.fileSyncManager.closeFile(fileId)
            }
        }
    }

    private async preloadWorker(force = false): Promise<void> {
        if (!this.workerReady) {
            return
        }
        if (!force && this.preloaded) {
            return
        }
        if (this.preloadPromise) {
            await this.preloadPromise
            return
        }
        this.preloadPromise = (async () => {
            for (const [id, path] of this.pathById) {
                await this.syncSnapshot(id, path, force)
            }
            this.preloaded = true
        })()

        try {
            await this.preloadPromise
        } finally {
            this.preloadPromise = null
        }
    }

    private getSource(fileId: string): FileObservationSource | null {
        if (this.activeFileId === fileId && this.pathById.has(fileId)) {
            return 'active'
        }
        for (const { user } of this.presenceService.getOnlineUsers()) {
            if (user.activeFileId === fileId && fileId !== this.activeFileId && this.pathById.has(fileId)) {
                return 'collaborator'
            }
        }
        return null
    }

    private isSupportedPath(path: string): boolean {
        const extension = path.split('.').pop()?.toLowerCase()
        return extension != null && CppLanguageServerManager.supportedExtensions.has(extension)
    }

    private postToWorker(message: LanguageServerWorkerInMessage): void {
        if (!this.workerReady) {
            this.pendingWorkerMessages.push(message)
            return
        }
        this.worker.postMessage(message)
    }
}

export default CppLanguageServerManager
