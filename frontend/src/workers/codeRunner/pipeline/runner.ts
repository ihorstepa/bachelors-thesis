import { WASIWorkerHost } from '@runno/wasi'

import type { PipelineIo, VFS } from '@/workers/codeRunner/shared'

export class Runner {
    private runHost: WASIWorkerHost | null = null

    public constructor(private readonly io: PipelineIo) {}

    public async run(fs: VFS, wasmOutAbsPath: string): Promise<number> {
        const wasmBytes = this.getBinary(fs, wasmOutAbsPath)
        const runHost = new WASIWorkerHost(new Uint8Array(wasmBytes), {
            args: ['./a.out'],
            env: {},
            fs,
            isTTY: true,
            stdout: this.io.onStdout,
            stderr: this.io.onStderr,
        })

        this.runHost = runHost
        this.io.onStdinReady()

        try {
            const runResult = await runHost.start()
            return runResult.exitCode
        } finally {
            if (this.runHost === runHost) {
                this.runHost = null
            }
        }
    }

    public async pushStdin(text: string): Promise<void> {
        if (!this.runHost) return
        await this.runHost.pushStdin(text)
    }

    public kill(): void {
        this.runHost?.kill()
        this.runHost = null
    }

    public destroy(): void {
        this.kill()
    }

    private getBinary(fs: VFS, path: string): Uint8Array {
        const file = fs[path]
        if (!file) {
            throw new Error(`Expected file ${path} in run filesystem`)
        }
        if (file.mode === 'binary') return file.content
        return new TextEncoder().encode(file.content)
    }
}
