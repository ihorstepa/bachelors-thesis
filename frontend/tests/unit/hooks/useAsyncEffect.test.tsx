import { beforeEach, describe, expect, it, vi } from 'vitest'

const reactHooks = vi.hoisted(() => ({
    useEffect: vi.fn(),
}))

vi.mock('react', () => ({
    useEffect: reactHooks.useEffect,
}))

import useAsyncEffect from '@/hooks/useAsyncEffect'

describe('useAsyncEffect', () => {
    beforeEach(() => {
        reactHooks.useEffect.mockClear()
    })

    it('registers useEffect with provided deps and runs effect with isAborted=false', async () => {
        const effect = vi.fn(async (isAborted: () => boolean) => {
            expect(isAborted()).toBe(false)
        })

        useAsyncEffect(effect, undefined, [1, 'a'])

        expect(reactHooks.useEffect).toHaveBeenCalledOnce()
        const [registeredEffect, deps] = reactHooks.useEffect.mock.calls[0]
        expect(deps).toEqual([1, 'a'])

        const cleanup = registeredEffect() as () => void
        await Promise.resolve()

        expect(effect).toHaveBeenCalledOnce()
        expect(typeof cleanup).toBe('function')
    })

    it('cleanup marks effect as aborted and calls destroy', async () => {
        let isAbortedRef: (() => boolean) | null = null
        const destroy = vi.fn()
        const effect = vi.fn(async (isAborted: () => boolean) => {
            isAbortedRef = isAborted
        })

        useAsyncEffect(effect, destroy, [2])
        const [registeredEffect] = reactHooks.useEffect.mock.calls[0]
        const cleanup = registeredEffect() as () => void

        await Promise.resolve()
        expect(isAbortedRef).not.toBeNull()
        expect(isAbortedRef!()).toBe(false)

        cleanup()

        expect(isAbortedRef!()).toBe(true)
        expect(destroy).toHaveBeenCalledOnce()
    })

    it('swallows rejected effect promise after cleanup', async () => {
        let rejectAsync: ((error: unknown) => void) | null = null
        const effect = vi.fn(
            () =>
                new Promise<void>((_resolve, reject) => {
                    rejectAsync = reject
                }),
        )

        useAsyncEffect(effect, undefined, [3])
        const [registeredEffect] = reactHooks.useEffect.mock.calls[0]
        const cleanup = registeredEffect() as () => void

        cleanup()
        rejectAsync!(new Error('ignored'))

        await Promise.resolve()
        expect(effect).toHaveBeenCalledOnce()
    })

    it('passes undefined deps through to useEffect', () => {
        const effect = vi.fn(async () => undefined)

        useAsyncEffect(effect)

        expect(reactHooks.useEffect).toHaveBeenCalledOnce()
        const [, deps] = reactHooks.useEffect.mock.calls[0]
        expect(deps).toBeUndefined()
    })
})
