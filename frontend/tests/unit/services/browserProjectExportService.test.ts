import { beforeEach, describe, expect, it, vi } from 'vitest'

import BrowserProjectExportService from '@/services/exportService/browserProjectExportService'

import { MockFileSyncManager, MockProjectIndexService } from '../../mocks'

describe('BrowserProjectExportService', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    it('exports all files and triggers download with sanitized name', async () => {
        const index = new MockProjectIndexService()
        const sync = new MockFileSyncManager()

        index.addFile({ id: 'f1', path: 'src/main.cpp' })
        index.addFile({ id: 'f2', path: 'README.md' })
        sync.registerFile('f1', 'int main() {}')
        sync.registerFile('f2', '# readme')

        const click = vi.fn()
        const remove = vi.fn()
        const append = vi.spyOn(document.body, 'append')
        const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
            href: '',
            download: '',
            click,
            remove,
        } as unknown as HTMLAnchorElement)

        const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
        const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

        const service = new BrowserProjectExportService(index, sync)
        await service.exportProject('My : Cool / Project')

        expect(createElement).toHaveBeenCalledWith('a')
        expect(append).toHaveBeenCalledOnce()
        const anchor = createElement.mock.results[0].value as HTMLAnchorElement
        expect(anchor.download).toBe('My---Cool---Project.zip')
        expect(anchor.href).toBe('blob:test')
        expect(click).toHaveBeenCalledOnce()
        expect(remove).toHaveBeenCalledOnce()

        expect(createObjectURL).toHaveBeenCalledOnce()
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')

        expect(sync.getCloseCount('f1')).toBe(1)
        expect(sync.getCloseCount('f2')).toBe(1)
    })

    it('falls back to project.zip when provided name is empty after sanitization', async () => {
        const index = new MockProjectIndexService()
        const sync = new MockFileSyncManager()
        index.addFile({ id: 'f1', path: 'main.cpp' })
        sync.registerFile('f1', 'int main() {}')

        const createElement = vi.spyOn(document, 'createElement').mockReturnValue({
            href: '',
            download: '',
            click: vi.fn(),
            remove: vi.fn(),
        } as unknown as HTMLAnchorElement)
        vi.spyOn(document.body, 'append').mockImplementation(() => undefined)
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

        const service = new BrowserProjectExportService(index, sync)
        await service.exportProject('   ')

        const anchor = createElement.mock.results[0].value as HTMLAnchorElement
        expect(anchor.download).toBe('project.zip')
        expect(sync.getCloseCount('f1')).toBe(1)
    })
})
