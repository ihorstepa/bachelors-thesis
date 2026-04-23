import { createContext, useContext, useRef, useState } from 'react'
import type { ReactNode, Dispatch, SetStateAction, RefObject } from 'react'
import type { EditorView } from '@codemirror/view'
import type * as Y from 'yjs'

type EditorState = {
    language: string | null
    line: number
    column: number
    selected: number
}

type EditorContextType = {
    editorState: EditorState
    setEditorState: Dispatch<SetStateAction<EditorState>>
    editorViewRef: RefObject<EditorView | null>
    activeUndoManagerRef: RefObject<Y.UndoManager | null>
}

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
    const ctx = useContext(EditorContext)
    if (!ctx) throw new Error('useEditor must be used within EditorProvider')
    return ctx
}

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
