import type {
    CompilerInstanceInMessage,
    CompilerInstanceOutMessage,
    PipelineIo,
    VFS,
} from '@/workers/codeRunner/shared'

type HostRequest = {
    id: number
    resolve: (value: { exitCode: number; outputFiles: VFS }) => void
    reject: (reason?: unknown) => void
}

export class CompilerInstance {
    private workerScript: URL
    private io: PipelineIo
    private worker: Worker | null = null
    private activeRequest: HostRequest | null = null
    private workerName?: string
    private nextRequestId = 1

    public constructor(binary: Uint8Array, baseFs: VFS, io: PipelineIo, workerScript: URL, workerName?: string) {
        this.io = io
        this.workerScript = workerScript
        this.workerName = workerName

        const msg: CompilerInstanceInMessage = { type: 'init', binary, baseFs }
        this.ensureWorker().postMessage(msg)
    }

    public async run(
        args: string[],
        extraFs: VFS,
        outputPaths: string[],
    ): Promise<{ exitCode: number; outputFiles: VFS }> {
        if (this.activeRequest) {
            throw new Error('CompilerInstance: only one in-flight request allowed')
        }
        const id = this.nextRequestId++
        return await new Promise((resolve, reject) => {
            this.activeRequest = { id, resolve, reject }
            const msg: CompilerInstanceInMessage = { type: 'run', id, args, env: {}, extraFs, outputPaths }
            this.ensureWorker().postMessage(msg)
        })
    }

    public kill(): void {
        this.rejectActiveRequest(new Error('Compiler instance worker killed'))
        this.resetWorker()
    }

    public destroy(): void {
        this.kill()
    }

    private ensureWorker(): Worker {
        if (this.worker) return this.worker
        const worker = new Worker(this.workerScript, { type: 'module', name: this.workerName })
        worker.addEventListener('message', this.handleMessage)
        worker.addEventListener('error', this.handleWorkerError)
        this.worker = worker
        return worker
    }

    private handleMessage = (event: MessageEvent<CompilerInstanceOutMessage>): void => {
        const msg = event.data
        const request = this.activeRequest
        if (!request || msg.id !== request.id) return

        if (msg.type === 'stdout') {
            this.io.onStdout(msg.text)
            return
        }
        if (msg.type === 'stderr') {
            this.io.onStderr(msg.text)
            return
        }

        this.activeRequest = null
        if (msg.type === 'done') {
            request.resolve({ exitCode: msg.exitCode, outputFiles: msg.outputFiles })
            return
        }
        request.reject(new Error(msg.message))
    }

    private handleWorkerError = (event: ErrorEvent): void => {
        this.rejectActiveRequest(new Error(event.message || 'Compiler instance worker crashed'))
        this.resetWorker()
    }

    private rejectActiveRequest(error: Error): void {
        const request = this.activeRequest
        this.activeRequest = null
        request?.reject(error)
    }

    private resetWorker(): void {
        this.worker?.terminate()
        this.worker = null
    }
}
