import type * as Y from 'yjs'

import type { CodeRunnerStatus } from '@/core/codeRunner'
import { CodeRunner } from '@/core/codeRunner'
import type { FileSyncManager } from '@/core/fileSyncManager'
import type { FileSystemManager } from '@/core/fileSystemManager'
import type { ProjectIndexService } from '@/core/projectIndexService'
import type { TabManager } from '@/core/tabManager'
import { assertNever, normalizePath } from '@/utils/functions'
import type { ProjectFile, WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'

type RunConfig = { targets?: Record<string, { entry?: string }> }

class CppCodeRunner extends CodeRunner {
    private fileSystemManager: FileSystemManager
    private fileSyncManager: FileSyncManager
    private projectFileIndex: ProjectIndexService
    private tabManager: TabManager

    private status: CodeRunnerStatus = 'idle'
    private canSendInput: boolean = false
    private error: string | null = null
    private targets = new Map<string, string>()
    private targetsSnapshot: string[] = []
    private targetsRefreshVersion = 0
    private worker: Worker | null = null
    private refreshTimer: number | null = null
    private observedConfigFileId: string | null = null
    private observedConfigText: Y.Text | null = null
    private stopRequested = false

    private static readonly configName = 'run.config.json'
    private static readonly targetRefreshDelay = 500
    private static readonly defaultConfig: RunConfig = {
        targets: {
            app: { entry: 'main.cpp' },
        },
    }

    public constructor(
        fileSystemManager: FileSystemManager,
        fileSyncManager: FileSyncManager,
        projectFileIndex: ProjectIndexService,
        tabManager: TabManager,
    ) {
        super()
        this.fileSystemManager = fileSystemManager
        this.fileSyncManager = fileSyncManager
        this.projectFileIndex = projectFileIndex
        this.tabManager = tabManager

        this.scheduleRefreshTargets = this.scheduleRefreshTargets.bind(this)
        this.fileSystemManager.on('change', this.scheduleRefreshTargets)
        this.scheduleRefreshTargets()
    }

    public destroy(): void {
        this.fileSystemManager.off('change', this.scheduleRefreshTargets)
        this.clearRefreshTimer()
        this.detachConfigObserver()
        this.killWorker()
    }

    public async run(targetName: string): Promise<void> {
        if (this.isExecutionActive()) return
        this.stopRequested = false

        await this.refreshTargets()
        if (this.stopRequested) {
            this.stopRequested = false
            return
        }
        if (!this.hasConfig()) return

        const entrypoint = this.targets.get(targetName)
        if (!entrypoint) {
            this.setError(`Selected target "${targetName}" is not defined in ${CppCodeRunner.configName}`)
            return
        }

        this.status = 'syncing'
        this.canSendInput = false
        this.emit('change', this.status)

        let files: ProjectFile[]
        try {
            files = await this.collectFiles(targetName)
        } catch (e) {
            this.setError(e instanceof Error ? e.message : String(e))
            return
        }

        // stop() may have been called while awaiting file collection.
        if ((this.status as CodeRunnerStatus) === 'idle' || this.stopRequested) {
            this.stopRequested = false
            return
        }

        const worker = this.getWorker()
        const message: WorkerInMessage = { type: 'start', files, entrypoint }
        worker.postMessage(message)
    }

    public sendInput(text: string): void {
        if (!this.canSendInput || !this.worker) return
        this.canSendInput = false
        const message: WorkerInMessage = { type: 'stdin', bytes: new TextEncoder().encode(text) }
        this.worker.postMessage(message)
        this.emit('change', this.status)
    }

    public stop(): void {
        if (this.status === 'idle') {
            this.stopRequested = true
            return
        }

        this.stopRequested = true
        this.killWorker()

        this.status = 'idle'
        this.canSendInput = false
        this.error = null
        this.emit('change', this.status)
    }

    public async createConfig(): Promise<void> {
        if (this.findConfigId()) return

        let id: string
        try {
            id = this.fileSystemManager.create(CppCodeRunner.configName, 'file', null)
        } catch (e) {
            this.setError(this.getErrorMessage(e))
            return
        }

        let fileOpened = false
        try {
            const file = await this.fileSyncManager.openFile(id)
            fileOpened = true
            await file.synced
            const text = file.doc.getText()

            file.doc.transact(() => {
                const length = text.length
                if (length > 0) text.delete(0, length)
                text.insert(0, JSON.stringify(CppCodeRunner.defaultConfig, null, 4))
            })

            this.tabManager.open(id)
            await this.refreshTargets()
        } catch (e) {
            this.setError(this.getErrorMessage(e))
            return
        } finally {
            if (fileOpened) this.fileSyncManager.closeFile(id)
        }
    }

    public hasConfig(): boolean {
        return this.observedConfigFileId !== null
    }

    public getStatus(): CodeRunnerStatus {
        return this.status
    }

    public getCanSendInput(): boolean {
        return this.canSendInput
    }

    public getTargets(): string[] {
        return this.targetsSnapshot
    }

    public getError(): string | null {
        return this.error
    }

    private getWorker(): Worker {
        if (this.worker) return this.worker

        const worker = new Worker(new URL('../../workers/codeRunner/worker.ts', import.meta.url), {
            type: 'module',
        })

        worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            if (this.worker !== worker) return
            this.handleMessage(event.data)
        }
        worker.onerror = (e: ErrorEvent) => {
            if (this.worker !== worker) return
            this.killWorker()
            this.setError(e.message ?? 'Code runner worker error')
        }

        this.worker = worker
        return worker
    }

    private killWorker(): void {
        if (!this.worker) return
        this.worker.onmessage = null
        this.worker.onerror = null
        this.worker.terminate()
        this.worker = null
    }

    private handleMessage(msg: WorkerOutMessage): void {
        if (this.stopRequested) {
            if (msg.type === 'done' || msg.type === 'error') {
                this.stopRequested = false
            }
            return
        }

        switch (msg.type) {
            case 'phase':
                this.status = msg.phase
                this.emit('change', this.status)
                break
            case 'stdout':
                this.emit('stdout', msg.text)
                this.emit('change', this.status)
                break
            case 'stderr':
                this.emit('stderr', msg.text)
                this.emit('change', this.status)
                break
            case 'stdin_ready':
                if (this.canSendInput) break
                this.canSendInput = true
                this.emit('change', this.status)
                break
            case 'done':
                this.canSendInput = false
                this.status = msg.ok ? 'success' : 'error'
                this.killWorker()
                this.emit('exit', msg.code, msg.ok)
                this.emit('change', this.status)
                break
            case 'error':
                this.killWorker()
                this.setError(msg.message)
                break
            default:
                assertNever(msg)
        }
    }

    private isExecutionActive(): boolean {
        return (
            this.status === 'syncing' ||
            this.status === 'compiling' ||
            this.status === 'linking' ||
            this.status === 'running'
        )
    }

    private setError(message: string): void {
        this.canSendInput = false
        this.status = 'error'
        this.error = message
        this.emit('error', message)
        this.emit('change', this.status)
    }

    private getErrorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error)
    }

    private async collectFiles(targetName: string): Promise<ProjectFile[]> {
        const selectedEntrypoint = this.targets.get(targetName)

        // Exclude entrypoints of other targets to avoid linking multiple mains together
        const excludedEntrypointPaths = new Set(
            Array.from(this.targets.values()).filter((entry) => entry !== selectedEntrypoint),
        )

        const refs = this.projectFileIndex.getAllFilePaths()
        const openedIds: string[] = []

        try {
            const files = await Promise.all(
                refs.map(async ({ id, path }) => {
                    const shared = await this.fileSyncManager.openFile(id)
                    openedIds.push(id)
                    await shared.synced
                    return { path, content: shared.doc.getText().toString() }
                }),
            )

            if (excludedEntrypointPaths.size === 0) return files
            return files.filter((file) => !excludedEntrypointPaths.has(file.path))
        } finally {
            for (const id of openedIds) {
                this.fileSyncManager.closeFile(id)
            }
        }
    }

    private async refreshTargets(): Promise<void> {
        // Version guards against out-of-order async refreshes
        const currentVersion = ++this.targetsRefreshVersion
        const configFileId = this.findConfigId()

        if (!configFileId) {
            this.detachConfigObserver()
            this.targets = new Map()
            this.targetsSnapshot = []
            this.error = null
            this.emit('change', this.status)
            return
        }

        await this.attachConfigObserver(configFileId)
        if (currentVersion !== this.targetsRefreshVersion) return

        try {
            const targets = this.parseConfig(this.observedConfigText?.toString() ?? '')

            this.targets = targets
            this.targetsSnapshot = Array.from(targets.keys()).sort()
            this.error = null
            this.emit('change', this.status)
        } catch (e) {
            const message = `Failed to parse ${CppCodeRunner.configName}: ${this.getErrorMessage(e)}`
            this.targets = new Map()
            this.targetsSnapshot = []
            this.setError(message)
        }
    }

    private scheduleRefreshTargets(): void {
        this.clearRefreshTimer()
        this.refreshTimer = window.setTimeout(() => {
            this.refreshTimer = null
            void this.refreshTargets()
        }, CppCodeRunner.targetRefreshDelay)
    }

    private clearRefreshTimer(): void {
        if (this.refreshTimer === null) return
        window.clearTimeout(this.refreshTimer)
        this.refreshTimer = null
    }

    private findConfigId(): string | null {
        const rootChildren = this.fileSystemManager.getChildrenMeta(null)
        const configNode = rootChildren.find((node) => node.type === 'file' && node.name === CppCodeRunner.configName)
        return configNode?.id ?? null
    }

    private async attachConfigObserver(fileId: string): Promise<void> {
        if (this.observedConfigFileId === fileId) return

        this.detachConfigObserver()

        const shared = await this.fileSyncManager.openFile(fileId)
        await shared.synced
        const text = shared.doc.getText()
        text.observe(this.scheduleRefreshTargets)

        this.observedConfigFileId = fileId
        this.observedConfigText = text
    }

    private detachConfigObserver(): void {
        if (this.observedConfigText) {
            this.observedConfigText.unobserve(this.scheduleRefreshTargets)
        }
        if (this.observedConfigFileId) {
            this.fileSyncManager.closeFile(this.observedConfigFileId)
        }

        this.observedConfigFileId = null
        this.observedConfigText = null
    }

    private parseConfig(content: string): Map<string, string> {
        const raw = JSON.parse(content) as RunConfig
        const targets = raw.targets
        if (!targets || typeof targets !== 'object') {
            throw new Error('Missing "targets" object')
        }

        const parsed = new Map<string, string>()
        for (const [name, cfg] of Object.entries(targets)) {
            if (!cfg || typeof cfg !== 'object' || typeof cfg.entry !== 'string' || !cfg.entry.trim()) {
                throw new Error(`Target "${name}" must define a non-empty "entry" string`)
            }
            parsed.set(name, normalizePath(cfg.entry))
        }
        return parsed
    }
}

export default CppCodeRunner
