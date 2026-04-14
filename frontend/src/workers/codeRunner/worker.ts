import { ProjectFs } from '@/workers/codeRunner/projectFs'
import { ToolchainLoader } from '@/workers/codeRunner/toolchainLoader'
import { Compiler } from '@/workers/codeRunner/pipeline/compiler'
import { Linker } from '@/workers/codeRunner/pipeline/linker'
import { Runner } from '@/workers/codeRunner/pipeline/runner'
import { normalizeError } from '@/workers/codeRunner/shared'
import { assertNever } from '@/utils/functions'
import type { PipelineIo, ProjectFile, WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'

type RunPhase = 'idle' | 'starting up' | 'loading toolchain' | 'preparing FS' | 'compiling' | 'linking' | 'running'

type WorkerState = {
    phase: RunPhase
    compiler: Compiler | null
    linker: Linker | null
    runner: Runner | null
}

const stdinDecoder = new TextDecoder()

const state: WorkerState = { phase: 'idle', compiler: null, linker: null, runner: null }

const post = (msg: WorkerOutMessage) => self.postMessage(msg)

const io: PipelineIo = {
    onStdout: (text: string) => post({ type: 'stdout', text }),
    onStderr: (text: string) => post({ type: 'stderr', text }),
    onStdinReady: () => post({ type: 'stdin_ready' }),
}

async function run(files: ProjectFile[], entrypoint: string): Promise<void> {
    try {
        state.phase = 'loading toolchain'
        const { clangBinary, wasmLdBinary, sysrootFs } = await ToolchainLoader.load()

        state.phase = 'preparing FS'
        const fs = new ProjectFs(files, entrypoint, sysrootFs)
        state.compiler = new Compiler(clangBinary, fs.buildFs, io)
        state.linker = new Linker(io, wasmLdBinary, sysrootFs)
        state.runner = new Runner(io)

        state.phase = 'compiling'
        post({ type: 'phase', phase: 'compiling' })
        const compileResult = await state.compiler.run(fs.sourcePaths, fs.entrypointPath, fs.objDir)
        if (compileResult.failedCode !== null) {
            post({ type: 'done', ok: false, code: compileResult.failedCode })
            return
        }

        state.phase = 'linking'
        post({ type: 'phase', phase: 'linking' })
        const linkResult = await state.linker.linkObjects(
            compileResult.objectFiles,
            compileResult.objectFilesFs,
            fs.wasmOutAbsPath,
        )
        if (linkResult.exitCode !== 0) {
            post({ type: 'done', ok: false, code: linkResult.exitCode })
            return
        }

        state.phase = 'running'
        post({ type: 'phase', phase: 'running' })
        const runFs = { ...fs.buildFs, ...linkResult.outputFs }
        const runExitCode = await state.runner.run(runFs, fs.wasmOutAbsPath)
        post({ type: 'done', ok: runExitCode === 0, code: runExitCode })
    } catch (e) {
        post({ type: 'error', message: `Pipeline failed while ${state.phase}: ${normalizeError(e)}` })
    } finally {
        state.compiler?.destroy()
        state.linker?.destroy()
        state.runner?.destroy()
        state.phase = 'idle'
        state.compiler = null
        state.linker = null
        state.runner = null
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
        case 'stdin':
            if (!state.runner) return
            const text = stdinDecoder.decode(msg.bytes)
            state.runner.pushStdin(text)
            break
        default:
            return assertNever(msg)
    }
})
