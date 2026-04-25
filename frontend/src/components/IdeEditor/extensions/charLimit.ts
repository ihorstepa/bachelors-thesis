import type { Extension } from '@codemirror/state'
import { EditorState } from '@codemirror/state'

export const MAX_EDITOR_CHARS = 5_000_000

export function charLimit(onLimitReached: (message: string) => void): Extension {
    return EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) {
            return tr
        }
        if (tr.newDoc.length > MAX_EDITOR_CHARS) {
            onLimitReached(`Document character limit reached (${MAX_EDITOR_CHARS.toLocaleString()} max)`)
            return []
        }
        return tr
    })
}
