import '@/components/StatusBar/StatusBar.css'
import { useEditor } from '@/contextProviders/EditorProvider'

function StatusBar() {
    const { editorState } = useEditor()

    return (
        <div className='ide-statusbar'>
            <span>
                Ln {editorState.line}, Col {editorState.column}{' '}
                {editorState.selected > 0 && ` (${editorState.selected} selected)`}
            </span>
            <span>{editorState.language || 'Plain Text'}</span>
        </div>
    )
}

export default StatusBar
