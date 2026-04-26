import type { WASIFS } from '@runno/wasi'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const compilerState = vi.hoisted(() => ({
    instances: [] as Array<{
        run: ReturnType<typeof vi.fn>
        kill: ReturnType<typeof vi.fn>
    }>,
    runImpl: null as
        | null
        | ((args: string[], outputPath: string) => Promise<{ exitCode: number; objectFile: unknown }>),
}))

vi.mock('@/workers/codeRunner/pipeline/compilerInstance', () => ({
    CompilerInstance: class MockCompilerInstance {
        public readonly run = vi.fn(async (args: string[], outputPath: string) => {
            if (!compilerState.runImpl) {
                return {
                    exitCode: 0,
                    objectFile: { path: outputPath, mode: 'binary', content: new Uint8Array([1]) },
                }
            }
            return await compilerState.runImpl(args, outputPath)
        })
        public readonly kill = vi.fn()

        public constructor(
            clangBinary: Uint8Array,
            fs: WASIFS,
            io: { onStdout: (text: string) => void; onStderr: (text: string) => void; onStdinReady: () => void },
            name: string,
        ) {
            void clangBinary
            void fs
            void io
            void name
            compilerState.instances.push(this)
        }
    },
}))

import { wrappedMainPath } from '@/workers/codeRunner/mainWrapper'
import { Compiler } from '@/workers/codeRunner/pipeline/compiler'

describe('workers/codeRunner/pipeline/Compiler', () => {
    beforeEach(() => {
        compilerState.instances.splice(0)
        compilerState.runImpl = null
    })

    it('compiles sources and returns object paths in source order', async () => {
        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const compiler = new Compiler(new Uint8Array([9]), {}, io)

        const result = await compiler.run(['src/main.c', 'lib/math.cpp'], 'src/main.c', '/project/build/obj')

        expect(result.exitCode).toBe(0)
        expect(result.objectFilePaths).toHaveLength(2)
        expect(result.objectFilePaths[0]).toContain('/project/build/obj/__obj__src_main.o')
        expect(result.objectFilePaths[1]).toContain('/project/build/obj/__obj__lib_math.o')
        expect(Object.keys(result.fs)).toHaveLength(2)
        expect(compilerState.instances.every((i) => i.kill.mock.calls.length === 1)).toBe(true)
    })

    it('uses C/C++ language flags and main-rename flags for C++ entrypoint builds', async () => {
        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const compiler = new Compiler(new Uint8Array([9]), {}, io)

        await compiler.run(['src/app.cpp', 'src/helper.cpp', wrappedMainPath], 'src/app.cpp', '/project/build/obj')

        const allArgs = compilerState.instances.flatMap((instance) =>
            instance.run.mock.calls.map((call) => call[0] as string[]),
        )

        const appArgs = allArgs.find((args) => args.includes('/project/src/app.cpp'))
        const helperArgs = allArgs.find((args) => args.includes('/project/src/helper.cpp'))
        const wrapperArgs = allArgs.find((args) => args.includes(`/project/${wrappedMainPath}`))

        expect(appArgs).toBeDefined()
        expect(appArgs).toContain('-x')
        expect(appArgs).toContain('c++')
        expect(appArgs).toContain('-Dmain=__wasm_user_main')

        expect(helperArgs).toBeDefined()
        expect(helperArgs).toContain('-Dmain=__wasm_non_entry_main')

        expect(wrapperArgs).toBeDefined()
        expect(wrapperArgs).not.toContain('-Dmain=__wasm_non_entry_main')
    })

    it('returns failed result with empty fs/object list when any compile step fails', async () => {
        compilerState.runImpl = async (args: string[], outputPath: string) => {
            if (args.includes('/project/src/bad.c')) {
                return {
                    exitCode: 2,
                    objectFile: { path: outputPath, mode: 'binary', content: new Uint8Array([0]) },
                }
            }
            return {
                exitCode: 0,
                objectFile: { path: outputPath, mode: 'binary', content: new Uint8Array([1]) },
            }
        }

        const io = {
            onStdout: vi.fn(),
            onStderr: vi.fn(),
            onStdinReady: vi.fn(),
        }
        const compiler = new Compiler(new Uint8Array([9]), {}, io)

        const result = await compiler.run(['src/good.c', 'src/bad.c'], 'src/good.c', '/project/build/obj')

        expect(result.exitCode).toBe(2)
        expect(result.objectFilePaths).toEqual([])
        expect(result.fs).toEqual({})
        expect(compilerState.instances.every((i) => i.kill.mock.calls.length === 1)).toBe(true)
    })
})
