import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { LanguageServerWorkerInMessage, LanguageServerWorkerOutMessage } from '@/workers/languageServer/shared'

type LspMessage = Record<string, unknown>
type DiagnosticsParams = { uri: string; diagnostics: unknown[] }

class ClangdWorkerDriver {
    private readonly worker: Worker
    private nextId = 1
    private readonly pendingRequests = new Map<number, (result: LspMessage) => void>()
    private readonly notifications: LspMessage[] = []
    public readonly errors: string[] = []
    private readyResolve!: () => void
    public readonly ready: Promise<void>

    public constructor() {
        this.ready = new Promise<void>((resolve) => {
            this.readyResolve = resolve
        })
        this.worker = new Worker(new URL('../../../src/workers/languageServer/clangdWorker.ts', import.meta.url), {
            type: 'module',
        })
        this.worker.onmessage = (event: MessageEvent<LanguageServerWorkerOutMessage>) => {
            const msg = event.data
            switch (msg.type) {
                case 'ready':
                    this.readyResolve()
                    break
                case 'lsp': {
                    const payload = msg.payload as LspMessage
                    const id = payload.id as number | undefined
                    if (id != null) {
                        this.pendingRequests.get(id)?.(payload)
                        this.pendingRequests.delete(id)
                    } else {
                        this.notifications.push(payload)
                    }
                    break
                }
                case 'error':
                    this.errors.push(msg.message)
                    break
            }
        }
    }

    public terminate(): void {
        this.worker.terminate()
    }

    public async request(method: string, params: unknown): Promise<LspMessage> {
        const id = this.nextId++
        return new Promise<LspMessage>((resolve) => {
            this.pendingRequests.set(id, resolve)
            this.worker.postMessage({
                type: 'lsp',
                payload: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
            } satisfies LanguageServerWorkerInMessage)
        })
    }

    public notify(method: string, params: unknown): void {
        this.worker.postMessage({
            type: 'lsp',
            payload: JSON.stringify({ jsonrpc: '2.0', method, params }),
        } satisfies LanguageServerWorkerInMessage)
    }

    public sync(path: string, content: string): void {
        this.worker.postMessage({ type: 'sync', path, content } satisfies LanguageServerWorkerInMessage)
    }

    public delete(path: string): void {
        this.worker.postMessage({ type: 'delete', path } satisfies LanguageServerWorkerInMessage)
    }

    public rename(oldPath: string, newPath: string): void {
        this.worker.postMessage({ type: 'rename', oldPath, newPath } satisfies LanguageServerWorkerInMessage)
    }

    public openDocument(path: string, content: string): void {
        this.notify('textDocument/didOpen', {
            textDocument: { uri: `file:///project/${path}`, languageId: 'cpp', version: 1, text: content },
        })
    }

    public closeDocument(path: string): void {
        this.notify('textDocument/didClose', { textDocument: { uri: `file:///project/${path}` } })
    }

    public async waitForNotification(predicate: (msg: LspMessage) => boolean, timeoutMs = 30_000): Promise<LspMessage> {
        const deadline = Date.now() + timeoutMs
        while (Date.now() < deadline) {
            const found = this.notifications.find(predicate)
            if (found) return found
            await new Promise<void>((resolve) => setTimeout(resolve, 50))
        }
        throw new Error(`Timed out waiting for notification. Received:\n${JSON.stringify(this.notifications, null, 2)}`)
    }

    public waitForDiagnostics(
        path: string,
        predicate: (count: number) => boolean,
        timeoutMs = 60_000,
    ): Promise<DiagnosticsParams> {
        const uri = `file:///project/${path}`
        return this.waitForNotification(
            (msg) =>
                msg.method === 'textDocument/publishDiagnostics' &&
                (msg.params as DiagnosticsParams).uri === uri &&
                predicate((msg.params as DiagnosticsParams).diagnostics.length),
            timeoutMs,
        ).then((msg) => msg.params as DiagnosticsParams)
    }

