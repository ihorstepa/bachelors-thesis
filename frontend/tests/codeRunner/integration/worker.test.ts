import { describe, expect, it } from 'vitest'

import type { ProjectFile, WorkerInMessage, WorkerOutMessage } from '@/workers/codeRunner/shared'

import { expectedCOutput, expectedCppOutput, generateCProject, generateCppProject } from '../fixtures'

function formatWorkerErrorEvent(error: ErrorEvent): string {
    const details = [
        `message=${error.message || 'Unknown worker error'}`,
        error.filename ? `file=${error.filename}` : '',
        error.lineno ? `line=${error.lineno}` : '',
        error.colno ? `column=${error.colno}` : '',
    ]
        .filter(Boolean)
        .join(', ')

    const nested =
        error.error instanceof Error
            ? (error.error.stack ?? `${error.error.name}: ${error.error.message}`)
            : String(error.error ?? '')
    return nested ? `${details}\n${nested}` : details
}

type RunResult = { ok: boolean; code: number; stdout: string; stderr: string }

function runProject(files: ProjectFile[], entrypoint: string): Promise<RunResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../../../src/workers/codeRunner/worker.ts', import.meta.url), {
            type: 'module',
        })
        let stdout = ''
        let stderr = ''
        let phase = 'loading toolchain'

        worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
            const msg = event.data
            switch (msg.type) {
                case 'phase':
                    phase = msg.phase
                    break
                case 'stdout':
                    stdout += msg.text
                    break
                case 'stderr':
                    stderr += msg.text
                    break
                case 'done':
                    worker.terminate()
                    resolve({ ok: msg.ok, code: msg.code, stdout, stderr })
                    break
                case 'error':
                    worker.terminate()
                    reject(new Error(`Pipeline error during ${phase}: ${msg.message}\nstderr:\n${stderr}`))
                    break
            }
        }

        worker.onerror = (error: ErrorEvent) => {
            worker.terminate()
            reject(new Error(`Worker error during ${phase}: ${formatWorkerErrorEvent(error)}\nstderr:\n${stderr}`))
        }

        worker.postMessage({ type: 'start', files, entrypoint } satisfies WorkerInMessage)
    })
}

describe('codeRunner worker integration', () => {
    it('compiles and runs a C++ project', async () => {
        const files = generateCppProject()
        const result = await runProject(files, 'main.cpp')

        expect(result.ok, `Process failed (code ${result.code}).\nstderr:\n${result.stderr}`).toBe(true)
        expect(result.stdout).toBe(expectedCppOutput)
        expect(result.stderr).toBe('')
    })

    it('compiles and runs a C project', async () => {
        const files = generateCProject()
        const result = await runProject(files, 'main.c')

        expect(result.ok, `Process failed (code ${result.code}).\nstderr:\n${result.stderr}`).toBe(true)
        expect(result.stdout).toBe(expectedCOutput)
        expect(result.stderr).toBe('')
    })
})
