import type { WASIFS } from '@runno/wasi'
import { parseTar } from 'nanotar'

import { toBinaryFile } from '@/workers/codeRunner/shared'
import { loadCachedBinary } from '@/workers/utils/cachedBinaryLoader'

export type Toolchain = {
    clangBinary: Uint8Array
    wasmLdBinary: Uint8Array
    sysrootFs: WASIFS
}

export class ToolchainLoader {
    private static readonly cacheName = 'toolchain-v1'

    public static async load(): Promise<Toolchain> {
        const [clangBinary, wasmLdBinary, sysrootBytes] = await Promise.all([
            loadCachedBinary(this.cacheName, '/binaries/clang.wasm.gz'),
            loadCachedBinary(this.cacheName, '/binaries/wasm-ld.wasm.gz'),
            loadCachedBinary(this.cacheName, '/binaries/sysroot.tar.gz'),
        ])

        const files = parseTar(sysrootBytes)
        const sysrootFs: WASIFS = {}

        for (const file of files) {
            if (file.type !== 'file' || !file.data) continue
            const name = file.name.startsWith('./') ? file.name.slice(2) : file.name
            if (!name) continue

            const path = `/sysroot/${name}`
            sysrootFs[path] = toBinaryFile(path, file.data)
        }

        return { clangBinary, wasmLdBinary, sysrootFs }
    }
}
