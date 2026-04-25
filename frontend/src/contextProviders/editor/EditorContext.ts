import type { EditorView } from '@codemirror/view'
import { createContext, type Dispatch, type RefObject, type SetStateAction,useContext } from 'react'
import type * as Y from 'yjs'

export type EditorState = {
    language: string | null
    line: number
    column: number
    selected: number
}

export type EditorContextType = {
    editorState: EditorState
    setEditorState: Dispatch<SetStateAction<EditorState>>
    editorViewRef: RefObject<EditorView | null>
    activeUndoManagerRef: RefObject<Y.UndoManager | null>
}

export const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor(): EditorContextType {
    const ctx = useContext(EditorContext)
    if (!ctx) throw new Error('useEditor must be used within EditorProvider')
    return ctx
}

