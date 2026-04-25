import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completeAnyWord,
    completionKeymap,
} from '@codemirror/autocomplete'
import { defaultKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import type { Extension, StateEffect } from '@codemirror/state'
import { Compartment, EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
    scrollPastEnd,
} from '@codemirror/view'
import { indentationMarkers } from '@replit/codemirror-indentation-markers'
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next'
import type * as Y from 'yjs'

import { charLimit } from '@/components/IdeEditor/extensions/charLimit'
import { createFoldMarker } from '@/components/IdeEditor/extensions/foldMarker'
import { language } from '@/components/IdeEditor/extensions/language'
import { overlayScrollbar } from '@/components/IdeEditor/extensions/scrollbar'
import { createCustomSearchPanel } from '@/components/IdeEditor/extensions/searchPanel'
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
