import { describe, expect, it, vi } from 'vitest'

import { dirname, ensureDirectory, toProjectPath, toProjectUri } from '@/workers/languageServer/projectFileSystem'

describe('workers/languageServer/projectFileSystem', () => {
    it('normalizes paths into /project-prefixed paths', () => {
        expect(toProjectPath('src/main.cpp')).toBe('/project/src/main.cpp')
        expect(toProjectPath('/src/main.cpp')).toBe('/project/src/main.cpp')
        expect(toProjectPath('\\src\\nested\\main.cpp')).toBe('/project/src/nested/main.cpp')
    })

    it('converts file paths to encoded file:///project URIs', () => {
        expect(toProjectUri('src/my file.cpp')).toBe('file:///project/src/my%20file.cpp')
        expect(toProjectUri('src/lib/c++/main.hpp')).toBe('file:///project/src/lib/c%2B%2B/main.hpp')
    })

    it('returns parent directory with root fallback', () => {
        expect(dirname('/project/src/main.cpp')).toBe('/project/src')
        expect(dirname('/project')).toBe('/')
        expect(dirname('main.cpp')).toBe('/')
    })

    it('creates missing parent directories recursively and skips existing ones', () => {
        const existing = new Set(['/project'])
        const mkdir = vi.fn((path: string) => {
            existing.add(path)
        })
        const analyzePath = vi.fn((path: string) => ({ exists: existing.has(path) }))

        const fs = { analyzePath, mkdir }

        ensureDirectory(fs as never, '/project/src/deep')
        expect(mkdir.mock.calls.map((call) => call[0])).toEqual(['/project/src', '/project/src/deep'])

        mkdir.mockClear()
        ensureDirectory(fs as never, '/project/src/deep')
        expect(mkdir).not.toHaveBeenCalled()
    })
})
