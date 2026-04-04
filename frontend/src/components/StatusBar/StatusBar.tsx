import { useEditor } from '@/contextProviders/EditorProvider'
import { useCodeRunner } from '@/contextProviders/CodeRunnerProvider'
import type { CodeRunnerStatus } from '@/core/codeRunner'
import '@/components/StatusBar/StatusBar.css'
import { VscTerminal } from 'react-icons/vsc'
import { useTerminal } from '@/contextProviders/TerminalProvider'

function getActiveStage(status: CodeRunnerStatus): string | null {
    if (status === 'syncing') return 'Syncing...'
    if (status === 'compiling') return 'Compiling...'
    if (status === 'linking') return 'Linking...'
    if (status === 'running') return 'Running...'
    return null
}

function StatusBar() {
    const { editorState } = useEditor()
    const { status } = useCodeRunner()
    const { terminalOpen, setTerminalOpen } = useTerminal()
    const activeStage = getActiveStage(status)

    return (
        <div className='ide-statusbar'>
            {activeStage && <button>{activeStage}</button>}
            <button>
                Ln {editorState.line}, Col {editorState.column}{' '}
                {editorState.selected > 0 && ` (${editorState.selected} selected)`}
            </button>
            <button>{editorState.language || 'Plain Text'}</button>
            <button onClick={() => setTerminalOpen(!terminalOpen)}>
                <VscTerminal />
            </button>
        </div>
    )
}

export default StatusBar
