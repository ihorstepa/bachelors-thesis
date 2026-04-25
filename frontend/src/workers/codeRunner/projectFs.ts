import type { WASIFS } from '@runno/wasi'

import { mainWrapper, wrappedMainPath } from '@/workers/codeRunner/mainWrapper'
import type { ProjectFile } from '@/workers/codeRunner/shared'
import { isCppFile, isSourceFile, projectPath,toBinaryFile } from '@/workers/codeRunner/shared'

export class ProjectFs {
    readonly initialFs: WASIFS
    readonly sourcePaths: string[]
    readonly entrypointPath: string
    readonly objDirPath: string
    readonly wasmOutPath: string

    constructor(files: ProjectFile[], entrypoint: string, sysroot: WASIFS) {
        const { filesByPath, sourcePaths } = ProjectFs.buildProjectIndex(files)

        if (sourcePaths.length === 0) {
            throw new Error('No source files found')
        }
        if (!sourcePaths.includes(entrypoint)) {
            throw new Error(`Entrypoint "${entrypoint}" was not found in source files`)
        }

        // Sort for deterministic processing order
        sourcePaths.sort()

        // C++ projects need an extra wrapper for certain features
        if (isCppFile(entrypoint)) {
            filesByPath[wrappedMainPath] = new TextEncoder().encode(mainWrapper)
            sourcePaths.push(wrappedMainPath)
        }

        const entrypointDir = entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/')) : ''
        const buildDir = entrypointDir ? `__build__/${entrypointDir}` : '__build__'

        this.sourcePaths = sourcePaths
        this.entrypointPath = entrypoint
        this.objDirPath = `${projectPath}/${buildDir}/obj`
        this.wasmOutPath = `${projectPath}/${buildDir}/main.wasm`
        this.initialFs = ProjectFs.buildInitialFs(filesByPath, sysroot)
    }

    private static buildProjectIndex(files: ProjectFile[]): {
        filesByPath: Record<string, Uint8Array>
        sourcePaths: string[]
    } {
        const filesByPath: Record<string, Uint8Array> = {}
        const encoder = new TextEncoder()
        const sourcePaths: string[] = []

        for (const { path, content } of files) {
            filesByPath[path] = encoder.encode(content)
            if (!isSourceFile(path)) continue
            sourcePaths.push(path)
        }

        return { filesByPath, sourcePaths }
    }

    private static buildInitialFs(projectFiles: Record<string, Uint8Array>, sysroot: WASIFS): WASIFS {
        const fs: WASIFS = { ...sysroot }

        for (const [path, content] of Object.entries(projectFiles)) {
            const absolutePath = `${projectPath}/${path}`
            fs[absolutePath] = toBinaryFile(absolutePath, content)
        }

        return fs
    }
}
