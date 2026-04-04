import { Wasmer } from '@wasmer/sdk'

import { requireEntrypoint, streamOutput } from '@/workers/codeRunner/shared'
import type { ProjectFs } from '@/workers/codeRunner/projectFs'
import type { StreamCallback, RunResult } from '@/workers/codeRunner/shared'

export class Runner {
    private stdinWriter: WritableStreamDefaultWriter<Uint8Array> | null = null
    private readonly onStdout: StreamCallback
    private readonly onStderr: StreamCallback
    private readonly onStdinReady: () => void

    constructor(onStdout: StreamCallback, onStderr: StreamCallback, onStdinReady: () => void) {
        this.onStdout = onStdout
        this.onStderr = onStderr
        this.onStdinReady = onStdinReady
    }

    async writeStdin(bytes: Uint8Array): Promise<void> {
        await this.stdinWriter?.write(bytes)
    }

    async run(fs: ProjectFs): Promise<RunResult> {
        const wasmBytes = await fs.dir.readFile(fs.wasmOutPath)
        const wasm = Wasmer.fromWasm(wasmBytes)
        const entrypoint = requireEntrypoint(wasm, 'program')
        const instance = await entrypoint.run({
            mount: { '/project': fs.dir },
            cwd: fs.runCwd, // Unfortunately, ignored by WASI, but set it anyway just in case
        })

        const stdin = instance.stdin as WritableStream<Uint8Array> | null
        if (stdin) {
            this.stdinWriter = stdin.getWriter()
            this.onStdinReady()
        }

        streamOutput(instance, this.onStdout, this.onStderr)
        const result = await instance.wait()
        this.stdinWriter = null
        return { ...result }
    }
}
