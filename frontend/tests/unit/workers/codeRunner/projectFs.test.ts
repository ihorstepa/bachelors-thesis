import type { WASIFS } from '@runno/wasi'
import { describe, expect, it } from 'vitest'

import { mainWrapper, wrappedMainPath } from '@/workers/codeRunner/mainWrapper'
import { ProjectFs } from '@/workers/codeRunner/projectFs'
import { projectPath, toBinaryFile } from '@/workers/codeRunner/shared'

describe('workers/codeRunner/ProjectFs', () => {
    const sysroot: WASIFS = {
        '/sysroot/lib/keep.me': toBinaryFile('/sysroot/lib/keep.me', new Uint8Array([9])),
    }

    it('throws when no source files are present', () => {
        expect(() => new ProjectFs([{ path: 'README.md', content: '# docs' }], 'main.cpp', sysroot)).toThrow(
            'No source files found',
        )
    })

    it('throws when the entrypoint is not among source files', () => {
        expect(
            () => new ProjectFs([{ path: 'src/other.cpp', content: 'int main(){}' }], 'src/main.cpp', sysroot),
        ).toThrow('Entrypoint "src/main.cpp" was not found in source files')
    })

    it('derives build paths and sorts source files deterministically', () => {
        const fs = new ProjectFs(
            [
                { path: 'src/z.cpp', content: 'int z() { return 0; }' },
                { path: 'src/a.cpp', content: 'int a() { return 0; }' },
                { path: 'assets/logo.txt', content: 'x' },
            ],
            'src/a.cpp',
            sysroot,
        )

        expect(fs.sourcePaths.slice(0, 2)).toEqual(['src/a.cpp', 'src/z.cpp'])
        expect(fs.entrypointPath).toBe('src/a.cpp')
        expect(fs.objDirPath).toBe(`${projectPath}/__build__/src/obj`)
        expect(fs.wasmOutPath).toBe(`${projectPath}/__build__/src/main.wasm`)
    })

    it('injects the C++ wrapper source only for C++ entrypoints', () => {
        const cpp = new ProjectFs([{ path: 'main.cpp', content: 'int main(){return 0;}' }], 'main.cpp', sysroot)
        expect(cpp.sourcePaths).toContain('main.cpp')
        expect(cpp.sourcePaths).toContain(wrappedMainPath)

        const wrapper = cpp.initialFs[`${projectPath}/${wrappedMainPath}`]
        expect(wrapper).toBeDefined()
        expect(wrapper.mode).toBe('binary')
        const wrapperBinary = wrapper as { mode: 'binary'; content: Uint8Array }
        expect(new TextDecoder().decode(wrapperBinary.content)).toBe(mainWrapper)

        const c = new ProjectFs([{ path: 'main.c', content: 'int main(){return 0;}' }], 'main.c', sysroot)
        expect(c.sourcePaths).toEqual(['main.c'])
        expect(c.initialFs[`${projectPath}/${wrappedMainPath}`]).toBeUndefined()
    })

    it('merges sysroot and project files into initialFs at /project/* paths', () => {
        const fs = new ProjectFs([{ path: 'src/main.c', content: 'int main(){return 0;}' }], 'src/main.c', sysroot)

        expect(fs.initialFs['/sysroot/lib/keep.me']).toBeDefined()
        const projectFile = fs.initialFs[`${projectPath}/src/main.c`]
        expect(projectFile).toBeDefined()
        expect(projectFile.mode).toBe('binary')
        const projectBinary = projectFile as { mode: 'binary'; content: Uint8Array }
        expect(new TextDecoder().decode(projectBinary.content)).toBe('int main(){return 0;}')
    })
})
