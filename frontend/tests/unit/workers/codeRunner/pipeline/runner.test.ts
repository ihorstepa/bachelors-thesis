import type { WASIFS } from '@runno/wasi'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const wasiState = vi.hoisted(() => ({
    instances: [] as Array<{
        start: ReturnType<typeof vi.fn>
        pushStdin: ReturnType<typeof vi.fn>
        triggerStdinWait: () => void
    }>,
    nextExitCode: 0,
    createStartPromise: null as null | (() => Promise<{ exitCode: number }>),
}))

vi.mock('@runno/wasi', () => ({
    WASIWorkerHost: class MockWASIWorkerHost {
        public readonly stdinBuffer = new ArrayBuffer(4)
        public readonly pushStdin = vi.fn(async () => {
            new DataView(this.stdinBuffer).setInt32(0, 0)
        })
        public readonly start = vi.fn(async () => {
            if (wasiState.createStartPromise) {
                return await wasiState.createStartPromise()
            }
            return { exitCode: wasiState.nextExitCode }
        })

        public constructor(
            public readonly binary: Uint8Array,
            public readonly options: {
                env: Record<string, string>
                fs: WASIFS
                isTTY: boolean
                stdout: (text: string) => void
                stderr: (text: string) => void
                onStdinWait: () => void
            },
        ) {
            wasiState.instances.push(this)
        }

        public triggerStdinWait(): void {
            this.options.onStdinWait()
        }
    },
}))

import { Runner } from '@/workers/codeRunner/pipeline/runner'
import { toBinaryFile } from '@/workers/codeRunner/shared'

describe('workers/codeRunner/pipeline/Runner', () => {
    beforeEach(() => {
        wasiState.instances.splice(0)
        wasiState.nextExitCode = 0
        wasiState.createStartPromise = null
    })

    it('runs wasm binary and returns exit code', async () => {
        wasiState.nextExitCode = 7
        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const runner = new Runner(io)
        const fs: WASIFS = {
            '/project/build/main.wasm': toBinaryFile('/project/build/main.wasm', new Uint8Array([1, 2, 3])),
        }

        const exitCode = await runner.run(fs, '/project/build/main.wasm')

        expect(exitCode).toBe(7)
        expect(wasiState.instances).toHaveLength(1)
        expect(wasiState.instances[0].start).toHaveBeenCalledOnce()
    })

    it('throws when wasm path is missing or not binary', async () => {
        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const runner = new Runner(io)

        await expect(runner.run({} as WASIFS, '/project/missing.wasm')).rejects.toThrow(
            'Expected a binary file at /project/missing.wasm',
        )
    })

    it('ignores pushStdin when no worker is running', async () => {
        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const runner = new Runner(io)

        await expect(runner.pushStdin('hello')).resolves.toBeUndefined()
    })

    it('re-opens stdin after drain when onStdinWait fired while already open', async () => {
        let resolveStart: ((value: { exitCode: number }) => void) | null = null
        wasiState.createStartPromise = () =>
            new Promise<{ exitCode: number }>((resolve) => {
                resolveStart = resolve
            })

        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const runner = new Runner(io)
        const fs: WASIFS = {
            '/project/build/main.wasm': toBinaryFile('/project/build/main.wasm', new Uint8Array([1, 2, 3])),
        }

        const runPromise = runner.run(fs, '/project/build/main.wasm')
        const worker = wasiState.instances[0]

        worker.triggerStdinWait()
        worker.triggerStdinWait()
        expect(io.onStdinReady).toHaveBeenCalledTimes(1)

        await runner.pushStdin('line 1')

        expect(worker.pushStdin).toHaveBeenCalledWith('line 1')
        expect(io.onStdinReady).toHaveBeenCalledTimes(2)

        resolveStart!({ exitCode: 0 })
        await runPromise
    })
})
