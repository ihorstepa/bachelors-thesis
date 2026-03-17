import type { Extension } from '@codemirror/state'

import { EditorState } from '@codemirror/state'
import {
    keymap,
    highlightSpecialChars,
    drawSelection,
    highlightActiveLine,
    dropCursor,
    rectangularSelection,
    crosshairCursor,
    lineNumbers,
    highlightActiveLineGutter,
} from '@codemirror/view'
import {
    indentOnInput,
    indentUnit,
    bracketMatching,
    foldGutter,
    foldKeymap,
} from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { cpp } from '@codemirror/lang-cpp'

import collaboration from '@/components/Editor/extenstions/collaboration'

export default function getExtensions(): Extension[] {
    return [
        autocompletion(),
        bracketMatching(),
        closeBrackets(),
        collaboration(),
        cpp(),
        crosshairCursor(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        foldGutter(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSelectionMatches(),
        highlightSpecialChars(),
        history(),
        indentOnInput(),
        indentUnit.of('  '),
        keymap.of([
            ...closeBracketsKeymap,
            ...completionKeymap,
            ...defaultKeymap,
            ...foldKeymap,
            ...historyKeymap,
            ...lintKeymap,
            ...searchKeymap,
        ]),
        lineNumbers(),
        oneDark,
        rectangularSelection(),
    ]
}
