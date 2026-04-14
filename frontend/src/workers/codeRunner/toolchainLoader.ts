import { parseTar } from 'nanotar'
import { toBinaryFile, type VFS } from '@/workers/codeRunner/shared'

export type Toolchain = {
    clangBinary: Uint8Array
    wasmLdBinary: Uint8Array
    sysrootFs: VFS
}

export class ToolchainLoader {
    private static assetsPromise: Promise<Toolchain> | null = null
    private static readonly cacheName = 'toolchain-v1'

    public static async load(): Promise<Toolchain> {
        if (this.assetsPromise) return this.assetsPromise
        try {
            this.assetsPromise = this.fetchAssets()
            return await this.assetsPromise
        } catch (error) {
            this.assetsPromise = null
            throw error
        }
    }

    private static async fetchAssets(): Promise<Toolchain> {
        const [clangBinary, wasmLdBinary, sysrootBytes] = await Promise.all([
            this.fetchCached('/binaries/clang.wasm.gz'),
            this.fetchCached('/binaries/wasm-ld.wasm.gz'),
            this.fetchCached('/binaries/sysroot.tar.gz'),
        ])

        const files = parseTar(sysrootBytes)
        const sysrootFs: VFS = {}

        for (const file of files) {
            if (file.type !== 'file' || !file.data) continue
            const name = file.name.startsWith('./') ? file.name.slice(2) : file.name
            if (!name) continue

            const path = `/sysroot/${name}`
            sysrootFs[path] = toBinaryFile(path, file.data)
        }

        return { clangBinary, wasmLdBinary, sysrootFs }
    }

    private static async fetchCached(path: string): Promise<Uint8Array> {
        const cacheKey = `${path}?decompressed`

        try {
            const cache = await caches.open(this.cacheName)
            const cached = await cache.match(cacheKey)
            if (cached) {
                return new Uint8Array(await cached.arrayBuffer())
            }
        } catch {
            // Cache API may be unavailable (e.g. non-secure context). Fall through.
        }

        const bytes = await this.fetchAndDecompress(path)

        try {
            const cache = await caches.open(this.cacheName)
            await cache.put(
                cacheKey,
                new Response(bytes.buffer as ArrayBuffer, {
                    headers: { 'Content-Type': 'application/octet-stream' },
                }),
            )
        } catch {
            // Cache write failure is non-fatal.
        }

        return bytes
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
