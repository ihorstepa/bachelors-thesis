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

export function isObject(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object'
}

export function assertNever(value: never): never {
    throw new Error(`Unexpected value: ${value}`)
}
