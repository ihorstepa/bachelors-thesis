import { WASI } from '@runno/wasi'

import type { PipelineIo, VFS } from '@/workers/codeRunner/shared'

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

export type LinkOutcome = { exitCode: number; outputFs: VFS }

export class Linker {
    public constructor(
        private readonly io: PipelineIo,
        private readonly wasmLdBinary: Uint8Array,
        private readonly sysrootFs: VFS,
    ) {}

    public async linkObjects(objectFiles: string[], objectFilesFs: VFS, wasmOutAbsPath: string): Promise<LinkOutcome> {
        const linkArgs = this.createLinkArgs(objectFiles, wasmOutAbsPath)
        const wasmBuffer = new ArrayBuffer(this.wasmLdBinary.byteLength)
        new Uint8Array(wasmBuffer).set(this.wasmLdBinary)

        const result = await WASI.start(new Response(wasmBuffer, { headers: { 'content-type': 'application/wasm' } }), {
            args: linkArgs,
            env: {},
            fs: { ...this.sysrootFs, ...objectFilesFs },
            stdout: this.io.onStdout,
            stderr: this.io.onStderr,
        })

        const outputFs = Object.fromEntries(
            [wasmOutAbsPath].flatMap((path) => (result.fs[path] ? [[path, result.fs[path]]] : [])),
        )

        return { exitCode: result.exitCode, outputFs }
    }

    public destroy(): void {}

    private createLinkArgs(objectFiles: string[], wasmOutAbsPath: string): string[] {
        return [...linkerCommonArgs, ...objectFiles, '-o', wasmOutAbsPath]
    }
}
