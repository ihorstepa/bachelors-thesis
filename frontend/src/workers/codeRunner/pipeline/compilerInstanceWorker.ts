import { WASI } from '@runno/wasi'
import type { WASIFS } from '@runno/wasi'

import type { CompilerInstanceInMessage, CompilerInstanceOutMessage } from '@/workers/codeRunner/shared'
import { assertNever } from '@/utils/functions'

type WorkerState = {
    binary: Uint8Array | null
    fs: WASIFS | null
}

const state: WorkerState = { binary: null, fs: null }

const post = (msg: CompilerInstanceOutMessage) => self.postMessage(msg)

async function run(msg: Extract<CompilerInstanceInMessage, { type: 'run' }>): Promise<void> {
    if (!state.binary || !state.fs) {
        post({ type: 'error', id: msg.id, message: 'Worker is not initialized' })
        return
    }

    try {
        const wasmBody = state.binary as unknown as BodyInit
        const result = await WASI.start(new Response(wasmBody, { headers: { 'content-type': 'application/wasm' } }), {
            args: msg.args,
            fs: state.fs,
            stdout: (text) => post({ type: 'stdout', id: msg.id, text }),
            stderr: (text) => post({ type: 'stderr', id: msg.id, text }),
        })

        const objectFile = result.fs[msg.outputPath]
        post({ type: 'done', id: msg.id, exitCode: result.exitCode, objectFile })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        post({ type: 'error', id: msg.id, message })
    }
}

self.addEventListener('message', (event: MessageEvent<CompilerInstanceInMessage>) => {
    const msg = event.data

    switch (msg.type) {
        case 'init':
            state.binary = msg.binary
            state.fs = msg.fs
            break
        case 'run':
            run(msg)
            break
        default:
            assertNever(msg)
    }
})
