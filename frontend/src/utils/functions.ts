import { normalizeHttpError } from '@/errors/http'

export async function withTimeout<T>(timeoutMs: number, task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await task(controller.signal)
    } catch (error) {
        throw normalizeHttpError(error)
    } finally {
        clearTimeout(timeout)
    }
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

export function isObject(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object'
}

export function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${value}`)
}
