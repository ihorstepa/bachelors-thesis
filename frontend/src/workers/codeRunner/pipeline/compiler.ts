import { wrappedMainPath } from '@/workers/codeRunner/shared'
import { CompilerInstance } from '@/workers/codeRunner/pipeline/compilerInstance'
import type { PipelineIo, VFS } from '@/workers/codeRunner/shared'

export type CompilationResult = { objectFiles: string[]; objectFilesFs: VFS; failedCode: number | null }

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
    '-std=c++20',
]

export class Compiler {
    private workerPool: CompilerInstance[]

    private static readonly workerPoolSize = Math.min(8, navigator.hardwareConcurrency / 2)
    private static readonly cppExtensions = new Set(['.cc', '.cpp', '.cxx'])

    public constructor(clangBinary: Uint8Array, baseFs: VFS, io: PipelineIo) {
        const workerScript = new URL('./compilerInstanceWorker.ts', import.meta.url)

        this.workerPool = Array.from(
            { length: Compiler.workerPoolSize },
            (_, index) => new CompilerInstance(clangBinary, baseFs, io, workerScript, `compiler-${index}`),
        )
    }

    public async run(sourcePaths: string[], entrypointPath: string, objDir: string): Promise<CompilationResult> {
        const objectFiles: string[] = new Array(sourcePaths.length)
        const objectFilesFs: VFS = {}
        let failedCode: number | null = null
        let nextIndex = 0

        const runInstance = async (instance: CompilerInstance): Promise<void> => {
            while (failedCode === null) {
                const current = nextIndex
                nextIndex += 1
                if (current >= sourcePaths.length) return

                const sourcePath = sourcePaths[current]
                const objectAbsPath = this.getObjectPath(sourcePath, objDir)
                const compileArgs = this.createCompileArgs(sourcePath, entrypointPath, objectAbsPath)
                const result = await instance.run(compileArgs, {}, [objectAbsPath])

                if (result.exitCode !== 0) {
                    failedCode = result.exitCode
                    return
                }

                objectFiles[current] = objectAbsPath
                for (const [path, file] of Object.entries(result.outputFiles)) {
                    objectFilesFs[path] = file
                }
            }
        }

        await Promise.all(this.workerPool.map((instance) => runInstance(instance)))

        const compiledObjects = objectFiles.filter((path): path is string => typeof path === 'string')
        return { objectFiles: compiledObjects, objectFilesFs, failedCode }
    }

    public destroy(): void {
        for (const instance of this.workerPool) {
            instance.destroy()
        }
    }

    private isCppFile(path: string): boolean {
        const index = path.lastIndexOf('.')
        if (index < 0) return false
        return Compiler.cppExtensions.has(path.slice(index).toLowerCase())
    }

    private getObjectPath(sourcePath: string, objDir: string): string {
        const sanitized = sourcePath.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_')
        return `${objDir}/__obj__${sanitized}.o`
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

    private getLocalIncludeArgs(sourcePath: string): string[] {
        const idx = sourcePath.lastIndexOf('/')
        if (idx < 0) return []
        const sourceDir = sourcePath.slice(0, idx)
        if (!sourceDir) return []
        return ['-iquote', `/project/${sourceDir}`]
    }

    private computeCompileArgs(sourcePath: string, selectedEntrypointPath: string): string[] {
        const isEntrypoint = sourcePath === selectedEntrypointPath
        const entrypointIsCpp = this.isCppFile(selectedEntrypointPath)
        if (entrypointIsCpp && isEntrypoint) return ['-Dmain=__wasm_user_main']
        if (!isEntrypoint && sourcePath !== wrappedMainPath) return ['-Dmain=__wasm_non_entry_main']
        return []
    }

    private createCompileArgs(sourcePath: string, entrypointPath: string, objectAbsPath: string): string[] {
        return [
            'clang++',
            ...clangCommonArgs,
            ...this.getLocalIncludeArgs(sourcePath),
            ...this.getLangArgs(sourcePath),
            ...this.computeCompileArgs(sourcePath, entrypointPath),
            '-c',
            `/project/${sourcePath}`,
            '-o',
            objectAbsPath,
        ]
    }
}
