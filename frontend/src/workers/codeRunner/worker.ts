import { Compiler, computeCompileArgs, isCppFile } from '@/workers/codeRunner/compiler'
import { Linker } from '@/workers/codeRunner/linker'
import { ProjectFs } from '@/workers/codeRunner/projectFs'
import { Runner } from '@/workers/codeRunner/runner'
import { ToolchainLoader } from '@/workers/codeRunner/toolchainLoader'
import { buildProjectIndex, normalizeError, resolveEntrypoint } from '@/workers/codeRunner/shared'
import mainWrapper from '@/workers/codeRunner/mainWrapper'
import { wrappedMainPath } from '@/workers/codeRunner/shared'
import type { ProjectFile, WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'

type PipelinePhase = 'loading toolchain' | 'preparing FS' | 'compiling' | 'linking' | 'running'

const post = (msg: WorkerOutMessage) => self.postMessage(msg)

const runner = new Runner(
    (text) => post({ type: 'stdout', text }),
    (text) => post({ type: 'stderr', text }),
    () => post({ type: 'stdin_ready' }),
)

async function build(files: ProjectFile[], entrypoint: string): Promise<void> {
    let phase: PipelinePhase = 'loading toolchain'
    try {
        const onStdout = (text: string) => post({ type: 'stdout', text })
        const onStderr = (text: string) => post({ type: 'stderr', text })

        const { clang, wasmld, sysroot } = await ToolchainLoader.load()
        const compiler = new Compiler(clang, sysroot, onStdout, onStderr)
        const linker = new Linker(wasmld, sysroot, onStdout, onStderr)

        phase = 'preparing FS'
        const { filesByPath, normalizedToPath } = buildProjectIndex(files)

        if (normalizedToPath.size === 0) {
            throw new Error('No C/C++ source files found in the project')
        }
        const { normalizedEntrypoint, resolvedEntrypointPath } = resolveEntrypoint(entrypoint, normalizedToPath)

        const sourcePaths = Array.from(normalizedToPath.values()).sort()
        const entrypointIsCpp = isCppFile(normalizedEntrypoint)

        if (entrypointIsCpp) {
            filesByPath[wrappedMainPath] = new TextEncoder().encode(mainWrapper)
            sourcePaths.push(wrappedMainPath)
        }

        const fs = new ProjectFs(filesByPath, normalizedEntrypoint)
        await fs.prepareDirs()

        phase = 'compiling'
        post({ type: 'phase', phase: 'compiling' })
        const objectFiles: string[] = []
        for (const path of sourcePaths) {
            const extraArgs = computeCompileArgs(path, resolvedEntrypointPath)
            const result = await compiler.compile(path, fs, extraArgs)

            if (!result.ok) {
                post({ type: 'done', ok: false, code: result.code })
                return
            }

            objectFiles.push(`/project/${fs.getObjectPath(path)}`)
        }

        phase = 'linking'
        post({ type: 'phase', phase: 'linking' })
        const linkResult = await linker.link(objectFiles, fs)
        if (!linkResult.ok) {
            post({ type: 'done', ok: false, code: linkResult.code })
            return
        }

        phase = 'running'
        post({ type: 'phase', phase: 'running' })
        const runResult = await runner.run(fs)
        post({ type: 'done', ok: runResult.ok, code: runResult.code })
    } catch (e) {
        post({ type: 'error', message: `Pipeline failed while ${phase}: ${normalizeError(e)}` })
    }
}

self.addEventListener('message', async (event: MessageEvent<WorkerInMessage>) => {
    const msg = event.data

    if (msg.type === 'stdin') {
        try {
            await runner.writeStdin(msg.bytes)
        } catch {
            // Writer may be closed.
        }
        return
    }

    if (msg.type !== 'start') return
    await build(msg.files, msg.entrypoint)
})
