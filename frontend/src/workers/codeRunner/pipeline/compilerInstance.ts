import type { WASIFile, WASIFS } from '@runno/wasi'

import { assertNever } from '@/utils/functions'
import type { CompilerInstanceInMessage, CompilerInstanceOutMessage, PipelineIo } from '@/workers/codeRunner/shared'

type CompilationInstanceResult = {
    exitCode: number
    objectFile: WASIFile
}

type HostRequest = {
    id: number
    resolve: (value: CompilationInstanceResult) => void
    reject: (reason?: unknown) => void
}

export class CompilerInstance {
    private worker: Worker | null = null
    private workerName?: string
    private activeRequest: HostRequest | null = null
    private nextRequestId = 1
    private io: PipelineIo

    public constructor(binary: Uint8Array, fs: WASIFS, io: PipelineIo, workerName?: string) {
        this.io = io
        this.workerName = workerName

        const msg: CompilerInstanceInMessage = { type: 'init', binary, fs }
        this.ensureWorker().postMessage(msg)
    }

    public async run(args: string[], outputPath: string): Promise<CompilationInstanceResult> {
        if (this.activeRequest) {
            throw new Error('Request already in progress')
        }
        const id = this.nextRequestId++

        return new Promise((resolve, reject) => {
            this.activeRequest = { id, resolve, reject }
            const msg: CompilerInstanceInMessage = { type: 'run', id, args, outputPath }
            this.ensureWorker().postMessage(msg)
        })
    }

    public kill(): void {
        this.rejectActiveRequest(new Error('Compiler instance worker killed'))
        this.resetWorker()
    }

    private ensureWorker(): Worker {
        if (this.worker) return this.worker
        const worker = new Worker(new URL('./compilerInstanceWorker.ts', import.meta.url), {
            type: 'module',
            name: this.workerName,
        })
        worker.addEventListener('message', this.handleMessage)
        worker.addEventListener('error', this.handleError)
        this.worker = worker
        return worker
    }

    private handleMessage = (event: MessageEvent<CompilerInstanceOutMessage>): void => {
        const msg = event.data
        const request = this.activeRequest
        if (!request || msg.id !== request.id) return

        switch (msg.type) {
            case 'stdout':
                this.io.onStdout(msg.text)
                break
            case 'stderr':
                this.io.onStderr(msg.text)
                break
            case 'done':
                this.activeRequest = null
                request.resolve({ exitCode: msg.exitCode, objectFile: msg.objectFile })
                break
            case 'error':
                this.activeRequest = null
                request.reject(new Error(msg.message))
                break
            default:
                assertNever(msg)
        }
    }

    private handleError = (event: ErrorEvent): void => {
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
