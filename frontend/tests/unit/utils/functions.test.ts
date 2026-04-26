import { describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/errors/http'
import { assertNever, isObject, normalizeError, normalizePath, withTimeout } from '@/utils/functions'

describe('utils/functions', () => {
    describe('normalizePath', () => {
        it('normalizes separators, trims segments, and resolves dot segments', () => {
            expect(normalizePath('src\\./core/../utils//functions.ts')).toBe('src/utils/functions.ts')
            expect(normalizePath('  ./a/b/../c  ')).toBe('a/c')
        })

        it('does not traverse above root when resolving parent segments', () => {
            expect(normalizePath('../../a/../b')).toBe('b')
            expect(normalizePath('../..')).toBe('')
        })
    })

    describe('normalizeError', () => {
        it('returns message for Error and string values', () => {
            expect(normalizeError(new Error('boom'))).toBe('boom')
            expect(normalizeError('plain')).toBe('plain')
        })

        it('uses object message when available, otherwise stringifies object-like values', () => {
            expect(normalizeError({ message: 'from object' })).toBe('from object')
            expect(normalizeError({ detail: 1 })).toBe('{"detail":1}')
        })

        it('handles non-serializable objects and unknown values', () => {
            const circular: { self?: unknown } = {}
            circular.self = circular

            expect(normalizeError(circular)).toBe('[object Object]')
            expect(normalizeError(undefined)).toBe('Unknown error')
            expect(normalizeError(null)).toBe('Unknown error')
        })
    })

    describe('isObject', () => {
        it('returns true only for non-null object values', () => {
            expect(isObject({})).toBe(true)
            expect(isObject([])).toBe(true)
            expect(isObject(null)).toBe(false)
            expect(isObject('x')).toBe(false)
            expect(isObject(1)).toBe(false)
        })
    })

    describe('assertNever', () => {
        it('always throws with the unexpected value text', () => {
            expect(() => assertNever('bad' as never)).toThrow('Unexpected value: bad')
        })
    })

    describe('withTimeout', () => {
        it('returns task result and provides an AbortSignal', async () => {
            const task = vi.fn(async (signal: AbortSignal) => {
                expect(signal.aborted).toBe(false)
                return 42
            })

            await expect(withTimeout(1_000, task)).resolves.toBe(42)
            expect(task).toHaveBeenCalledOnce()
        })

        it('normalizes aborts to REQUEST_TIMEOUT errors', async () => {
            vi.useFakeTimers()
            const task = vi.fn(
                (signal: AbortSignal) =>
                    new Promise<never>((_resolve, reject) => {
                        signal.addEventListener('abort', () => {
                            reject(new DOMException('aborted', 'AbortError'))
                        })
                    }),
            )

            const run = withTimeout(10, task)
            await vi.advanceTimersByTimeAsync(10)

            await expect(run).rejects.toMatchObject({
                status: 408,
                type: 'REQUEST_TIMEOUT',
                message: 'Request timed out. Please try again.',
            })
            vi.useRealTimers()
        })

        it('keeps HttpError instances unchanged and normalizes network errors', async () => {
            const httpError = new HttpError(403, 'FORBIDDEN', 'Forbidden')

            await expect(withTimeout(100, async () => Promise.reject(httpError))).rejects.toBe(httpError)
            await expect(withTimeout(100, async () => Promise.reject(new TypeError('network')))).rejects.toMatchObject({
                status: 0,
                type: 'NETWORK_ERROR',
            })
        })
    })
})
