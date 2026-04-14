import type { BinaryWASIFile, WASIExecutionResult, WASIFile } from '@runno/wasi'

export type RunResult = { ok: boolean; code: number }
export type ProjectFile = { path: string; content: string }
export type VFS = Record<string, WASIFile>

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

export type PipelineIo = {
    readonly onStdout: (text: string) => void
    readonly onStderr: (text: string) => void
    readonly onStdinReady: () => void
}

export type CompilerInstanceInitMessage = {
    type: 'init'
    binary: Uint8Array
    baseFs: VFS
}

export type CompilerInstanceRunMessage = {
    type: 'run'
    id: number
    args: string[]
    env: Record<string, string>
    extraFs: VFS
    outputPaths: string[]
}

export type CompilerInstanceInMessage = CompilerInstanceInitMessage | CompilerInstanceRunMessage

export type CompilerInstanceOutMessage =
    | { type: 'stdout'; id: number; text: string }
    | { type: 'stderr'; id: number; text: string }
    | { type: 'done'; id: number; exitCode: number; outputFiles: VFS }
    | { type: 'error'; id: number; message: string }

export const headerExtensions = new Set(['.h', '.hh', '.hpp', '.hxx'])
export const wrappedMainPath = '__build__/__runtime__/__wrapped_main__.cpp'

export function toBinaryFile(path: string, content: Uint8Array): BinaryWASIFile {
    const now = new Date()
    return {
        path,
        timestamps: { access: now, change: now, modification: now },
        mode: 'binary',
        content,
    }
}

export function toTextFile(path: string, content: string): WASIFile {
    const now = new Date()
    return {
        path,
        timestamps: { access: now, change: now, modification: now },
        mode: 'string',
        content,
    }
}

export function mapRunResult(result: WASIExecutionResult): RunResult {
    return { ok: result.exitCode === 0, code: result.exitCode }
}

export function normalizePath(path: string): string {
    const parts: string[] = []
    const cleaned = path.replace(/\\/g, '/')

    for (const rawPart of cleaned.split('/')) {
        const part = rawPart.trim()
        if (!part || part === '.') continue

        if (part === '..') {
            if (parts.length) parts.pop()
            continue
        }
        parts.push(part)
    }
    return parts.join('/')
}

export function normalizeError(error: unknown): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string') return error
    if (error && typeof error === 'object') {
        const msg = (error as { message?: unknown }).message
        if (typeof msg === 'string' && msg.trim()) return msg
        try {
            return JSON.stringify(error)
        } catch {
            return String(error)
        }
    }
    return 'Unknown error'
}
