import type { EditorView } from '@codemirror/view'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import type * as Y from 'yjs'

import { EditorContext, type EditorContextType, type EditorState } from '@/contextProviders/editor/EditorContext'

type Props = {
    children: ReactNode
}

function EditorProvider({ children }: Props) {
    const [editorState, setEditorState] = useState<EditorState>({
        language: null,
        line: 0,
        column: 0,
        selected: 0,
    })
    const editorViewRef = useRef<EditorView | null>(null)
    const activeUndoManagerRef = useRef<Y.UndoManager | null>(null)

    const value: EditorContextType = {
        editorState,
        setEditorState,
        editorViewRef,
        activeUndoManagerRef,
    }

    return <EditorContext value={value}>{children}</EditorContext>
}

export default EditorProvider
