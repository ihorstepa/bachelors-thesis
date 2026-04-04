import type { Instance, Wasmer } from '@wasmer/sdk'

export type RunResult = { ok: boolean; code: number }
export type ProjectFile = { path: string; content: string }
export type ProjectIndex = {
    filesByPath: Record<string, Uint8Array>
    normalizedToPath: Map<string, string>
}

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

export const sourceExtensions = new Set(['.c', '.cc', '.cpp', '.cxx'])
export const headerExtensions = new Set(['.h', '.hh', '.hpp', '.hxx'])
export const wrappedMainPath = '__build__/__runtime__/__wrapped_main__.cpp'

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

export function buildProjectIndex(files: ProjectFile[]): ProjectIndex {
    const filesByPath: Record<string, Uint8Array> = {}
    const encoder = new TextEncoder()
    const normalizedToPath = new Map<string, string>()

    for (const { path, content } of files) {
        filesByPath[path] = encoder.encode(content)

        const index = path.lastIndexOf('.')
        if (index < 0) continue

        const ext = path.slice(index).toLowerCase()
        if (!sourceExtensions.has(ext)) continue

        const normalizedPath = normalizePath(path)
        const existingPath = normalizedToPath.get(normalizedPath)
        if (existingPath && existingPath !== path) {
            throw new Error(
                `Ambiguous source paths after normalization: "${existingPath}" and "${path}" both map to "${normalizedPath}"`,
            )
        }
        normalizedToPath.set(normalizedPath, path)
    }

    return { filesByPath, normalizedToPath }
}

export function resolveEntrypoint(
    entrypoint: string,
    normalizedToPath: Map<string, string>,
): { normalizedEntrypoint: string; resolvedEntrypointPath: string } {
    const normalizedEntrypoint = normalizePath(entrypoint)
    const resolvedEntrypointPath = normalizedToPath.get(normalizedEntrypoint)
    if (!resolvedEntrypointPath) {
        throw new Error(`Entrypoint "${entrypoint}" was not found in project source files`)
    }

    return { normalizedEntrypoint, resolvedEntrypointPath }
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

export function requireEntrypoint(module: Wasmer, name: string): NonNullable<Wasmer['entrypoint']> {
    if (!module.entrypoint) throw new Error(`Loaded ${name} module has no entrypoint`)
    return module.entrypoint
}

export type StreamCallback = (text: string) => void

export function streamOutput(instance: Instance, onStdout: StreamCallback, onStderr: StreamCallback): void {
    const pipe = (stream: ReadableStream<Uint8Array>, cb: StreamCallback) => {
        void (async () => {
            const decoder = new TextDecoder()
            const reader = stream.getReader()
            try {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    if (value) {
                        const text = decoder.decode(value, { stream: true })
                        if (text) cb(text)
                    }
                }
                const tail = decoder.decode()
                if (tail) cb(tail)
            } finally {
                reader.releaseLock()
            }
        })()
    }

    pipe(instance.stdout, onStdout)
    pipe(instance.stderr, onStderr)
}
