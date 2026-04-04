import { Directory, init, Wasmer } from '@wasmer/sdk'
import { parseTar } from 'nanotar'

export type Toolchain = { clang: Wasmer; wasmld: Wasmer; sysroot: Directory }

export class ToolchainLoader {
    private static promise: Promise<Toolchain> | null = null

    static async load(): Promise<Toolchain> {
        if (this.promise) return this.promise
        try {
            this.promise = this.fetch()
            return await this.promise
        } catch (error) {
            this.promise = null
            throw error
        }
    }

    private static async fetch(): Promise<Toolchain> {
        await init()

        const [clangBytes, wasmLdBytes, sysrootBytes] = await Promise.all([
            this.fetchAndDecompress('/binaries/clang.wasm.gz'),
            this.fetchAndDecompress('/binaries/wasm-ld.wasm.gz'),
            this.fetchAndDecompress('/binaries/sysroot.tar.gz'),
        ])

        const clang = Wasmer.fromWasm(clangBytes)
        const wasmld = Wasmer.fromWasm(wasmLdBytes)
        const files = parseTar(sysrootBytes)
        const sysroot: Record<string, Uint8Array> = {}

        for (const file of files) {
            if (!file.data) continue
            const name = file.name.startsWith('./') ? file.name.slice(2) : file.name
            if (name) sysroot[name] = file.data
        }

        return { clang, wasmld, sysroot: new Directory(sysroot) }
    }

    private static async fetchAndDecompress(path: string): Promise<Uint8Array> {
        const response = await fetch(path)
        if (!response.ok) {
            throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`)
        }

        const raw = new Uint8Array(await response.arrayBuffer())
        const isGzip = raw[0] === 0x1f && raw[1] === 0x8b
        if (!isGzip) return raw

        const ds = new DecompressionStream('gzip')
        const stream = new Blob([raw]).stream().pipeThrough(ds)
        return new Uint8Array(await new Response(stream).arrayBuffer())
    }
}
