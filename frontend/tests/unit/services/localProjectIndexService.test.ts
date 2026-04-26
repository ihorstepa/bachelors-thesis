import { describe, expect, it, vi } from 'vitest'

import LocalProjectIndexService from '@/services/projectIndexService/localProjectIndexService'

import { MockFileSyncManager, MockFileSystemManager } from '../../mocks'

describe('LocalProjectIndexService', () => {
    it('indexes all files recursively and returns paths sorted lexicographically', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const srcId = fs.create('src', 'dir', null)
        fs.create('main.cpp', 'file', null)
        fs.create('zeta.cpp', 'file', srcId)
        fs.create('alpha.cpp', 'file', srcId)

        const service = new LocalProjectIndexService(fs)

        expect(service.getAllFilePaths().map((f) => f.path)).toEqual(['main.cpp', 'src/alpha.cpp', 'src/zeta.cpp'])
    })

    it('recomputes and emits change when file tree changes', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const service = new LocalProjectIndexService(fs)
        const onChange = vi.fn()
        service.on('change', onChange)

        fs.create('a.txt', 'file', null)

        expect(onChange).toHaveBeenCalledOnce()
        expect(service.getAllFilePaths().map((f) => f.path)).toEqual(['a.txt'])
    })

    it('stops reacting after destroy', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const service = new LocalProjectIndexService(fs)
        const onChange = vi.fn()
        service.on('change', onChange)

        service.destroy()
        fs.create('a.txt', 'file', null)

        expect(onChange).not.toHaveBeenCalled()
        expect(service.getAllFilePaths()).toEqual([])
    })
})
