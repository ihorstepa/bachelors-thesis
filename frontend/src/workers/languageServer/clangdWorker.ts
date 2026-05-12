import { JsonStream } from '@/utils/classes'
import { assertNever } from '@/utils/functions'
import Clangd, { type ClangdModule } from '@/workers/languageServer/clangd.js'
import { dirname, ensureDirectory, toProjectPath, toProjectUri } from '@/workers/languageServer/projectFileSystem'
import type { LanguageServerWorkerInMessage, LanguageServerWorkerOutMessage } from '@/workers/languageServer/shared'
import { loadCachedBinary } from '@/workers/utils/cachedBinaryLoader'

const enum FileChangeType {
    Created = 1,
    Changed = 2,
    Deleted = 3,
}

const sharedFlags = [
    '--target=wasm32-wasi',
    '-isystem/usr/include/c++/v1',
    '-isystem/usr/include/wasm32-wasi/c++/v1',
    '-isystem/usr/include',
    '-isystem/usr/include/wasm32-wasi',
    '-Wall',
    '-Wextra',
]

const clangdConfig = [
    'Format:',
    "  Style: 'file'",
    'Hover:',
    '  ShowAKA: No',
    'Completion:',
    '  AllScopes: Yes',
    '  ArgumentLists: None',
    '  HeaderInsertion: IWYU',
    '  CodePatterns: All',
    'Diagnostics:',
    '  UnusedIncludes: Strict',
    'InlayHints:',
    '  Enabled: Yes',
    '  ParameterNames: Yes',
    '  DeducedTypes: Yes',
    '  Designators: Yes',
    'CompileFlags:',
    `  Add: [${sharedFlags.map((f) => `'${f}'`).join(', ')}, '-std=c17', '-x', 'c']`,
    '---',
    'If:',
    "  PathMatch: '.*\\.(cpp|hpp|hxx|cxx)'",
    'CompileFlags:',
    "  Add: ['-std=c++2b', '-x', 'c++']",
    "  Remove: ['-std=c17', '-x', 'c']",
].join('\n')

const clangFormat = ['BasedOnStyle: LLVM', 'IndentWidth: 4', 'TabWidth: 4', 'UseTab: Never'].join('\n')

const encoder = new TextEncoder()

// We buffer pending LSP messages as raw strings and feed them one byte at a time
const stdinChunks: string[] = []
const currentStdinChunk: Array<number | null> = []
const jsonStream = new JsonStream()

const wasmPath = '/binaries/clangd.wasm.gz'
const cacheName = 'toolchain-v1'

let resolveStdinReady = () => {}

const post = (msg: LanguageServerWorkerOutMessage) => self.postMessage(msg)

function pushJsonRpc(message: unknown): void {
    const rawBody = typeof message === 'string' ? message : JSON.stringify(message)
    // clangd's stdin parser expects pure ASCII, we need to escape non-ASCII chars as \uXXXX
    // so Content-Length (byte count) stays correct
    const body = rawBody.replace(
        /[\u007F-\uFFFF]/g,
        (char) => `\\u${char.codePointAt(0)?.toString(16).padStart(4, '0')}`,
    )
    stdinChunks.push(`Content-Length: ${body.length}\r\n`, '\r\n', body)
    resolveStdinReady()
}

function sendWatchedFilesChanged(changes: Array<{ uri: string; type: FileChangeType }>): void {
    if (changes.length === 0) return

    pushJsonRpc({
        jsonrpc: '2.0',
        method: 'workspace/didChangeWatchedFiles',
        params: { changes },
    })
}

function handleSync(clangd: ClangdModule, msg: Extract<LanguageServerWorkerInMessage, { type: 'sync' }>): void {
    const absolutePath = toProjectPath(msg.path)
    ensureDirectory(clangd.FS, dirname(absolutePath))

    const exists = clangd.FS.analyzePath(absolutePath).exists
    clangd.FS.writeFile(absolutePath, msg.content)

    sendWatchedFilesChanged([
        { uri: toProjectUri(msg.path), type: exists ? FileChangeType.Changed : FileChangeType.Created },
    ])
}

