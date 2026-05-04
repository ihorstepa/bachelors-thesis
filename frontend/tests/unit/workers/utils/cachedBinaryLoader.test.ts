import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadCachedBinary } from '@/workers/utils/cachedBinaryLoader'

type CacheMock = {
    match: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
}

describe('workers/utils/loadCachedBinary', () => {
    let cache: CacheMock

    beforeEach(() => {
        cache = {
            match: vi.fn(),
            put: vi.fn(),
        }
        vi.stubGlobal('caches', {
            open: vi.fn(async () => cache),
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    it('returns bytes from Cache API when available and skips fetch', async () => {
        cache.match.mockResolvedValue(new Response(new Uint8Array([9, 8, 7]).buffer))
        const fetchSpy = vi.fn()
        vi.stubGlobal('fetch', fetchSpy)

        const bytes = await loadCachedBinary('toolchain-v1', '/binaries/clang.wasm.gz')

        expect(Array.from(bytes)).toEqual([9, 8, 7])
        expect(fetchSpy).not.toHaveBeenCalled()
        expect(cache.match).toHaveBeenCalledWith('/binaries/clang.wasm.gz?decompressed')
    })

    it('fetches bytes on cache miss and stores decompressed payload in cache', async () => {
        cache.match.mockResolvedValue(null)
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(new Uint8Array([1, 2, 3]).buffer)),
        )

        const bytes = await loadCachedBinary('toolchain-v1', '/binaries/wasm-ld.wasm.gz')

        expect(Array.from(bytes)).toEqual([1, 2, 3])
        expect(cache.put).toHaveBeenCalledOnce()
        expect(cache.put.mock.calls[0][0]).toBe('/binaries/wasm-ld.wasm.gz?decompressed')
    })

    it('throws a clear error for gzip assets when DecompressionStream is unavailable', async () => {
        cache.match.mockResolvedValue(null)
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(new Uint8Array([0x1f, 0x8b, 0]).buffer)),
        )
        vi.stubGlobal('DecompressionStream', undefined)

        await expect(loadCachedBinary('toolchain-v1', '/binaries/sysroot.tar.gz')).rejects.toThrow(
            'This browser does not support DecompressionStream',
        )
    })

    it('continues with fetch even when Cache API read fails', async () => {
        vi.stubGlobal('caches', {
            open: vi.fn(async () => {
                throw new Error('cache not available')
            }),
        })
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(new Uint8Array([3, 4]).buffer)),
        )

        const bytes = await loadCachedBinary('toolchain-v1', '/binaries/clang.wasm.gz')

        expect(Array.from(bytes)).toEqual([3, 4])
    })
})
