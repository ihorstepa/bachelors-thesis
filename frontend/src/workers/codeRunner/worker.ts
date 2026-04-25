import { normalizeError } from '@/utils/functions'
import { assertNever } from '@/utils/functions'
import { Compiler } from '@/workers/codeRunner/pipeline/compiler'
import { Linker } from '@/workers/codeRunner/pipeline/linker'
import { Runner } from '@/workers/codeRunner/pipeline/runner'
import { ProjectFs } from '@/workers/codeRunner/projectFs'
import type { PipelineIo, ProjectFile, WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'
import type { Toolchain } from '@/workers/codeRunner/toolchainLoader'
import { ToolchainLoader } from '@/workers/codeRunner/toolchainLoader'

type RunPhase = 'idle' | 'starting up' | 'loading toolchain' | 'preparing FS' | 'compiling' | 'linking' | 'running'

type WorkerState = {
    phase: RunPhase
    fs: ProjectFs | null
    compiler: Compiler | null
    linker: Linker | null
    runner: Runner | null
}

const stdinDecoder = new TextDecoder()

const state: WorkerState = { phase: 'idle', fs: null, compiler: null, linker: null, runner: null }

const post = (msg: WorkerOutMessage) => self.postMessage(msg)

const io: PipelineIo = {
    onStdout: (text: string) => post({ type: 'stdout', text }),
    onStderr: (text: string) => post({ type: 'stderr', text }),
    onStdinReady: () => post({ type: 'stdin_ready' }),
}

async function run(files: ProjectFile[], entrypoint: string): Promise<void> {
    try {
        state.phase = 'loading toolchain'
        let { clangBinary, wasmLdBinary, sysrootFs }: Partial<Toolchain> = await ToolchainLoader.load()

        state.phase = 'preparing FS'
        state.fs = new ProjectFs(files, entrypoint, sysrootFs)
        state.compiler = new Compiler(clangBinary, state.fs.initialFs, io)
        state.linker = new Linker(wasmLdBinary, sysrootFs, io)
        state.runner = new Runner(io)

        // Helps with early garbage collection
        clangBinary = undefined
        wasmLdBinary = undefined
        sysrootFs = undefined

        state.phase = 'compiling'
        post({ type: 'phase', phase: 'compiling' })
        const compileResult = await state.compiler.run(
            state.fs.sourcePaths,
            state.fs.entrypointPath,
            state.fs.objDirPath,
        )
        if (compileResult.exitCode !== 0) {
            post({ type: 'done', ok: false, code: compileResult.exitCode })
            return
        }
        // Helps with early garbage collection
        state.compiler = null

        state.phase = 'linking'
        post({ type: 'phase', phase: 'linking' })
        const linkResult = await state.linker.linkObjects(
            compileResult.fs,
            compileResult.objectFilePaths,
            state.fs.wasmOutPath,
        )
        if (linkResult.exitCode !== 0) {
            post({ type: 'done', ok: false, code: linkResult.exitCode })
            return
        }
        // Helps with early garbage collection
        state.linker = null

        state.phase = 'running'
        post({ type: 'phase', phase: 'running' })
        const runExitCode = await state.runner.run(linkResult.fs, state.fs.wasmOutPath)
        post({ type: 'done', ok: runExitCode === 0, code: runExitCode })
    } catch (e) {
        post({ type: 'error', message: `Pipeline failed while ${state.phase}: ${normalizeError(e)}` })
    } finally {
        state.compiler = null
        state.linker = null
        state.runner = null
        state.phase = 'idle'
    }
}

self.addEventListener('message', async (event: MessageEvent<WorkerInMessage>) => {
    const msg = event.data

    switch (msg.type) {
        case 'start':
            if (state.phase !== 'idle') return
            state.phase = 'starting up'
            run(msg.files, msg.entrypoint)
            break
        case 'stdin': {
            if (!state.runner) return
            const text = stdinDecoder.decode(msg.bytes)
            state.runner.pushStdin(text)
            break
        }
        default:
            return assertNever(msg)
    }
})
