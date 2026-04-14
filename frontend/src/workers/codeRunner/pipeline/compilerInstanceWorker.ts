import { WASI } from '@runno/wasi'

import type { CompilerInstanceInMessage, CompilerInstanceOutMessage, VFS } from '@/workers/codeRunner/shared'

let binary: Uint8Array | null = null
let baseFs: VFS | null = null

function post(message: CompilerInstanceOutMessage): void {
    self.postMessage(message)
}

self.addEventListener('message', async (event: MessageEvent<CompilerInstanceInMessage>) => {
    const msg = event.data

    if (msg.type === 'init') {
        binary = msg.binary
        baseFs = msg.baseFs
        return
    }

    if (!binary || !baseFs) {
        post({ type: 'error', id: msg.id, message: 'Worker is not initialized' })
        return
    }

    try {
        const wasmBuffer = new ArrayBuffer(binary.byteLength)
        new Uint8Array(wasmBuffer).set(binary)
        const result = await WASI.start(new Response(wasmBuffer, { headers: { 'content-type': 'application/wasm' } }), {
            args: msg.args,
            env: msg.env,
            fs: { ...baseFs, ...msg.extraFs },
            stdout: (text) => post({ type: 'stdout', id: msg.id, text }),
            stderr: (text) => post({ type: 'stderr', id: msg.id, text }),
        })

        const outputFiles = Object.fromEntries(
            msg.outputPaths.flatMap((p) => (result.fs[p] ? [[p, result.fs[p]]] : [])),
        )

        post({ type: 'done', id: msg.id, exitCode: result.exitCode, outputFiles })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        post({ type: 'error', id: msg.id, message })
    }
})
