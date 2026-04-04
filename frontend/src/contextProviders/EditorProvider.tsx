import { createContext, useContext, useState } from 'react'
import type { ReactNode, Dispatch, SetStateAction } from 'react'

type EditorState = {
    language: string | null
    line: number
    column: number
    selected: number
}

type EditorContextType = {
    editorState: EditorState
    setEditorState: Dispatch<SetStateAction<EditorState>>
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

    const value: EditorContextType = { editorState, setEditorState }

    return <EditorContext value={value}>{children}</EditorContext>
}

export default EditorProvider
