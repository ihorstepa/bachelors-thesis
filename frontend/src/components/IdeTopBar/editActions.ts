import { openSearchPanel } from '@codemirror/search'
import { EditorView } from '@codemirror/view'
import type { RefObject } from 'react'
import type * as Y from 'yjs'

import { assertNever } from '@/utils/functions'

export const editMenuActions = ['undo', 'redo', 'cut', 'copy', 'paste', 'find'] as const
export type EditMenuAction = (typeof editMenuActions)[number]

type EditActionContext = {
    editorViewRef: RefObject<EditorView | null>
    activeUndoManagerRef: RefObject<Y.UndoManager | null>
}

const resolveActiveEditorView = (editorViewRef: RefObject<EditorView | null>): EditorView | null => {
    const sharedView = editorViewRef.current
    if (sharedView && sharedView.dom.isConnected) {
        return sharedView
    }

    const visibleEditor = Array.from(document.querySelectorAll<HTMLElement>('.ide-editor-container .cm-editor')).find(
        (element) => element.offsetParent !== null,
    )

    if (!visibleEditor) {
        return null
    }

    const domView = EditorView.findFromDOM(visibleEditor)
    if (domView) {
        editorViewRef.current = domView
    }
    return domView
}

const copySelectionToClipboard = async (view: EditorView) => {
    const text = view.state.selection.ranges.map((range) => view.state.sliceDoc(range.from, range.to)).join('\n')
    if (!text) return
    await navigator.clipboard.writeText(text)
}

const cutSelectionToClipboard = async (view: EditorView) => {
    const selectedRanges = view.state.selection.ranges.filter((range) => range.from !== range.to)
    if (selectedRanges.length === 0) return

    await copySelectionToClipboard(view)

    const changes = [...selectedRanges]
        .sort((a, b) => b.from - a.from)
        .map((range) => ({ from: range.from, to: range.to, insert: '' }))

    view.dispatch({
        changes,
        userEvent: 'delete.cut',
    })
}

const pasteFromClipboard = async (view: EditorView) => {
    const text = await navigator.clipboard.readText()
    if (!text) return

    view.dispatch(view.state.replaceSelection(text), {
        userEvent: 'input.paste',
    })
}

export const runEditMenuAction = async (action: EditMenuAction, context: EditActionContext) => {
    const view = resolveActiveEditorView(context.editorViewRef)
    if (!view) return
    view.focus()

    switch (action) {
        case 'undo':
            context.activeUndoManagerRef.current?.undo()
            break
        case 'redo':
            context.activeUndoManagerRef.current?.redo()
            break
        case 'cut':
            await cutSelectionToClipboard(view)
            break
        case 'copy':
            await copySelectionToClipboard(view)
            break
        case 'paste':
            await pasteFromClipboard(view)
            break
        case 'find':
            openSearchPanel(view)
            break
        default:
            assertNever(action)
    }
}
