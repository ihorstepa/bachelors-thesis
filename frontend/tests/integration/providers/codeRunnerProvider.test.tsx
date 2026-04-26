import { act, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { type CodeRunnerState, useCodeRunner } from '@/contextProviders/codeRunner/CodeRunnerContext'
import CodeRunnerProvider from '@/contextProviders/codeRunner/CodeRunnerProvider'
import { CodeRunner, type CodeRunnerStatus } from '@/core/codeRunner'

import { mountWithServices, unmountMounted, waitForCondition } from './testHarness'

class MockCodeRunner extends CodeRunner {
    private hasConfigValue = false
    private statusValue: CodeRunnerStatus = 'idle'
    private canSendInputValue = false
    private targetsValue: string[] = []
    private errorValue: string | null = null

    public readonly runMock = vi.fn(async (targetName: string) => {
        void targetName
    })
    public readonly sendInputMock = vi.fn((text: string) => {
        void text
    })
    public readonly stopMock = vi.fn()

    public async run(targetName: string): Promise<void> {
        return this.runMock(targetName)
    }

    public sendInput(text: string): void {
        this.sendInputMock(text)
    }

    public stop(): void {
        this.stopMock()
    }

    public async createConfig(): Promise<void> {
        return undefined
    }

    public hasConfig(): boolean {
        return this.hasConfigValue
    }

    public getStatus(): CodeRunnerStatus {
        return this.statusValue
    }

    public getCanSendInput(): boolean {
        return this.canSendInputValue
    }

    public getTargets(): string[] {
        return this.targetsValue
    }

    public getError(): string | null {
        return this.errorValue
    }

    public update(snapshot: {
        hasConfig?: boolean
        status?: CodeRunnerStatus
        canSendInput?: boolean
        targets?: string[]
        error?: string | null
    }): void {
        if (snapshot.hasConfig !== undefined) this.hasConfigValue = snapshot.hasConfig
        if (snapshot.status !== undefined) this.statusValue = snapshot.status
        if (snapshot.canSendInput !== undefined) this.canSendInputValue = snapshot.canSendInput
        if (snapshot.targets !== undefined) this.targetsValue = snapshot.targets
        if (snapshot.error !== undefined) this.errorValue = snapshot.error
        this.emit('change', this.statusValue)
    }
}

function CodeRunnerProbe({ onState }: { onState: (state: CodeRunnerState) => void }) {
    const state = useCodeRunner()
    useEffect(() => {
        onState(state)
    }, [state, onState])
    return null
}

describe('CodeRunnerProvider integration', () => {
    const mounted: Array<Awaited<ReturnType<typeof mountWithServices>>> = []

    afterEach(async () => {
        await Promise.all(mounted.splice(0).map((entry) => unmountMounted(entry)))
        document.body.innerHTML = ''
    })

    it('exposes initial code runner snapshot from service getters', async () => {
        const runner = new MockCodeRunner()
        runner.update({ hasConfig: true, status: 'idle', canSendInput: false, targets: ['app'], error: null })

        const latest = { current: null as CodeRunnerState | null }
        const registry = new Map([[CodeRunner, runner]])

        const rendered = await mountWithServices(
            <CodeRunnerProvider>
                <CodeRunnerProbe onState={(state) => (latest.current = state)} />
            </CodeRunnerProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)

        expect(latest.current?.hasConfig).toBe(true)
        expect(latest.current?.status).toBe('idle')
        expect(latest.current?.targets).toEqual(['app'])
        expect(latest.current?.error).toBeNull()
        expect(latest.current?.selectedTarget).toBe('')
    })

    it('reacts to service change events and keeps local selected target state', async () => {
        const runner = new MockCodeRunner()
        runner.update({ hasConfig: true, status: 'idle', canSendInput: false, targets: ['app'], error: null })

        const latest = { current: null as CodeRunnerState | null }
        const registry = new Map([[CodeRunner, runner]])

        const rendered = await mountWithServices(
            <CodeRunnerProvider>
                <CodeRunnerProbe onState={(state) => (latest.current = state)} />
            </CodeRunnerProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)

        await act(async () => {
            latest.current!.setSelectedTarget('app')
        })
        await waitForCondition(() => latest.current?.selectedTarget === 'app')

        await act(async () => {
            runner.update({ status: 'compiling', canSendInput: true, error: 'Build in progress' })
        })
        await waitForCondition(() => latest.current?.status === 'compiling')

        expect(latest.current?.canSendInput).toBe(true)
        expect(latest.current?.error).toBe('Build in progress')
        expect(latest.current?.selectedTarget).toBe('app')
    })

    it('delegates run, sendInput, and stop to the runner service', async () => {
        const runner = new MockCodeRunner()
        runner.update({ hasConfig: true, status: 'idle', canSendInput: true, targets: ['app'], error: null })

        const latest = { current: null as CodeRunnerState | null }
        const registry = new Map([[CodeRunner, runner]])

        const rendered = await mountWithServices(
            <CodeRunnerProvider>
                <CodeRunnerProbe onState={(state) => (latest.current = state)} />
            </CodeRunnerProvider>,
            registry,
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)

        await act(async () => {
            await latest.current!.runner.run('app')
            latest.current!.runner.sendInput('42\n')
            latest.current!.runner.stop()
        })

        expect(runner.runMock).toHaveBeenCalledWith('app')
        expect(runner.sendInputMock).toHaveBeenCalledWith('42\n')
        expect(runner.stopMock).toHaveBeenCalledOnce()
    })
})
