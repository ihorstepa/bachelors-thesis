import '@/components/IdeStatusBar/IdeStatusBar.css'

import { useSyncExternalStore } from 'react'
import { VscTerminal } from 'react-icons/vsc'

import { useCodeRunner } from '@/contextProviders/codeRunner/CodeRunnerContext'
import { useEditor } from '@/contextProviders/editor/EditorContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { useTerminal } from '@/contextProviders/terminal/TerminalContext'
import type { CodeRunnerStatus } from '@/core/codeRunner'
import { LanguageServerManager } from '@/core/languageServerManager'

function getActiveStage(status: CodeRunnerStatus): string | null {
    if (status === 'syncing') return 'Syncing...'
    if (status === 'compiling') return 'Compiling...'
    if (status === 'linking') return 'Linking...'
    if (status === 'running') return 'Running...'
    return null
}

function IdeStatusBar() {
    const { editorState } = useEditor()
    const { status } = useCodeRunner()
    const { terminalOpen, setTerminalOpen } = useTerminal()
    const languageServerManager = useService(LanguageServerManager)
    const activeStage = getActiveStage(status)
    const languageServerReady = useSyncExternalStore(
        (cb) => languageServerManager.on('ready', cb),
        () => languageServerManager.isReady(),
    )

    return (
        <div className='ide-statusbar'>
            {!languageServerReady && <button>Loading language server...</button>}
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

export default IdeStatusBar
