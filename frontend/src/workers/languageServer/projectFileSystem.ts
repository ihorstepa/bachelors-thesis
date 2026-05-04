import type { ClangdFS } from '@/workers/languageServer/clangd.js'

export function toProjectPath(path: string): string {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
    return `/project/${normalized}`
}

export function toProjectUri(path: string): string {
    const encodedPath = path
        .split('/')
        .filter((part) => part.length > 0)
        .map((part) => encodeURIComponent(part))
        .join('/')

    return `file:///project/${encodedPath}`
}

export function dirname(path: string): string {
    const index = path.lastIndexOf('/')
    if (index <= 0) return '/'
    return path.slice(0, index)
}

export function ensureDirectory(fs: ClangdFS, directoryPath: string): void {
    if (directoryPath === '/' || directoryPath.length === 0) return

    const parts = directoryPath.split('/').filter((part) => part.length > 0)
    let current = ''
    for (const part of parts) {
        current += `/${part}`
        if (!fs.analyzePath(current).exists) {
            fs.mkdir(current)
        }
    }
}
