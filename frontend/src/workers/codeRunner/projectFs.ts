import mainWrapper from '@/workers/codeRunner/mainWrapper'
import { toBinaryFile, type ProjectFile, type VFS, wrappedMainPath } from '@/workers/codeRunner/shared'

export class ProjectFs {
    readonly sourcePaths: string[]
    readonly entrypointPath: string
    readonly objDir: string
    readonly wasmOutAbsPath: string
    readonly buildFs: VFS

    private static readonly cppExtensions = new Set(['.cc', '.cpp', '.cxx'])
    private static readonly sourceExtensions = new Set(['.c', '.cc', '.cpp', '.cxx'])

    constructor(files: ProjectFile[], entrypoint: string, sysrootFs: VFS) {
        const { filesByPath, sourcePaths } = ProjectFs.buildProjectIndex(files)
        if (sourcePaths.length === 0) {
            throw new Error('No C/C++ source files found in the project')
        }

        if (!sourcePaths.includes(entrypoint)) {
            throw new Error(`Entrypoint "${entrypoint}" was not found in project source files`)
        }

        sourcePaths.sort()

        if (ProjectFs.cppExtensions.has(ProjectFs.getExtension(entrypoint))) {
            filesByPath[wrappedMainPath] = new TextEncoder().encode(mainWrapper)
            sourcePaths.push(wrappedMainPath)
        }

        const entrypointDir = entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/')) : ''
        const buildDir = entrypointDir ? `__build__/${entrypointDir}` : '__build__'

        this.sourcePaths = sourcePaths
        this.entrypointPath = entrypoint
        this.objDir = `/project/${buildDir}/obj`
        this.wasmOutAbsPath = `/project/${buildDir}/main.wasm`
        this.buildFs = ProjectFs.buildInitialFs(filesByPath, sysrootFs)
    }

    private static getExtension(path: string): string {
        const index = path.lastIndexOf('.')
        return index < 0 ? '' : path.slice(index).toLowerCase()
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

            const ext = ProjectFs.getExtension(path)
            if (!ProjectFs.sourceExtensions.has(ext)) continue

            sourcePaths.push(path)
        }

        return { filesByPath, sourcePaths }
    }

    private static buildInitialFs(projectFiles: Record<string, Uint8Array>, sysrootFs: VFS): VFS {
        const fs: VFS = { ...sysrootFs }

        for (const [path, content] of Object.entries(projectFiles)) {
            const absolutePath = `/project/${path}`
            fs[absolutePath] = toBinaryFile(absolutePath, content)
        }

        return fs
    }
}