    public async initialize(): Promise<LspMessage> {
        const result = await this.request('initialize', {
            processId: null,
            clientInfo: { name: 'vitest-integration', version: '0.0.1' },
            rootUri: 'file:///project',
            capabilities: {
                textDocument: {
                    synchronization: { dynamicRegistration: false },
                    completion: { dynamicRegistration: false },
                    hover: { dynamicRegistration: false },
                },
            },
        })
        this.notify('initialized', {})
        return result
    }
}

describe('languageServer worker integration', () => {
    let driver: ClangdWorkerDriver
    let initResult: LspMessage

    beforeEach(async () => {
        driver = new ClangdWorkerDriver()
        await driver.ready
        initResult = await driver.initialize()
    })

    afterEach(() => {
        expect(driver.errors).toEqual([])
        driver.terminate()
    })

    it('completes LSP handshake and reports server capabilities', () => {
        expect(initResult.result).toMatchObject({
            capabilities: expect.objectContaining({
                completionProvider: expect.any(Object),
                hoverProvider: expect.any(Boolean),
            }),
        })
    })

    it('accepts a synced file without errors', async () => {
        driver.sync('src/main.cpp', 'int main() { return 0; }')
        // A brief pause is sufficient to confirm no error is emitted
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
    })

    it('reports diagnostics after opening a file with a compile error', async () => {
        const content = 'int main() { undeclared_var; }'
        driver.sync('src/broken.cpp', content)
        driver.openDocument('src/broken.cpp', content)

        const params = await driver.waitForDiagnostics('src/broken.cpp', (n) => n > 0)
        expect(params.diagnostics.length).toBeGreaterThan(0)
    })

    it('provides completions for a standard library method', async () => {
        const content = '#include <string>\nint main() { std::string s; s. }'
        driver.sync('src/main.cpp', content)
        driver.openDocument('src/main.cpp', content)

        await driver.waitForDiagnostics('src/main.cpp', () => true)

        const result = await driver.request('textDocument/completion', {
            textDocument: { uri: 'file:///project/src/main.cpp' },
            position: { line: 1, character: 30 },
        })

        const items = (result.result as { items?: unknown[] } | null)?.items ?? result.result
        expect(Array.isArray(items)).toBe(true)
        expect((items as unknown[]).length).toBeGreaterThan(0)
    })

    it('provides hover information for a known symbol', async () => {
        const content = '#include <string>\nint main() { std::string s; return 0; }'
        driver.sync('src/main.cpp', content)
        driver.openDocument('src/main.cpp', content)

        await driver.waitForDiagnostics('src/main.cpp', () => true)

        const result = await driver.request('textDocument/hover', {
            textDocument: { uri: 'file:///project/src/main.cpp' },
            position: { line: 1, character: 15 },
        })

        expect(result.result).not.toBeNull()
        expect((result.result as { contents: unknown }).contents).toBeTruthy()
    })

    it('clears diagnostics when a file is deleted', async () => {
        const content = 'int main() { undeclared_var; }'
        driver.sync('src/broken.cpp', content)
        driver.openDocument('src/broken.cpp', content)

        await driver.waitForDiagnostics('src/broken.cpp', (n) => n > 0)

        driver.closeDocument('src/broken.cpp')
        driver.delete('src/broken.cpp')

        const params = await driver.waitForDiagnostics('src/broken.cpp', (n) => n === 0)
        expect(params.diagnostics).toEqual([])
    })

    it('moves diagnostics to the new URI after a file is renamed', async () => {
        const content = 'int main() { undeclared_var; }'
        driver.sync('src/old.cpp', content)
        driver.openDocument('src/old.cpp', content)

        await driver.waitForDiagnostics('src/old.cpp', (n) => n > 0)

        driver.closeDocument('src/old.cpp')
        driver.rename('src/old.cpp', 'src/new.cpp')
        driver.openDocument('src/new.cpp', content)

        const params = await driver.waitForDiagnostics('src/new.cpp', (n) => n > 0)
        expect(params.diagnostics.length).toBeGreaterThan(0)
    })
})
