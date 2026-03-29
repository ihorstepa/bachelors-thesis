import { TabManager } from '@/core/tabManager'
import { FileSystemManager, type NodeMeta } from '@/core/fileSystemManager'
import { LRUSet } from '@/utils/classes'

type TabState = {
    tabs: string[]
    activeId: string | null
    lruOrder: string[]
}

class PersistentTabManager extends TabManager {
    private fileSystemManager: FileSystemManager
    private tabs: string[] = []
    private activeId: string | null = null
    private lru: LRUSet<string>

    private static readonly storageKey = 'ide_tabs_state'
    private static readonly maxTabs = 20

    constructor(fileSystemManager: FileSystemManager) {
        super()
        this.fileSystemManager = fileSystemManager
        this.lru = new LRUSet(PersistentTabManager.maxTabs)

        this.handleRename = this.handleRename.bind(this)
        this.handleRemove = this.handleRemove.bind(this)

        this.fileSystemManager.on('rename', this.handleRename)
        this.fileSystemManager.on('delete', this.handleRemove)

        this.loadState()
    }

    public destroy(): void {
        this.fileSystemManager.off('delete', this.handleRemove)
        this.tabs = []
        this.activeId = null
        this.lru.clear()
    }

    public getTabs(): readonly string[] {
        return this.tabs
    }

    public getActiveId(): string | null {
        return this.activeId
    }

    public open(id: string): void {
        if (this.tabs.includes(id)) {
            this.updateActive(id)
            return
        }

        if (!this.fileSystemManager.exists(id)) return

        const victim = this.lru.touch(id)
        if (victim) {
            this.close(victim)
        }

        this.tabs = [...this.tabs, id]
        this.updateActive(id)
    }

    public reorder(fromIndex: number, toIndex: number): void {
        const next = [...this.tabs]
        const [removed] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, removed)
        this.tabs = next

        this.saveState()
        this.emit('change')
    }

    public close(id: string): void {
        const index = this.tabs.indexOf(id)
        if (index === -1) return

        this.tabs = this.tabs.filter((tabId) => tabId !== id)
        this.lru.remove(id)

        if (this.activeId === id) {
            const nextActive = this.tabs[index] || this.tabs[index - 1] || null
            this.updateActive(nextActive)
        } else {
            this.saveState()
            this.emit('change')
        }
    }

    public closeAll(): void {
        if (this.tabs.length === 0) return
        this.tabs = []
        this.lru.clear()
        this.updateActive(null)
    }

    private updateActive(id: string | null): void {
        if (this.activeId === id) return
        this.activeId = id

        if (id) {
            this.lru.touch(id)
        }

        this.saveState()
        this.emit('activeChange', id)
        this.emit('change')
    }

    private saveState(): void {
        const state: TabState = {
            tabs: this.tabs,
            activeId: this.activeId,
            lruOrder: this.lru.toArray(),
        }
        localStorage.setItem(PersistentTabManager.storageKey, JSON.stringify(state))
    }

    private loadState(): void {
        const raw = localStorage.getItem(PersistentTabManager.storageKey)
        if (!raw) return

        try {
            const parsed = JSON.parse(raw) as TabState

            this.tabs = (parsed.tabs || []).filter((id) => this.fileSystemManager.exists(id))
            this.lru = new LRUSet(PersistentTabManager.maxTabs, parsed.lruOrder || [])
            const savedActive = parsed.activeId

            if (savedActive && this.tabs.includes(savedActive)) {
                this.activeId = savedActive
            } else {
                this.activeId = this.tabs.length > 0 ? this.tabs[0] : null
            }
        } catch (e) {
            console.error('Failed to load tab state from localStorage', e)
        }
    }

    private handleRemove(node: NodeMeta): void {
        this.close(node.id)
    }

    private handleRename(id: string): void {
        if (this.tabs.includes(id)) {
            this.tabs = [...this.tabs]
            this.emit('change')
        }
    }
}

export default PersistentTabManager
