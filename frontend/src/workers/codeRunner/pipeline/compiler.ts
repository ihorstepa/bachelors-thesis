import type { WASIExecutionResult, WASIFS } from '@runno/wasi'

import { wrappedMainPath } from '@/workers/codeRunner/mainWrapper'
import { CompilerInstance } from '@/workers/codeRunner/pipeline/compilerInstance'
import type { PipelineIo } from '@/workers/codeRunner/shared'
import { isCppFile, isSourceFile, projectPath } from '@/workers/codeRunner/shared'

export type CompilationResult = WASIExecutionResult & { objectFilePaths: string[] }

const clangCommonArgs = [
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
    '-Wno-deprecated',
    '-Wall',
    '-Wextra',
]

export class Compiler {
    private workerPool: CompilerInstance[] = []
    private clangBinary: Uint8Array
    private fs: WASIFS
    private io: PipelineIo

    private static readonly defaultWorkerPoolSize = Math.min(8, navigator.hardwareConcurrency / 2)

    public constructor(clangBinary: Uint8Array, fs: WASIFS, io: PipelineIo) {
        this.clangBinary = clangBinary
        this.fs = fs
        this.io = io
    }

    public async run(sourcePaths: string[], entrypointPath: string, objDir: string): Promise<CompilationResult> {
        const concurrency = Math.min(Compiler.defaultWorkerPoolSize, sourcePaths.length)
        this.createWorkers(concurrency)

        const objectFilePaths: string[] = new Array(sourcePaths.length)
        const objectFiles: WASIFS = {}
        let exitCode = 0
        let nextIndex = 0

        const runInstance = async (instance: CompilerInstance): Promise<void> => {
            while (exitCode === 0) {
                // Each worker gets assigned an index of a source file using shared counter
                const current = nextIndex
                nextIndex += 1
                if (current >= sourcePaths.length) return

                const sourcePath = sourcePaths[current]
                const objectPath = this.getObjectPath(sourcePath, objDir)
                const compileArgs = this.createCompileArgs(sourcePath, entrypointPath, objectPath)
                const result = await instance.run(compileArgs, objectPath)

                if (result.exitCode !== 0) {
                    exitCode = result.exitCode
                    return
                }

                objectFilePaths[current] = objectPath
                objectFiles[objectPath] = result.objectFile
            }
        }

        try {
            await Promise.all(this.workerPool.map((instance) => runInstance(instance)))
        } finally {
            this.killWorkers()
        }

        if (exitCode !== 0) {
            return { exitCode, fs: {}, objectFilePaths: [] }
        }

        this.fs = { ...this.fs, ...objectFiles }
        return { exitCode, fs: this.fs, objectFilePaths }
    }

    private createWorkers(count: number): void {
        this.killWorkers()
        this.workerPool = Array.from(
            { length: count },
            (_, index) => new CompilerInstance(this.clangBinary, this.fs, this.io, `compiler-${index}`),
        )
    }

    private killWorkers(): void {
        for (const instance of this.workerPool) {
            instance.kill()
        }
        this.workerPool = []
    }

    private getObjectPath(sourcePath: string, objDir: string): string {
        const sanitized = sourcePath.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        return `${objDir}/__obj__${sanitized}.o`
    }

    private getLangArgs(path: string): string[] {
        if (isCppFile(path)) {
            return ['-x', 'c++', '-std=c++20']
        }
        if (isSourceFile(path)) {
            return ['-x', 'c', '-std=c17']
        }
        return []
    }

    private getExtraArgs(sourcePath: string, entrypointPath: string): string[] {
        // We need to rename the main function for the C++ extra wrapper to work
        if (isCppFile(entrypointPath)) {
            if (sourcePath === entrypointPath) {
                return ['-Dmain=__wasm_user_main']
            } else if (sourcePath !== wrappedMainPath) {
                return ['-Dmain=__wasm_non_entry_main']
            }
        }
        return []
    }

    private createCompileArgs(sourcePath: string, entrypointPath: string, objectPath: string): string[] {
        return [
            'clang',
            ...clangCommonArgs,
            ...this.getLangArgs(sourcePath),
            ...this.getExtraArgs(sourcePath, entrypointPath),
            '-c',
            `${projectPath}/${sourcePath}`,
            '-o',
            objectPath,
        ]
    }
}
