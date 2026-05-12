import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
    connectCalls: 0,
    pluginCalls: [] as string[],
    createLanguageManager: () => ({
        send: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
        getDocumentUri: vi.fn((fileId: string) => `file:///project/${fileId}.cpp`),
    }),
}))

vi.mock('@codemirror/lang-cpp', () => ({ cpp: vi.fn(() => 'cpp-ext') }))
vi.mock('@codemirror/lang-json', () => ({ json: vi.fn(() => 'json-ext') }))
vi.mock('@codemirror/lang-markdown', () => ({ markdown: vi.fn(() => 'markdown-ext') }))
vi.mock('@codemirror/language-data', () => ({ languages: [] }))

vi.mock('@codemirror/autocomplete', () => ({
    autocompletion: vi.fn((opts: unknown) => ({ kind: 'autocompletion', opts })),
    completeAnyWord: 'complete-any-word',
}))

vi.mock('@codemirror/view', () => ({
    keymap: { of: vi.fn((value: unknown) => ({ kind: 'keymap', value })) },
}))

vi.mock('@codemirror/lsp-client', () => {
    class LSPClient {
        public connect(connection: unknown): this {
            void connection
            state.connectCalls += 1
            return this
        }

        public plugin(uri: string): string {
            state.pluginCalls.push(uri)
            return `plugin:${uri}`
        }
    }

    return {
        LSPClient,
        formatKeymap: ['format-keymap'],
        hoverTooltips: vi.fn(() => 'hover'),
        serverCompletion: vi.fn(() => 'completion'),
        serverDiagnostics: vi.fn(() => 'diagnostics'),
        signatureHelp: vi.fn(() => 'signature-help'),
    }
})

async function importLanguageModule() {
    return import('@/components/IdeEditor/extensions/language')
}

describe('components/IdeEditor/extensions/language', () => {
    beforeEach(() => {
        vi.resetModules()
        state.connectCalls = 0
        state.pluginCalls = []
    })

    it('maps filenames to language names case-insensitively', async () => {
        const { getLanguageName } = await importLanguageModule()

        expect(getLanguageName('main.C')).toBe('C')
        expect(getLanguageName('main.HPP')).toBe('C++')
        expect(getLanguageName('config.JSON')).toBe('JSON')
        expect(getLanguageName('README.md')).toBe('Markdown')
        expect(getLanguageName('Makefile')).toBeNull()
    })

    it('falls back to word completion when no LSP URI exists', async () => {
        const languageManager = state.createLanguageManager()
        languageManager.getDocumentUri.mockReturnValue(null as unknown as string)
        const { languageSupport } = await importLanguageModule()

        const extensions = languageSupport(languageManager as never, 'f1', 'main.cpp')

        expect(extensions).toHaveLength(2)
        expect(extensions[0]).toBe('cpp-ext')
        expect(extensions[1]).toMatchObject({ kind: 'autocompletion' })
        expect(state.connectCalls).toBe(0)
    })

    it('creates a single shared LSP client and returns language plugin extensions', async () => {
        const languageManager = state.createLanguageManager()
        const { languageSupport } = await importLanguageModule()

        const first = languageSupport(languageManager as never, 'f1', 'main.cpp')
        const second = languageSupport(languageManager as never, 'f2', 'util.hpp')

        expect(state.connectCalls).toBe(1)
        expect(first.some((ext) => (ext as unknown as string) === 'plugin:file:///project/f1.cpp')).toBe(true)
        expect(second.some((ext) => (ext as unknown as string) === 'plugin:file:///project/f2.cpp')).toBe(true)
        expect(state.pluginCalls).toEqual(['file:///project/f1.cpp', 'file:///project/f2.cpp'])
    })

    it('recreates LSP client when language server manager instance changes', async () => {
        const firstManager = state.createLanguageManager()
        const secondManager = state.createLanguageManager()
        const { languageSupport } = await importLanguageModule()

        languageSupport(firstManager as never, 'f1', 'main.cpp')
        languageSupport(secondManager as never, 'f2', 'util.hpp')

        expect(state.connectCalls).toBe(2)
        expect(state.pluginCalls).toEqual(['file:///project/f1.cpp', 'file:///project/f2.cpp'])
    })

    it('returns language extension for supported file types', async () => {
        const { language } = await importLanguageModule()

        expect(language('main.cpp')).toBe('cpp-ext')
        expect(language('util.h')).toBe('cpp-ext')
        expect(language('config.json')).toBe('json-ext')
        expect(language('readme.md')).toBe('markdown-ext')
    })

    it('returns empty array for unsupported file types', async () => {
        const { language } = await importLanguageModule()

        expect(language('Makefile')).toEqual([])
        expect(language('file.txt')).toEqual([])
        expect(language('script.sh')).toEqual([])
    })
})
