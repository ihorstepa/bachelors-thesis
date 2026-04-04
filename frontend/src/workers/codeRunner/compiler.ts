import type { Directory, Wasmer } from '@wasmer/sdk'

import { requireEntrypoint, streamOutput, wrappedMainPath } from '@/workers/codeRunner/shared'
import type { ProjectFs } from '@/workers/codeRunner/projectFs'
import type { StreamCallback, RunResult } from '@/workers/codeRunner/shared'

const clangCommonArgs = [
    '-target',
    'wasm32-wasi',
    '-isysroot',
    '/sysroot',
    '-isystem',
    '/sysroot/include/c++/v1',
    '-isystem',
    '/sysroot/include',
    '-isystem',
    '/sysroot/lib/clang/16/include',
    '-fno-builtin',
    '-fexceptions',
    '-fwasm-exceptions',
    '-I/project',
]

const cppExtensions = new Set(['.cc', '.cpp', '.cxx'])

export function isCppFile(path: string): boolean {
    const index = path.lastIndexOf('.')
    if (index < 0) return false
    return cppExtensions.has(path.slice(index).toLowerCase())
}

export function computeCompileArgs(sourcePath: string, selectedEntrypointPath: string): string[] {
    const isEntrypoint = sourcePath === selectedEntrypointPath
    const entrypointIsCpp = isCppFile(selectedEntrypointPath)
    if (entrypointIsCpp && isEntrypoint) return ['-Dmain=__wasm_user_main']
    if (!isEntrypoint && sourcePath !== wrappedMainPath) return ['-Dmain=__wasm_non_entry_main']
    return []
}

export class Compiler {
    private readonly entrypoint: NonNullable<Wasmer['entrypoint']>
    private readonly sysroot: Directory
    private readonly onStdout: StreamCallback
    private readonly onStderr: StreamCallback

    public constructor(clang: Wasmer, sysroot: Directory, onStdout: StreamCallback, onStderr: StreamCallback) {
        this.entrypoint = requireEntrypoint(clang, 'clang')
        this.sysroot = sysroot
        this.onStdout = onStdout
        this.onStderr = onStderr
    }

    public async compile(sourcePath: string, fs: ProjectFs, extraArgs: string[] = []): Promise<RunResult> {
        const objectPath = fs.getObjectPath(sourcePath)
        const instance = await this.entrypoint.run({
            args: [
                ...clangCommonArgs,
                ...this.getLangArgs(sourcePath),
                ...extraArgs,
                '-c',
                `/project/${sourcePath}`,
                '-o',
                `/project/${objectPath}`,
            ],
            mount: { '/project': fs.dir, '/sysroot': this.sysroot },
        })
        streamOutput(instance, this.onStdout, this.onStderr)
        const result = await instance.wait()
        return { ...result }
    }

    private getLangArgs(path: string): string[] {
        const ext = path.slice(path.lastIndexOf('.')).toLowerCase()
        switch (ext) {
            case '.c':
                return ['-x', 'c', '-std=c17']
            case '.cc':
            case '.cpp':
            case '.cxx':
                return ['-x', 'c++', '-std=c++2b']
            default:
                return []
        }
    }
}
