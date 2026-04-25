import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectFile } from '@/workers/codeRunner/shared'

import { addProjectFile, createHarness, decodeBytes, deferred,MockWorker } from '../mocks'

beforeEach(() => {
    vi.useFakeTimers()
    MockWorker.reset()
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
})

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

describe('CppCodeRunner', () => {
    it('discovers, normalizes, and sorts targets from the config file', async () => {
        const harness = createHarness()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({
                targets: {
                    zebra: { entry: 'src\\zebra.cpp' },
                    alpha: { entry: './app/../app/main.cpp' },
                },
            }),
        )

        await vi.advanceTimersByTimeAsync(500)

        expect(harness.runner.hasConfig()).toBe(true)
        expect(harness.runner.getTargets()).toEqual(['alpha', 'zebra'])
        expect(harness.runner.getError()).toBeNull()
        expect(harness.runner.getStatus()).toBe('idle')
    })

    it('surfaces config parse errors and refreshes targets after the config is fixed', async () => {
        const harness = createHarness()
        const configId = harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({ targets: { broken: {} } }),
        )

        await vi.advanceTimersByTimeAsync(500)

        expect(harness.runner.getTargets()).toEqual([])
        expect(harness.runner.getStatus()).toBe('error')
        expect(harness.runner.getError()).toContain('Target "broken" must define a non-empty "entry" string')

        harness.fileSyncManager.replaceText(configId, JSON.stringify({ targets: { app: { entry: './src/main.cpp' } } }))

        await vi.advanceTimersByTimeAsync(500)

        expect(harness.runner.getTargets()).toEqual(['app'])
        expect(harness.runner.getError()).toBeNull()
    })

    it('creates the default config file, opens it in tabs, and refreshes targets', async () => {
        const harness = createHarness()

        await harness.runner.createConfig()

        const configNode = harness.fileSystemManager
            .getChildrenMeta(null)
            .find((node) => node.type === 'file' && node.name === 'run.config.json')

        expect(configNode).toBeDefined()
        expect(harness.runner.hasConfig()).toBe(true)
        expect(harness.runner.getTargets()).toEqual(['app'])
        expect(harness.fileSyncManager.getText(configNode!.id)).toBe(
            JSON.stringify({ targets: { app: { entry: 'main.cpp' } } }, null, 4),
        )
        expect(harness.tabManager.opened).toEqual([configNode!.id])
    })

    it('posts only the selected target files to the worker', async () => {
        const harness = createHarness()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({
                targets: {
                    app: { entry: 'main.cpp' },
                    tools: { entry: 'tools/tool.cpp' },
                },
            }),
        )
        addProjectFile(harness, 'main.cpp', 'int main() { return 0; }')
        const helperId = addProjectFile(harness, 'lib/helper.cpp', 'int helper() { return 1; }')
        const excludedId = addProjectFile(harness, 'tools/tool.cpp', 'int main() { return 2; }')

        await vi.advanceTimersByTimeAsync(500)
        await harness.runner.run('app')

        expect(harness.runner.getStatus()).toBe('syncing')
        expect(MockWorker.instances).toHaveLength(1)
        expect(MockWorker.instances[0].messages).toHaveLength(1)
        expect(MockWorker.instances[0].messages[0]).toEqual({
            type: 'start',
            entrypoint: 'main.cpp',
            files: [
                { path: 'main.cpp', content: 'int main() { return 0; }' },
                { path: 'lib/helper.cpp', content: 'int helper() { return 1; }' },
            ] satisfies ProjectFile[],
        })
        expect(harness.fileSyncManager.getCloseCount(helperId)).toBe(1)
        expect(harness.fileSyncManager.getCloseCount(excludedId)).toBe(1)
    })

    it('sends stdin only after the worker marks input as ready', async () => {
        const harness = createHarness()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({ targets: { app: { entry: 'main.cpp' } } }),
        )
        addProjectFile(harness, 'main.cpp', 'int main() { return 0; }')

        await vi.advanceTimersByTimeAsync(500)
        await harness.runner.run('app')

        const worker = MockWorker.instances[0]
        harness.runner.sendInput('ignored')
        expect(worker.messages).toHaveLength(1)

        worker.dispatchMessage({ type: 'stdin_ready' })
        expect(harness.runner.getCanSendInput()).toBe(true)

        harness.runner.sendInput('hello')
        expect(harness.runner.getCanSendInput()).toBe(false)
        expect(worker.messages).toHaveLength(2)
        expect(worker.messages[1].type).toBe('stdin')
        if (worker.messages[1].type !== 'stdin') throw new Error('Expected stdin message')
        expect(decodeBytes(worker.messages[1].bytes)).toBe('hello')

        harness.runner.sendInput('second')
        expect(worker.messages).toHaveLength(2)
    })

    it('emits process output, reports exit, and tears down the worker on completion', async () => {
        const harness = createHarness()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({ targets: { app: { entry: 'main.cpp' } } }),
        )
        addProjectFile(harness, 'main.cpp', 'int main() { return 0; }')
        const stdout = vi.fn()
        const stderr = vi.fn()
        const exit = vi.fn()

        harness.runner.on('stdout', stdout)
        harness.runner.on('stderr', stderr)
        harness.runner.on('exit', exit)

        await vi.advanceTimersByTimeAsync(500)
        await harness.runner.run('app')

        const worker = MockWorker.instances[0]
        worker.dispatchMessage({ type: 'phase', phase: 'compiling' })
        worker.dispatchMessage({ type: 'stdout', text: 'build ok\\n' })
        worker.dispatchMessage({ type: 'stderr', text: 'warn\\n' })
        worker.dispatchMessage({ type: 'done', ok: true, code: 0 })

        expect(stdout).toHaveBeenCalledWith('build ok\\n')
        expect(stderr).toHaveBeenCalledWith('warn\\n')
        expect(exit).toHaveBeenCalledWith(0, true)
        expect(harness.runner.getStatus()).toBe('success')
        expect(harness.runner.getCanSendInput()).toBe(false)
        expect(worker.terminate).toHaveBeenCalledOnce()
    })

    it('does not start the worker if stop is requested while files are still syncing', async () => {
        const harness = createHarness()
        const waitForFile = deferred<void>()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({ targets: { app: { entry: 'main.cpp' } } }),
        )
        addProjectFile(harness, 'main.cpp', 'int main() { return 0; }', waitForFile.promise)

        await vi.advanceTimersByTimeAsync(500)

        const runPromise = harness.runner.run('app')
        harness.runner.stop()
        waitForFile.resolve()
        await runPromise

        expect(harness.runner.getStatus()).toBe('idle')
        expect(MockWorker.instances).toHaveLength(0)
    })

    it('surfaces worker errors through the public error state', async () => {
        const harness = createHarness()
        harness.fileSystemManager.addRootFile(
            'run.config.json',
            JSON.stringify({ targets: { app: { entry: 'main.cpp' } } }),
        )
        addProjectFile(harness, 'main.cpp', 'int main() { return 0; }')
        const onError = vi.fn()
        harness.runner.on('error', onError)

        await vi.advanceTimersByTimeAsync(500)
        await harness.runner.run('app')

        const worker = MockWorker.instances[0]
        const terminateSpy = vi.spyOn(worker, 'terminate')
        worker.dispatchMessage({ type: 'error', message: 'Compiler crashed' })

        expect(onError).toHaveBeenCalledWith('Compiler crashed')
        expect(harness.runner.getStatus()).toBe('error')
        expect(harness.runner.getError()).toBe('Compiler crashed')
        expect(terminateSpy).toHaveBeenCalledOnce()
    })
})