function handleDelete(clangd: ClangdModule, msg: Extract<LanguageServerWorkerInMessage, { type: 'delete' }>): void {
    const absolutePath = toProjectPath(msg.path)
    if (!clangd.FS.analyzePath(absolutePath).exists) return

    clangd.FS.unlink(absolutePath)
    sendWatchedFilesChanged([{ uri: toProjectUri(msg.path), type: FileChangeType.Deleted }])
}

function handleRename(clangd: ClangdModule, msg: Extract<LanguageServerWorkerInMessage, { type: 'rename' }>): void {
    const oldAbsolutePath = toProjectPath(msg.oldPath)
    const newAbsolutePath = toProjectPath(msg.newPath)

    if (!clangd.FS.analyzePath(oldAbsolutePath).exists) return

    ensureDirectory(clangd.FS, dirname(newAbsolutePath))
    clangd.FS.rename(oldAbsolutePath, newAbsolutePath)

    sendWatchedFilesChanged([
        { uri: toProjectUri(msg.oldPath), type: FileChangeType.Deleted },
        { uri: toProjectUri(msg.newPath), type: FileChangeType.Created },
    ])
}

const clangd = await Clangd({
    thisProgram: '/usr/bin/clangd',
    locateFile: (path: string) => (path === 'clangd.wasm' ? wasmPath : `/binaries/${path}`),
    instantiateWasm: (imports, receiveInstance) => {
        loadCachedBinary(cacheName, wasmPath, { credentials: 'same-origin' })
            .then(async (wasmBytes) => {
                const { instance, module } = (await WebAssembly.instantiate(
                    wasmBytes,
                    imports,
                )) as unknown as WebAssembly.WebAssemblyInstantiatedSource
                receiveInstance(instance, module)
            })
            .catch((error: unknown) => {
                post({ type: 'error', message: `Failed to load clangd binary: ${String(error)}` })
                throw error
            })
        return {} as WebAssembly.Exports
    },
    stdinReady: async () => {
        if (stdinChunks.length > 0) return
        await new Promise<void>((resolve) => {
            resolveStdinReady = resolve
        })
    },
    stdin: () => {
        if (currentStdinChunk.length === 0) {
            if (stdinChunks.length === 0) return null
            // Feed stdin one byte at a time and terminate each chunk with null sentinel
            currentStdinChunk.push(...encoder.encode(stdinChunks.shift() ?? ''), null)
        }
        return currentStdinChunk.shift() ?? null
    },
    stdout: (charCode: number) => {
        const jsonOrNull = jsonStream.insert(charCode)
        if (jsonOrNull === null) return
        try {
            post({ type: 'lsp', payload: JSON.parse(jsonOrNull) })
        } catch {
            post({ type: 'error', message: 'clangd produced invalid JSON output' })
        }
    },
    stderr: () => {},
    onExit: () => post({ type: 'error', message: 'clangd worker aborted unexpectedly' }),
    onAbort: () => post({ type: 'error', message: 'clangd worker aborted unexpectedly' }),
})

ensureDirectory(clangd.FS, '/project')
clangd.FS.writeFile('/project/.clangd', clangdConfig)
clangd.FS.writeFile('/project/.clang-format', clangFormat)
clangd.callMain(['--enable-config'])

post({ type: 'ready' })

self.addEventListener('message', (event: MessageEvent<LanguageServerWorkerInMessage>) => {
    const msg = event.data

    switch (msg.type) {
        case 'lsp':
            pushJsonRpc(msg.payload)
            break
        case 'sync':
            handleSync(clangd, msg)
            break
        case 'delete':
            handleDelete(clangd, msg)
            break
        case 'rename':
            handleRename(clangd, msg)
            break
        default:
            assertNever(msg)
    }
})
