import { useParams } from 'react-router'

import TabsProvider from '@/contextProviders/TabsProvider'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import Terminal from '@/components/Terminal/Terminal'
import TopBar from '@/components/TopBar/TopBar'
import { IdeServiceProvider } from '@/contextProviders/ServiceProvider'
import FileTreeProvider from '@/contextProviders/FileTreeProvider'
import EditorProvider from '@/contextProviders/EditorProvider'
import CodeRunnerProvider from '@/contextProviders/CodeRunnerProvider'
import TerminalProvider, { useTerminal } from '@/contextProviders/TerminalProvider'
import { useAuth } from '@/contextProviders/AuthProvider'
import NestedProviders from '@/contextProviders/NestedProviders'
import '@/pages/Ide/Ide.css'

function IdeLayout() {
    const { terminalOpen } = useTerminal()

    return (
        <div className='ide'>
            <TopBar />
            <Tabs />
            <SideBar />
            <div className={`ide-workbench ${terminalOpen ? 'with-terminal' : 'without-terminal'}`}>
                <Editor />
                <Terminal />
            </div>
            <StatusBar />
        </div>
    )
}

function IdeInner() {
    return (
        <NestedProviders
            providers={[TabsProvider, FileTreeProvider, EditorProvider, CodeRunnerProvider, TerminalProvider]}
        >
            <IdeLayout />
        </NestedProviders>
    )
}

function Ide() {
    const { projectId } = useParams()
    const auth = useAuth()

    if (auth.token == null) {
        return <div>Authentication required</div>
    }

    return (
        <IdeServiceProvider projectId={projectId} authToken={auth.token}>
            <IdeInner />
        </IdeServiceProvider>
    )
}

export default Ide
