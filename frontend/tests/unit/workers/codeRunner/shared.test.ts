import { describe, expect, it } from 'vitest'

import { isCppFile, isSourceFile, toBinaryFile } from '@/workers/codeRunner/shared'

describe('workers/codeRunner/shared', () => {
    describe('isSourceFile', () => {
        it('accepts C and C++ source extensions case-insensitively', () => {
            expect(isSourceFile('main.c')).toBe(true)
            expect(isSourceFile('main.CPP')).toBe(true)
            expect(isSourceFile('main.cxx')).toBe(true)
            expect(isSourceFile('main.Cc')).toBe(true)
        })

        it('rejects non-source extensions or files without extensions', () => {
            expect(isSourceFile('README.md')).toBe(false)
            expect(isSourceFile('main')).toBe(false)
            expect(isSourceFile('archive.tar.gz')).toBe(false)
        })
    })

    describe('isCppFile', () => {
        it('accepts only C++ extensions', () => {
            expect(isCppFile('main.cpp')).toBe(true)
            expect(isCppFile('main.cxx')).toBe(true)
            expect(isCppFile('main.cc')).toBe(true)
            expect(isCppFile('main.c')).toBe(false)
        })
    })

    describe('toBinaryFile', () => {
        it('returns a binary WASI file object with timestamps and exact content reference', () => {
            const bytes = new Uint8Array([1, 2, 3])
            const file = toBinaryFile('/project/main.cpp', bytes)

            expect(file.path).toBe('/project/main.cpp')
            expect(file.mode).toBe('binary')
            expect(file.content).toBe(bytes)
            expect(file.timestamps.access).toBeInstanceOf(Date)
            expect(file.timestamps.change).toBeInstanceOf(Date)
            expect(file.timestamps.modification).toBeInstanceOf(Date)
        })
    })
})
