import { beforeEach, describe, expect, it, vi } from 'vitest'

const tarState = vi.hoisted(() => ({
    parseTar: vi.fn(),
}))

vi.mock('nanotar', () => ({
    parseTar: tarState.parseTar,
}))

import { ToolchainLoader } from '@/workers/codeRunner/toolchainLoader'

type CacheLike = {
    match: ReturnType<typeof vi.fn>
    put: ReturnType<typeof vi.fn>
}

function makeCache(): CacheLike {
    return {
        match: vi.fn(),
        put: vi.fn(),
    }
}

function responseFromBytes(bytes: number[]): Response {
    return new Response(new Uint8Array(bytes), { status: 200 })
}

describe('workers/codeRunner/ToolchainLoader', () => {
    beforeEach(() => {
        tarState.parseTar.mockReset()
        vi.unstubAllGlobals()
    })

    it('uses cached decompressed binaries when available', async () => {
        const cache = makeCache()
        cache.match.mockImplementation(async (key: string) => {
            if (key.includes('clang.wasm.gz')) return responseFromBytes([1, 2, 3])
            if (key.includes('wasm-ld.wasm.gz')) return responseFromBytes([4, 5, 6])
            if (key.includes('sysroot.tar.gz')) return responseFromBytes([7, 8, 9])
            return undefined
        })

        const open = vi.fn(async () => cache)
        const fetch = vi.fn()

        tarState.parseTar.mockReturnValue([{ type: 'file', name: './include/stdio.h', data: new Uint8Array([11, 12]) }])

        vi.stubGlobal('caches', { open })
        vi.stubGlobal('fetch', fetch)

        const toolchain = await ToolchainLoader.load()

        expect(fetch).not.toHaveBeenCalled()
        expect(cache.put).not.toHaveBeenCalled()
        expect(toolchain.clangBinary).toEqual(new Uint8Array([1, 2, 3]))
        expect(toolchain.wasmLdBinary).toEqual(new Uint8Array([4, 5, 6]))
        expect(toolchain.sysrootFs['/sysroot/include/stdio.h']).toBeDefined()
    })

    it('fetches binaries and stores decompressed bytes in cache on cache miss', async () => {
        const cache = makeCache()
        cache.match.mockResolvedValue(undefined)

        const open = vi.fn(async () => cache)
        const fetch = vi.fn(async (path: string) => {
            if (path === '/binaries/clang.wasm.gz') return responseFromBytes([10])
            if (path === '/binaries/wasm-ld.wasm.gz') return responseFromBytes([20])
            if (path === '/binaries/sysroot.tar.gz') return responseFromBytes([30])
            return new Response(null, { status: 404 })
        })

        tarState.parseTar.mockReturnValue([{ type: 'file', name: './lib/a.h', data: new Uint8Array([99]) }])

        vi.stubGlobal('caches', { open })
        vi.stubGlobal('fetch', fetch)

        const toolchain = await ToolchainLoader.load()

        expect(fetch).toHaveBeenCalledTimes(3)
        expect(cache.put).toHaveBeenCalledTimes(3)
        expect(toolchain.clangBinary).toEqual(new Uint8Array([10]))
        expect(toolchain.wasmLdBinary).toEqual(new Uint8Array([20]))
        expect(toolchain.sysrootFs['/sysroot/lib/a.h']).toBeDefined()
    })

    it('falls back to fetch when Cache API is unavailable', async () => {
        const fetch = vi.fn(async (path: string) => {
            if (path === '/binaries/clang.wasm.gz') return responseFromBytes([1])
            if (path === '/binaries/wasm-ld.wasm.gz') return responseFromBytes([2])
            if (path === '/binaries/sysroot.tar.gz') return responseFromBytes([3])
            return new Response(null, { status: 404 })
        })

        tarState.parseTar.mockReturnValue([])

        vi.stubGlobal('caches', {
            open: vi.fn(async () => {
                throw new Error('no cache')
            }),
        })
        vi.stubGlobal('fetch', fetch)

        const toolchain = await ToolchainLoader.load()

        expect(fetch).toHaveBeenCalledTimes(3)
        expect(toolchain.clangBinary).toEqual(new Uint8Array([1]))
        expect(toolchain.wasmLdBinary).toEqual(new Uint8Array([2]))
        expect(Object.keys(toolchain.sysrootFs)).toEqual([])
    })

    it('throws when an underlying fetch response is not ok', async () => {
        const cache = makeCache()
        cache.match.mockResolvedValue(undefined)

        vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
        vi.stubGlobal(
            'fetch',
            vi.fn(async (path: string) => {
                if (path === '/binaries/clang.wasm.gz') {
                    return new Response(null, { status: 500, statusText: 'Server Error' })
                }
                return responseFromBytes([1])
            }),
        )
        tarState.parseTar.mockReturnValue([])

        await expect(ToolchainLoader.load()).rejects.toThrow(
            'Failed to fetch /binaries/clang.wasm.gz: 500 Server Error',
        )
    })
})
