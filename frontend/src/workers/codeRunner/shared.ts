import type { BinaryWASIFile, WASIFile, WASIFS } from '@runno/wasi'

export type RunResult = { ok: boolean; code: number }
export type ProjectFile = { path: string; content: string }

export type WorkerInMessage =
    | { type: 'start'; files: ProjectFile[]; entrypoint: string }
    | { type: 'stdin'; bytes: Uint8Array }
export type WorkerOutMessage =
    | { type: 'phase'; phase: 'compiling' | 'linking' | 'running' }
    | { type: 'stdout'; text: string }
    | { type: 'stderr'; text: string }
    | { type: 'stdin_ready' }
    | { type: 'done'; ok: boolean; code: number }
    | { type: 'error'; message: string }
export type CompilerInstanceInMessage =
    | { type: 'init'; binary: Uint8Array; fs: WASIFS }
    | { type: 'run'; id: number; args: string[]; outputPath: string }
export type CompilerInstanceOutMessage =
    | { type: 'stdout'; id: number; text: string }
    | { type: 'stderr'; id: number; text: string }
    | { type: 'done'; id: number; exitCode: number; objectFile: WASIFile }
    | { type: 'error'; id: number; message: string }

export type PipelineIo = {
    readonly onStdout: (text: string) => void
    readonly onStderr: (text: string) => void
    readonly onStdinReady: () => void
}

export const projectPath = '/project'
const cppExtensions = new Set(['.cpp', '.cxx', '.cc'])
const sourceExtensions = new Set(['.c', ...cppExtensions])

function hasExtension(path: string, extensions: Set<string>): boolean {
    const index = path.lastIndexOf('.')
    if (index < 0) return false
    return extensions.has(path.slice(index).toLowerCase())
}

export function isSourceFile(path: string): boolean {
    return hasExtension(path, sourceExtensions)
}

export function isCppFile(path: string): boolean {
    return hasExtension(path, cppExtensions)
}

export function toBinaryFile(path: string, content: Uint8Array): BinaryWASIFile {
    const now = new Date()
    return {
        path,
        timestamps: { access: now, change: now, modification: now },
        mode: 'binary',
        content,
    }
}
