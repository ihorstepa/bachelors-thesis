import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { defaultKeymap } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, indentUnit } from '@codemirror/language'
import { lintKeymap } from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import type { Extension } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
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
import { languageSupport } from '@/components/IdeEditor/extensions/language'
import { overlayScrollbar } from '@/components/IdeEditor/extensions/scrollbar'
import { createCustomSearchPanel } from '@/components/IdeEditor/extensions/searchPanel'
import type { SharedFile } from '@/core/fileSyncManager'
import type { NodeMeta } from '@/core/fileSystemManager'
import type { LanguageServerManager } from '@/core/languageServerManager'

class ExtensionProvider {
    private languageServerManager: LanguageServerManager

    public constructor(languageServerManager: LanguageServerManager) {
        this.languageServerManager = languageServerManager
    }

    public getExtensions(
        file: SharedFile,
        fileId: string,
        meta: NodeMeta,
        onLimitReached: (message: string) => void,
        undoManager: Y.UndoManager,
    ): Extension[] {
        return [
            bracketMatching(),
            charLimit(onLimitReached),
            closeBrackets(),
            crosshairCursor(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            lineNumbers(), // Extension order for gutters influences their display order
            foldGutter({
                markerDOM: createFoldMarker,
            }),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            highlightSelectionMatches(),
            highlightSpecialChars(),
            indentationMarkers({
                highlightActiveBlock: false,
                colors: { dark: 'var(--bg-selection)' },
            }),
            indentOnInput(),
            indentUnit.of('    '),
            keymap.of([
                ...closeBracketsKeymap,
                ...completionKeymap,
                ...defaultKeymap,
                ...foldKeymap,
                ...lintKeymap,
                ...searchKeymap,
                ...yUndoManagerKeymap,
            ]),
            languageSupport(this.languageServerManager, fileId, meta.name),
            oneDark,
            overlayScrollbar,
            rectangularSelection(),
            scrollPastEnd(),
            search({
                top: true,
                createPanel: createCustomSearchPanel,
            }),
            yCollab(file.doc.getText(), file.awareness, { undoManager }),
        ]
    }
}

export default ExtensionProvider
