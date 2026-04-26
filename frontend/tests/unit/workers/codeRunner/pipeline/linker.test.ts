import type { WASIFS } from '@runno/wasi'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const wasiState = vi.hoisted(() => ({
    start: vi.fn(),
}))

vi.mock('@runno/wasi', () => ({
    WASI: {
        start: wasiState.start,
    },
}))

import { Linker } from '@/workers/codeRunner/pipeline/linker'

describe('workers/codeRunner/pipeline/Linker', () => {
    beforeEach(() => {
        wasiState.start.mockReset()
    })

    it('invokes WASI.start with merged fs and linker args including output path', async () => {
        wasiState.start.mockResolvedValue({ exitCode: 0, fs: { '/project/out/main.wasm': { mode: 'binary' } } })

        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }

        const linker = new Linker(
            new Uint8Array([1, 2, 3]),
            { '/sysroot/lib/start.o': { mode: 'binary' } as never },
            io,
        )

        const fs: WASIFS = {
            '/project/build/a.o': { mode: 'binary' } as never,
            '/project/build/b.o': { mode: 'binary' } as never,
        }

        const result = await linker.linkObjects(
            fs,
            ['/project/build/a.o', '/project/build/b.o'],
            '/project/out/main.wasm',
        )

        expect(result.exitCode).toBe(0)
        expect(wasiState.start).toHaveBeenCalledOnce()

        const [responseArg, optionsArg] = wasiState.start.mock.calls[0]
        expect(responseArg).toBeInstanceOf(Response)
        expect(optionsArg.args).toContain('/project/build/a.o')
        expect(optionsArg.args).toContain('/project/build/b.o')
        expect(optionsArg.args.slice(-2)).toEqual(['-o', '/project/out/main.wasm'])
        expect(optionsArg.fs['/sysroot/lib/start.o']).toBeDefined()
        expect(optionsArg.fs['/project/build/a.o']).toBeDefined()
        expect(optionsArg.stdout).toBe(io.onStdout)
        expect(optionsArg.stderr).toBe(io.onStderr)
    })

    it('propagates linker execution failures from WASI.start', async () => {
        const err = new Error('link failed')
        wasiState.start.mockRejectedValue(err)

        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const linker = new Linker(new Uint8Array([1]), {}, io)

        await expect(linker.linkObjects({}, [], '/project/out/main.wasm')).rejects.toThrow('link failed')
    })
})
