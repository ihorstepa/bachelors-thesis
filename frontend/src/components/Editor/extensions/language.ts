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
        extensionToNameMap[ext.toLowerCase()] = name as LanguageName
    }
}

export function getLanguageName(filename: string): LanguageName {
    const fileExt = filename.split('.').pop()?.toLowerCase() || ''
    return extensionToNameMap[fileExt]
}

export function language(filename: string): Extension {
    const fileExt = filename.split('.').pop()?.toLowerCase() || ''
    const languageName = extensionToNameMap[fileExt]

    if (languageName && extensionCreators[languageName]) {
        return extensionCreators[languageName]()
    }

    return []
}
