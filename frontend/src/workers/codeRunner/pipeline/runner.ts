import { WASIWorkerHost } from '@runno/wasi'
import type { WASIFS } from '@runno/wasi'

import type { PipelineIo } from '@/workers/codeRunner/shared'

type StdinState = 'closed' | 'open' | 'reopen-after-drain'

export class Runner {
    private worker: WASIWorkerHost | null = null
    private stdinState: StdinState = 'closed'
    private io: PipelineIo

    public constructor(io: PipelineIo) {
        this.io = io
    }

    public async run(fs: WASIFS, wasmOutPath: string): Promise<number> {
        const wasmBytes = this.getBinary(fs, wasmOutPath)
        this.stdinState = 'closed'

        // WASIWorkerHost is used because it already handles most of the stdin logic
        this.worker = new WASIWorkerHost(new Uint8Array(wasmBytes), {
            env: {},
            fs,
            isTTY: true,
            stdout: this.io.onStdout,
            stderr: this.io.onStderr,
            // This argument was patched into the package for better stdin handling
            onStdinWait: () => {
                if (this.stdinState === 'open') {
                    this.stdinState = 'reopen-after-drain'
                    return
                }
                this.stdinState = 'open'
                this.io.onStdinReady()
            },
        })

        try {
            const runResult = await this.worker.start()
            return runResult.exitCode
        } finally {
            this.worker = null
        }
    }

    public async pushStdin(text: string): Promise<void> {
        if (!this.worker) return

        const runHost = this.worker
        await runHost.pushStdin(text)
        await this.waitForBufferDrain(runHost)

        if (this.worker !== runHost) return

        if (this.stdinState === 'reopen-after-drain') {
            this.stdinState = 'open'
            this.io.onStdinReady()
            return
        }
        this.stdinState = 'closed'
    }

    private async waitForBufferDrain(runHost: WASIWorkerHost): Promise<void> {
        const view = new DataView(runHost.stdinBuffer)
        // Waits until the worker has read the stdin buffer (code copied from runno's stdin implementation)
        while (this.worker === runHost && view.getInt32(0) !== 0) {
            await new Promise((resolve) => setTimeout(resolve, 0))
        }
    }

    private getBinary(fs: WASIFS, path: string): Uint8Array {
        const file = fs[path]
        if (!file || file.mode !== 'binary') {
            throw new Error(`Expected a binary file at ${path}`)
        }
        return file.content
    }
}
