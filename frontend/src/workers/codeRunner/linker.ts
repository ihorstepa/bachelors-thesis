import type { Directory, Wasmer } from '@wasmer/sdk'

import { requireEntrypoint, streamOutput } from '@/workers/codeRunner/shared'
import type { ProjectFs } from '@/workers/codeRunner/projectFs'
import type { RunResult, StreamCallback } from '@/workers/codeRunner/shared'

const linkerCommonArgs = [
    '-flavor',
    'wasm',
    '-z',
    `stack-size=${1024 * 1024}`,
    '-L/sysroot/lib/wasm32-wasi',
    '/sysroot/lib/wasm32-wasi/crt1.o',
    '-lc',
    '-lc++',
    '-lc++abi-except',
    '-lunwind-except',
    '-L/sysroot/lib/clang/16/lib/wasi',
    '-lclang_rt.builtins-wasm32',
]

export class Linker {
    private readonly wasmLdCmd: NonNullable<Wasmer['entrypoint']>
    private readonly sysroot: Directory
    private readonly onStdout: StreamCallback
    private readonly onStderr: StreamCallback

    constructor(wasmld: Wasmer, sysroot: Directory, onStdout: StreamCallback, onStderr: StreamCallback) {
        this.wasmLdCmd = requireEntrypoint(wasmld, 'wasm-ld')
        this.sysroot = sysroot
        this.onStdout = onStdout
        this.onStderr = onStderr
    }

    async link(objectFiles: string[], fs: ProjectFs, extraArgs: string[] = []): Promise<RunResult> {
        const instance = await this.wasmLdCmd.run({
            args: [...linkerCommonArgs, ...objectFiles, '-o', `/project/${fs.wasmOutPath}`, ...extraArgs],
            mount: { '/project': fs.dir, '/sysroot': this.sysroot },
        })
        streamOutput(instance, this.onStdout, this.onStderr)
        const result = await instance.wait()
        return { ...result }
    }
}
