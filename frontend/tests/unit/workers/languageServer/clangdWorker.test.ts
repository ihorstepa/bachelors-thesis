import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LanguageServerWorkerInMessage } from '@/workers/languageServer/shared'

type ClangdOptions = {
    stdinReady: () => Promise<void>
    stdin: () => number | null
    stdout: (charCode: number) => void
}

const state = vi.hoisted(() => ({
    options: null as ClangdOptions | null,
    fsPaths: new Set<string>(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    callMain: vi.fn(),
    postMessage: vi.fn(),
    messageHandler: null as ((event: MessageEvent<LanguageServerWorkerInMessage>) => void) | null,
}))

vi.mock('@/workers/utils/cachedBinaryLoader', () => ({
    loadCachedBinary: vi.fn(),
}))

vi.mock('@/workers/languageServer/clangd.js', () => ({
    default: vi.fn(async (options: ClangdOptions) => {
        state.options = options

        const fs = {
            analyzePath: (path: string) => ({ exists: state.fsPaths.has(path) }),
            writeFile: vi.fn((path: string, content: string) => {
                state.fsPaths.add(path)
                state.writeFile(path, content)
            }),
            unlink: vi.fn((path: string) => {
                state.fsPaths.delete(path)
                state.unlink(path)
            }),
            rename: vi.fn((from: string, to: string) => {
                state.fsPaths.delete(from)
                state.fsPaths.add(to)
                state.rename(from, to)
            }),
            mkdir: vi.fn((path: string) => {
                state.fsPaths.add(path)
                state.mkdir(path)
            }),
        }

        return {
            FS: fs,
            callMain: state.callMain,
        }
    }),
}))

function drainStdinText(stdin: () => number | null): string {
    const bytes: number[] = []
    let nullStreak = 0

    for (let i = 0; i < 5000; i += 1) {
        const value = stdin()
        if (value == null) {
            nullStreak += 1
            if (nullStreak >= 3) break
            continue
        }
        nullStreak = 0
        bytes.push(value)
    }

    return new TextDecoder().decode(new Uint8Array(bytes))
}

function dispatchWorkerMessage(message: LanguageServerWorkerInMessage): void {
    if (!state.messageHandler) {
        throw new Error('Worker message handler is not registered')
    }
    state.messageHandler({ data: message } as MessageEvent<LanguageServerWorkerInMessage>)
}

let moduleInitPromise: Promise<void> | null = null

async function initWorkerModule(): Promise<void> {
    if (!moduleInitPromise) {
        moduleInitPromise = import('@/workers/languageServer/clangdWorker').then(() => undefined)
    }
    await moduleInitPromise
}

describe('workers/languageServer/clangdWorker', () => {
    beforeEach(() => {
        state.fsPaths = new Set(['/project'])

        state.writeFile.mockReset()
        state.unlink.mockReset()
        state.rename.mockReset()
        state.mkdir.mockReset()
        state.callMain.mockReset()
        state.postMessage.mockReset()

        vi.stubGlobal('self', {
            postMessage: state.postMessage,
            addEventListener: vi.fn(
                (event: string, handler: (event: MessageEvent<LanguageServerWorkerInMessage>) => void) => {
                    if (event === 'message') {
                        state.messageHandler = handler
                    }
                },
            ),
        })
    })

    it('initializes clangd FS config files, starts main, and posts ready', async () => {
        await initWorkerModule()

        expect(state.callMain).toHaveBeenCalledWith(['--enable-config'])
        expect(state.writeFile).toHaveBeenCalledWith('/project/.clangd', expect.any(String))
        expect(state.writeFile).toHaveBeenCalledWith('/project/.clang-format', expect.any(String))
        expect(state.postMessage).toHaveBeenCalledWith({ type: 'ready' })
    })

    it('sync writes files and emits watched-files created/changed notifications', async () => {
        await initWorkerModule()

        dispatchWorkerMessage({ type: 'sync', path: 'src/main.cpp', content: 'int main(){}' })
        expect(state.writeFile).toHaveBeenCalledWith('/project/src/main.cpp', 'int main(){}')

        const firstPayload = drainStdinText(state.options!.stdin)
        expect(firstPayload).toContain('workspace/didChangeWatchedFiles')
        expect(firstPayload).toContain('"type":1')

        dispatchWorkerMessage({ type: 'sync', path: 'src/main.cpp', content: 'int main(){return 0;}' })

        const secondPayload = drainStdinText(state.options!.stdin)
        expect(secondPayload).toContain('workspace/didChangeWatchedFiles')
        expect(secondPayload).toContain('"type":2')
    })

    it('delete and rename send correct watched-file change notifications', async () => {
        await initWorkerModule()

        state.fsPaths.add('/project/src/old.cpp')

        dispatchWorkerMessage({ type: 'rename', oldPath: 'src/old.cpp', newPath: 'src/new.cpp' })
        expect(state.rename).toHaveBeenCalledWith('/project/src/old.cpp', '/project/src/new.cpp')
        const renamePayload = drainStdinText(state.options!.stdin)
        expect(renamePayload).toContain('"type":3')
        expect(renamePayload).toContain('"type":1')

        dispatchWorkerMessage({ type: 'delete', path: 'src/new.cpp' })
        expect(state.unlink).toHaveBeenCalledWith('/project/src/new.cpp')
        const deletePayload = drainStdinText(state.options!.stdin)
        expect(deletePayload).toContain('"type":3')
    })

    it('escapes non-ASCII chars in JSON-RPC payload and reports stdout JSON parse errors', async () => {
        await initWorkerModule()

        dispatchWorkerMessage({ type: 'lsp', payload: '{"text":"é"}' })
        const lspPayload = drainStdinText(state.options!.stdin)

        expect(lspPayload).toContain('Content-Length:')
        expect(lspPayload).toContain('\\u00e9')

        for (const code of Array.from(new TextEncoder().encode('{broken-json}'))) {
            state.options!.stdout(code)
        }

        expect(state.postMessage).toHaveBeenCalledWith({
            type: 'error',
            message: 'clangd produced invalid JSON output',
        })
    })
})
