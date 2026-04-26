import { act, useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { type FileTreeState, useFileTree } from '@/contextProviders/fileTree/FileTreeContext'
import FileTreeProvider from '@/contextProviders/fileTree/FileTreeProvider'
import { type TabsState, useTabs } from '@/contextProviders/tabs/TabsContext'
import TabsProvider from '@/contextProviders/tabs/TabsProvider'
import { type TerminalState, useTerminal } from '@/contextProviders/terminal/TerminalContext'
import TerminalProvider from '@/contextProviders/terminal/TerminalProvider'
import { CodeRunner, type CodeRunnerStatus } from '@/core/codeRunner'
import { FileTreeManager, type TreeNode } from '@/core/fileTreeManager'
import { TabManager } from '@/core/tabManager'
import type { NullableString } from '@/utils/types'

import { MockTabManager } from '../../mocks'
import { mountWithServices, unmountMounted, waitForCondition } from './testHarness'

class MockFileTreeManager extends FileTreeManager {
    private tree: TreeNode[] = []
    private expanded = new Set<string>()
    private selectedId: string | null = null

    public getTree(): TreeNode[] {
        return this.tree
    }

    public getExpanded(): Set<string> {
        return this.expanded
    }

    public getSelectedId(): string | null {
        return this.selectedId
    }

    public selectItem(id: string): void {
        this.selectedId = id
        this.emit('select', id)
    }

    public toggleExpand(id: string): void {
        if (this.expanded.has(id)) {
            this.expanded.delete(id)
        } else {
            this.expanded.add(id)
        }
        this.emit('expand', new Set(this.expanded))
    }

    public getTargetParentId(): NullableString {
        return this.selectedId
    }

    public setTree(tree: TreeNode[]): void {
        this.tree = tree
        this.emit('change', tree)
    }
}

class MockCodeRunner extends CodeRunner {
    private status: CodeRunnerStatus = 'idle'
    private canSendInput = false

    public async run(targetName: string): Promise<void> {
        void targetName
        return undefined
    }

    public sendInput(text: string): void {
        void text
    }

    public stop(): void {
        return undefined
    }

    public async createConfig(): Promise<void> {
        return undefined
    }

    public hasConfig(): boolean {
        return false
    }

    public getStatus(): CodeRunnerStatus {
        return this.status
    }

    public getCanSendInput(): boolean {
        return this.canSendInput
    }

    public getTargets(): string[] {
        return []
    }

    public getError(): string | null {
        return null
    }

    public emitStatus(status: CodeRunnerStatus, canSendInput = this.canSendInput): void {
        this.status = status
        this.canSendInput = canSendInput
        this.emit('change', status)
    }

    public emitStdout(text: string): void {
        this.emit('stdout', text)
    }
}

function TabsProbe({ onState }: { onState: (state: TabsState) => void }) {
    const state = useTabs()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

function FileTreeProbe({ onState }: { onState: (state: FileTreeState) => void }) {
    const state = useFileTree()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

function TerminalProbe({ onState }: { onState: (state: TerminalState) => void }) {
    const state = useTerminal()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

describe('UI provider integrations', () => {
    const mounted: Array<Awaited<ReturnType<typeof mountWithServices>>> = []

    afterEach(async () => {
        await Promise.all(mounted.splice(0).map((entry) => unmountMounted(entry)))
        document.body.innerHTML = ''
    })

    it('syncs TabsProvider with tab manager change events', async () => {
        const manager = new MockTabManager()
        const latest = { current: null as TabsState | null }

        const rendered = await mountWithServices(
            <TabsProvider>
                <TabsProbe onState={(state) => (latest.current = state)} />
            </TabsProvider>,
            new Map([[TabManager, manager]]),
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)
        expect(latest.current?.tabs).toEqual([])
        expect(latest.current?.activeId).toBeNull()

        await act(async () => {
            manager.open('main.cpp')
            manager.open('util.cpp')
        })
        await waitForCondition(() => latest.current?.activeId === 'util.cpp')

        expect(latest.current?.tabs).toEqual(['main.cpp', 'util.cpp'])

        await act(async () => {
            manager.close('util.cpp')
        })
        await waitForCondition(() => latest.current?.activeId === 'main.cpp')

        expect(latest.current?.tabs).toEqual(['main.cpp'])
    })

    it('syncs FileTreeProvider with tree, expansion, and selection events', async () => {
        const manager = new MockFileTreeManager()
        const latest = { current: null as FileTreeState | null }
        const tree: TreeNode[] = [
            {
                id: 'src',
                name: 'src',
                type: 'dir',
                parentId: null,
                children: [
                    {
                        id: 'main.cpp',
                        name: 'main.cpp',
                        type: 'file',
                        parentId: 'src',
                        children: [],
                    },
                ],
            },
        ]

        const rendered = await mountWithServices(
            <FileTreeProvider>
                <FileTreeProbe onState={(state) => (latest.current = state)} />
            </FileTreeProvider>,
            new Map([[FileTreeManager, manager]]),
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)

        await act(async () => {
            manager.setTree(tree)
            manager.toggleExpand('src')
            manager.selectItem('main.cpp')
        })

        await waitForCondition(() => latest.current?.selectedId === 'main.cpp')

        expect(latest.current?.tree).toEqual(tree)
        expect(Array.from(latest.current?.expanded ?? [])).toEqual(['src'])
        expect(latest.current?.selectedId).toBe('main.cpp')
    })

    it('auto-opens TerminalProvider once per run cycle from code runner events', async () => {
        const runner = new MockCodeRunner()
        const latest = { current: null as TerminalState | null }

        const rendered = await mountWithServices(
            <TerminalProvider>
                <TerminalProbe onState={(state) => (latest.current = state)} />
            </TerminalProvider>,
            new Map([[CodeRunner, runner]]),
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)
        expect(latest.current?.terminalOpen).toBe(false)

        await act(async () => {
            runner.emitStdout('hello')
        })
        await waitForCondition(() => latest.current?.terminalOpen === true)

        await act(async () => {
            latest.current!.setTerminalOpen(false)
        })
        await waitForCondition(() => latest.current?.terminalOpen === false)

        await act(async () => {
            runner.emitStdout('still same run')
        })
        expect(latest.current?.terminalOpen).toBe(false)

        await act(async () => {
            runner.emitStatus('compiling')
            runner.emitStatus('running')
        })
        await waitForCondition(() => latest.current?.terminalOpen === true)
    })
})
