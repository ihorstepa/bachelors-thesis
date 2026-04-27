import { describe, expect, it, vi } from 'vitest'

import LocalFileTreeManager from '@/services/fileTreeManager/localFileTreeManager'

import { MockFileSyncManager, MockFileSystemManager } from '../../mocks'

describe('LocalFileTreeManager', () => {
    it('builds tree with dirs first and names sorted', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const srcId = fs.create('src', 'dir', null)
        fs.create('zeta.ts', 'file', srcId)
        fs.create('alpha.ts', 'file', srcId)
        fs.create('main.ts', 'file', null)

        const manager = new LocalFileTreeManager(fs)
        const tree = manager.getTree()

        expect(tree.map((n) => n.name)).toEqual(['src', 'main.ts'])
        expect(tree[0].children.map((n) => n.name)).toEqual(['alpha.ts', 'zeta.ts'])
    })

    it('selectItem expands ancestors and emits select', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const srcId = fs.create('src', 'dir', null)
        const nestedId = fs.create('nested', 'dir', srcId)
        const fileId = fs.create('main.ts', 'file', nestedId)

        const manager = new LocalFileTreeManager(fs)
        const onSelect = vi.fn()
        const onExpand = vi.fn()

        manager.on('select', onSelect)
        manager.on('expand', onExpand)

        manager.selectItem(fileId)

        expect(manager.getSelectedId()).toBe(fileId)
        expect(manager.getExpanded().has(srcId)).toBe(true)
        expect(manager.getExpanded().has(nestedId)).toBe(true)
        expect(onSelect).toHaveBeenCalledWith(fileId)
        expect(onExpand).toHaveBeenCalledWith(new Set([srcId, nestedId]))
    })

    it('toggleExpand toggles id and getTargetParentId resolves selected context', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const srcId = fs.create('src', 'dir', null)
        const fileId = fs.create('main.ts', 'file', srcId)

        const manager = new LocalFileTreeManager(fs)

        manager.toggleExpand(srcId)
        expect(manager.getExpanded().has(srcId)).toBe(true)

        manager.toggleExpand(srcId)
        expect(manager.getExpanded().has(srcId)).toBe(false)

        expect(manager.getTargetParentId()).toBeNull()

        manager.selectItem(srcId)
        expect(manager.getTargetParentId()).toBe(srcId)

        manager.selectItem(fileId)
        expect(manager.getTargetParentId()).toBe(srcId)
    })

    it('clears selected id when selected node is deleted', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileId = fs.create('main.ts', 'file', null)

        const manager = new LocalFileTreeManager(fs)
        const onSelect = vi.fn()
        manager.on('select', onSelect)

        manager.selectItem(fileId)
        fs.delete(fileId)

        expect(manager.getSelectedId()).toBeNull()
        expect(onSelect).toHaveBeenLastCalledWith(null)
    })

    it('ignores selection requests for missing nodes', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileId = fs.create('main.ts', 'file', null)

        const manager = new LocalFileTreeManager(fs)
        const onSelect = vi.fn()
        manager.on('select', onSelect)

        manager.selectItem(fileId)
        onSelect.mockClear()

        manager.selectItem('missing')

        expect(manager.getSelectedId()).toBe(fileId)
        expect(onSelect).not.toHaveBeenCalled()
    })
})
