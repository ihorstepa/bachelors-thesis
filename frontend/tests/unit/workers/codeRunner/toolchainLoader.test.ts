import { beforeEach, describe, expect, it, vi } from 'vitest'

const tarState = vi.hoisted(() => ({ parseTar: vi.fn() }))
vi.mock('nanotar', () => ({ parseTar: tarState.parseTar }))

const loaderState = vi.hoisted(() => ({ loadCachedBinary: vi.fn() }))
vi.mock('@/workers/utils/cachedBinaryLoader', () => ({ loadCachedBinary: loaderState.loadCachedBinary }))

import { ToolchainLoader } from '@/workers/codeRunner/toolchainLoader'

describe('workers/codeRunner/ToolchainLoader', () => {
    beforeEach(() => {
        tarState.parseTar.mockReset()
        loaderState.loadCachedBinary.mockReset()
    })

    it('loads the three binaries from the correct paths', async () => {
        loaderState.loadCachedBinary.mockResolvedValue(new Uint8Array([0]))
        tarState.parseTar.mockReturnValue([])

        await ToolchainLoader.load()

        expect(loaderState.loadCachedBinary).toHaveBeenCalledWith(expect.any(String), '/binaries/clang.wasm.gz')
        expect(loaderState.loadCachedBinary).toHaveBeenCalledWith(expect.any(String), '/binaries/wasm-ld.wasm.gz')
        expect(loaderState.loadCachedBinary).toHaveBeenCalledWith(expect.any(String), '/binaries/sysroot.tar.gz')
    })

    it('returns clang and wasm-ld binaries as loaded', async () => {
        const clang = new Uint8Array([1, 2, 3])
        const wasmLd = new Uint8Array([4, 5, 6])
        const sysroot = new Uint8Array([7])

        loaderState.loadCachedBinary.mockImplementation((_cache: string, path: string) => {
            if (path.includes('clang')) return Promise.resolve(clang)
            if (path.includes('wasm-ld')) return Promise.resolve(wasmLd)
            return Promise.resolve(sysroot)
        })
        tarState.parseTar.mockReturnValue([])

        const toolchain = await ToolchainLoader.load()

        expect(toolchain.clangBinary).toBe(clang)
        expect(toolchain.wasmLdBinary).toBe(wasmLd)
    })

    it('builds sysrootFs from parsed tar entries', async () => {
        loaderState.loadCachedBinary.mockResolvedValue(new Uint8Array([0]))
        tarState.parseTar.mockReturnValue([
            { type: 'file', name: './include/stdio.h', data: new Uint8Array([10, 11]) },
            { type: 'file', name: 'lib/libc.a', data: new Uint8Array([20]) },
        ])

        const toolchain = await ToolchainLoader.load()

        expect(toolchain.sysrootFs['/sysroot/include/stdio.h']).toBeDefined()
        expect(toolchain.sysrootFs['/sysroot/lib/libc.a']).toBeDefined()
    })

    it('strips leading ./ from tar entry names', async () => {
        loaderState.loadCachedBinary.mockResolvedValue(new Uint8Array([0]))
        tarState.parseTar.mockReturnValue([{ type: 'file', name: './foo/bar.h', data: new Uint8Array([1]) }])

        const toolchain = await ToolchainLoader.load()

        expect(toolchain.sysrootFs['/sysroot/foo/bar.h']).toBeDefined()
        expect(toolchain.sysrootFs['/sysroot/./foo/bar.h']).toBeUndefined()
    })

    it('skips tar entries that are not files or have no data', async () => {
        loaderState.loadCachedBinary.mockResolvedValue(new Uint8Array([0]))
        tarState.parseTar.mockReturnValue([
            { type: 'dir', name: 'include/', data: undefined },
            { type: 'file', name: '', data: undefined },
        ])

        const toolchain = await ToolchainLoader.load()

        expect(Object.keys(toolchain.sysrootFs)).toHaveLength(0)
    })

    it('propagates errors from loadCachedBinary', async () => {
        loaderState.loadCachedBinary.mockRejectedValue(new Error('network error'))

        await expect(ToolchainLoader.load()).rejects.toThrow('network error')
    })
})
