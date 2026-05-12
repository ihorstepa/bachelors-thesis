import { autocompletion, completeAnyWord } from '@codemirror/autocomplete'
import { cpp } from '@codemirror/lang-cpp'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import {
    formatKeymap,
    hoverTooltips,
    LSPClient,
    serverCompletion,
    serverDiagnostics,
    signatureHelp,
} from '@codemirror/lsp-client'
import { keymap } from '@codemirror/view'
import type { Extension } from '@uiw/react-codemirror'

import type { LanguageServerManager } from '@/core/languageServerManager'

export type LanguageName = 'C' | 'C++' | 'JSON' | 'Markdown'

export const languageFileExtensions: Record<LanguageName, string[]> = {
    C: ['c', 'h'],
    'C++': ['cpp', 'hpp', 'hxx', 'cxx'],
    JSON: ['json'],
    Markdown: ['md', 'markdown'],
}

const lspSupportedLanguages: Set<LanguageName> = new Set(['C', 'C++'])

const extensionCreators: Record<LanguageName, () => Extension> = {
    C: () => cpp(),
    'C++': () => cpp(),
    JSON: () => json(),
    Markdown: () => markdown({ codeLanguages: languages }),
}

const extensionToNameMap: Record<string, LanguageName> = {}
for (const [name, exts] of Object.entries(languageFileExtensions)) {
    for (const ext of exts) {
        extensionToNameMap[ext.toLowerCase()] = name as keyof typeof languageFileExtensions
    }
}

function getFileExtension(filename: string): string {
    if (filename.lastIndexOf('.') === -1) return ''
    return filename.split('.').pop()?.toLowerCase() || ''
}

export function getLanguageName(filename: string): LanguageName | null {
    const languageName = extensionToNameMap[getFileExtension(filename)]
    return languageName ?? null
}

export function language(filename: string): Extension {
    const languageName = extensionToNameMap[getFileExtension(filename)]

    if (languageName != null) {
        return extensionCreators[languageName]()
    }

    return []
}

const lspClients = new WeakMap<LanguageServerManager, LSPClient>()

function createLspClient(languageServerManager: LanguageServerManager): LSPClient {
    return new LSPClient({
        extensions: [serverDiagnostics(), hoverTooltips({ hoverTime: 250 }), signatureHelp(), serverCompletion()],
    }).connect({
        send: (msg) => languageServerManager.send(msg),
        subscribe: (h) => languageServerManager.on('message', h),
        unsubscribe: (h) => languageServerManager.off('message', h),
    })
}

function getLspClient(languageServerManager: LanguageServerManager): LSPClient {
    const existing = lspClients.get(languageServerManager)
    if (existing) {
        return existing
    }

    const next = createLspClient(languageServerManager)
    lspClients.set(languageServerManager, next)
    return next
}

function languageServer(languageServerManager: LanguageServerManager, fileId: string, fileName: string): Extension[] {
    const languageName = extensionToNameMap[getFileExtension(fileName)]
    if (!languageName || !lspSupportedLanguages.has(languageName)) {
        return []
    }

    const uri = languageServerManager.getDocumentUri(fileId)
    if (!uri) {
        return []
    }

    return [getLspClient(languageServerManager).plugin(uri)]
}

export function languageSupport(
    languageServerManager: LanguageServerManager,
    fileId: string,
    fileName: string,
): Extension[] {
    const lspExtensions = languageServer(languageServerManager, fileId, fileName)

    return [
        language(fileName),
        autocompletion(lspExtensions.length === 0 ? { override: [completeAnyWord] } : {}),
        ...(lspExtensions.length > 0 ? [keymap.of(formatKeymap)] : []),
        ...lspExtensions,
    ]
}
