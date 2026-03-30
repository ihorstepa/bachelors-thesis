import { EditorState, Compartment, StateEffect } from '@codemirror/state'
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
import { indentOnInput, indentUnit, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { yCollab } from 'y-codemirror.next'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { language } from '@/components/Editor/extensions/language'
import type { Extension } from '@codemirror/state'

import type { SharedFile } from '@/core/fileSyncManager'
import type { NodeMeta } from '@/core/fileSystemManager'

class ExtensionProvider {
    private compartments = {
        language: new Compartment(),
    }

    public getExtensions(file: SharedFile, meta: NodeMeta): Extension[] {
        return [
            autocompletion(),
            bracketMatching(),
            closeBrackets(),
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
            indentationMarkers({
                highlightActiveBlock: false,
                colors: { dark: '#3b3f46' },
            }),
            indentOnInput(),
            indentUnit.of('    '),
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
            this.compartments.language.of(language(meta.name)),
            yCollab(file.doc.getText(), file.awareness),
        ]
    }

    public reconfigure(meta: NodeMeta): StateEffect<unknown>[] {
        return [this.compartments.language.reconfigure(language(meta.name))]
    }
}

export default ExtensionProvider
