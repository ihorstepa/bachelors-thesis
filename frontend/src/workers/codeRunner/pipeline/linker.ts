import { WASI } from '@runno/wasi'
import type { WASIExecutionResult, WASIFS } from '@runno/wasi'

import type { PipelineIo } from '@/workers/codeRunner/shared'

const stackSize = 1024 * 1024

const linkerCommonArgs = [
    'wasm-ld',
    '-z',
    `stack-size=${stackSize}`,
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
    public constructor(
        private binary: Uint8Array,
        private sysroot: WASIFS,
        private io: PipelineIo,
    ) {}

    public async linkObjects(fs: WASIFS, objectFilePaths: string[], wasmOutPath: string): Promise<WASIExecutionResult> {
        const linkArgs = this.createLinkArgs(objectFilePaths, wasmOutPath)
        const wasmBody = this.binary as unknown as BodyInit

        return WASI.start(new Response(wasmBody, { headers: { 'content-type': 'application/wasm' } }), {
            args: linkArgs,
            fs: { ...this.sysroot, ...fs },
            stdout: this.io.onStdout,
            stderr: this.io.onStderr,
        })
    }

    private createLinkArgs(objectFiles: string[], wasmOutPath: string): string[] {
        return [...linkerCommonArgs, ...objectFiles, '-o', wasmOutPath]
    }
}
