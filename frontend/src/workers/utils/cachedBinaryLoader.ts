const isGzip = (bytes: Uint8Array): boolean => bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b

async function fetchAndDecompress(path: string, requestInit?: RequestInit): Promise<Uint8Array> {
    const response = await fetch(path, ...(requestInit ? [requestInit] : []))
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`)
    }

    const raw = new Uint8Array(await response.arrayBuffer())
    if (!isGzip(raw)) {
        return raw
    }

    if (typeof DecompressionStream === 'undefined') {
        throw new Error('This browser does not support DecompressionStream for gzip assets')
    }

    const ds = new DecompressionStream('gzip')
    const stream = new Blob([raw]).stream().pipeThrough(ds)
    return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function loadCachedBinary(
    cacheName: string,
    path: string,
    requestInit?: RequestInit,
): Promise<Uint8Array> {
    const cacheKey = `${path}?decompressed`

    try {
        const cache = await caches.open(cacheName)
        const cached = await cache.match(cacheKey)
        if (cached) {
            return new Uint8Array(await cached.arrayBuffer())
        }
    } catch {
        // Cache API may be unavailable
    }

    const bytes = await fetchAndDecompress(path, requestInit)

    try {
        const cache = await caches.open(cacheName)
        await cache.put(
            cacheKey,
            new Response(bytes.buffer as ArrayBuffer, {
                headers: { 'Content-Type': 'application/octet-stream' },
            }),
        )
    } catch {
        // Cache write failure is non-fatal
    }

    return bytes
}
