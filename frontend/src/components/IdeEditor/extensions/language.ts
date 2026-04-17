import { cpp } from '@codemirror/lang-cpp'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import type { Extension } from '@uiw/react-codemirror'

export type LanguageName = 'C' | 'C++' | 'JSON' | 'Markdown'

export const languageExtensions: Record<LanguageName, string[]> = {
    C: ['c', 'h'],
    'C++': ['cpp', 'hpp', 'hxx', 'cxx'],
    JSON: ['json'],
    Markdown: ['md', 'markdown'],
}

const extensionCreators: Record<LanguageName, () => Extension> = {
    C: () => cpp(),
    'C++': () => cpp(),
    JSON: () => json(),
    Markdown: () => markdown({ codeLanguages: languages }),
}

const extensionToNameMap: Record<string, LanguageName> = {}
for (const [name, exts] of Object.entries(languageExtensions)) {
    for (const ext of exts) {
        extensionToNameMap[ext.toLowerCase()] = name as keyof typeof languageExtensions
    }
}

function getFileExtension(filename: string): string {
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
