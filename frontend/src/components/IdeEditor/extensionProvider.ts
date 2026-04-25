import * as Y from 'yjs'
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
    scrollPastEnd,
} from '@codemirror/view'
import { indentOnInput, indentUnit, bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { defaultKeymap } from '@codemirror/commands'
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
    autocompletion,
    completionKeymap,
    closeBrackets,
    closeBracketsKeymap,
    completeAnyWord,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { oneDark } from '@codemirror/theme-one-dark'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { language } from '@/components/IdeEditor/extensions/language'
import { charLimit } from '@/components/IdeEditor/extensions/charLimit'
import { createFoldMarker } from '@/components/IdeEditor/extensions/foldMarker'
import { createCustomSearchPanel } from '@/components/IdeEditor/extensions/searchPanel'
import { overlayScrollbar } from '@/components/IdeEditor/extensions/scrollbar'
import type { Extension } from '@codemirror/state'

import type { SharedFile } from '@/core/fileSyncManager'
import type { NodeMeta } from '@/core/fileSystemManager'

class ExtensionProvider {
    private compartments = {
        language: new Compartment(),
    }

    public getExtensions(
        file: SharedFile,
        meta: NodeMeta,
        onLimitReached: (message: string) => void,
        undoManager: Y.UndoManager,
    ): Extension[] {
        return [
            autocompletion({ override: [completeAnyWord] }),
            bracketMatching(),
            closeBrackets(),
            crosshairCursor(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            lineNumbers(),
            foldGutter({
                markerDOM: createFoldMarker,
            }),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            highlightSelectionMatches(),
            highlightSpecialChars(),
            indentationMarkers({
                highlightActiveBlock: false,
                colors: { dark: 'var(--border-color-soft)' },
            }),
            indentOnInput(),
            indentUnit.of('    '),
            scrollPastEnd(),
            search({
                top: true,
                createPanel: createCustomSearchPanel,
            }),
            keymap.of([
                ...closeBracketsKeymap,
                ...completionKeymap,
                ...defaultKeymap,
                ...foldKeymap,
                ...lintKeymap,
                ...searchKeymap,
                ...yUndoManagerKeymap,
            ]),
            oneDark,
            rectangularSelection(),
            this.compartments.language.of(language(meta.name)),
            charLimit(onLimitReached),
            overlayScrollbar,
            yCollab(file.doc.getText(), file.awareness, { undoManager }),
        ]
    }

    public reconfigure(meta: NodeMeta): StateEffect<unknown>[] {
        return [this.compartments.language.reconfigure(language(meta.name))]
    }
}

export default ExtensionProvider
