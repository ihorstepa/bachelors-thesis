import { beforeEach, describe, expect, it, vi } from 'vitest'

import PersistentTabManager from '@/services/tabManager/persistentTabManager'

import { MockFileSyncManager, MockFileSystemManager } from '../../mocks'

describe('PersistentTabManager', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it('opens existing files, updates active tab, and ignores missing ids', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)
        const fileB = fs.create('b.ts', 'file', null)

        const manager = new PersistentTabManager(fs)
        manager.open('missing')
        manager.open(fileA)
        manager.open(fileB)

        expect(manager.getTabs()).toEqual([fileA, fileB])
        expect(manager.getActiveId()).toBe(fileB)

        manager.open(fileA)
        expect(manager.getTabs()).toEqual([fileA, fileB])
        expect(manager.getActiveId()).toBe(fileA)
    })

    it('reorders tabs and persists state', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)
        const fileB = fs.create('b.ts', 'file', null)
        const fileC = fs.create('c.ts', 'file', null)

        const manager = new PersistentTabManager(fs)
        manager.open(fileA)
        manager.open(fileB)
        manager.open(fileC)

        manager.reorder(2, 0)
        expect(manager.getTabs()).toEqual([fileC, fileA, fileB])

        const saved = JSON.parse(localStorage.getItem('ide_tabs_state') ?? '{}') as { tabs?: string[] }
        expect(saved.tabs).toEqual([fileC, fileA, fileB])
    })

    it('closes active tab and activates the most recently active remaining tab', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)
        const fileB = fs.create('b.ts', 'file', null)
        const fileC = fs.create('c.ts', 'file', null)

        const manager = new PersistentTabManager(fs)
        manager.open(fileA)
        manager.open(fileB)
        manager.open(fileC)

        manager.open(fileA)

        manager.close(fileA)
        expect(manager.getTabs()).toEqual([fileB, fileC])
        expect(manager.getActiveId()).toBe(fileC)

        manager.closeAll()
        expect(manager.getTabs()).toEqual([])
        expect(manager.getActiveId()).toBeNull()
    })

    it('evicts least recently used tab when opening more than the max limit', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileIds = Array.from({ length: 21 }, (_, index) => fs.create(`file-${index}.ts`, 'file', null))

        const manager = new PersistentTabManager(fs)
        fileIds.forEach((id) => manager.open(id))

        expect(manager.getTabs()).toHaveLength(20)
        expect(manager.getTabs()).not.toContain(fileIds[0])
        expect(manager.getTabs()).toContain(fileIds[20])
        expect(manager.getActiveId()).toBe(fileIds[20])
    })

    it('loads valid state from localStorage and filters missing files', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const existing = fs.create('a.ts', 'file', null)

        localStorage.setItem(
            'ide_tabs_state',
            JSON.stringify({ tabs: ['missing', existing], activeId: 'missing', lruOrder: ['missing', existing] }),
        )

        const manager = new PersistentTabManager(fs)
        expect(manager.getTabs()).toEqual([existing])
        expect(manager.getActiveId()).toBe(existing)
    })

    it('reacts to rename and delete events for opened tabs', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)

        const manager = new PersistentTabManager(fs)
        const onChange = vi.fn()
        manager.on('change', onChange)

        manager.open(fileA)
        fs.rename(fileA, 'renamed.ts')
        fs.delete(fileA)

        expect(onChange).toHaveBeenCalled()
        expect(manager.getTabs()).toEqual([])
        expect(manager.getActiveId()).toBeNull()
    })

    it('stops reacting to file-system events after destroy', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)

        const manager = new PersistentTabManager(fs)
        const onChange = vi.fn()
        manager.on('change', onChange)

        manager.open(fileA)
        onChange.mockClear()

        manager.destroy()
        fs.rename(fileA, 'renamed.ts')
        fs.delete(fileA)

        expect(onChange).not.toHaveBeenCalled()
        expect(manager.getTabs()).toEqual([])
        expect(manager.getActiveId()).toBeNull()
    })

    it('ignores malformed persisted state and remains usable', () => {
        const fs = new MockFileSystemManager(new MockFileSyncManager())
        const fileA = fs.create('a.ts', 'file', null)

        localStorage.setItem('ide_tabs_state', '{bad-json')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const manager = new PersistentTabManager(fs)
        manager.open(fileA)

        expect(consoleError).toHaveBeenCalledOnce()
        expect(manager.getTabs()).toEqual([fileA])
        expect(manager.getActiveId()).toBe(fileA)
    })
})
