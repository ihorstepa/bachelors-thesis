import { useParams } from 'react-router'

import TabsProvider from '@/contextProviders/TabsProvider'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import Terminal from '@/components/Terminal/Terminal'
import TopBar from '@/components/TopBar/TopBar'
import ServiceProvider from '@/contextProviders/ServiceProvider'
import FileTreeProvider from '@/contextProviders/FileTreeProvider'
import EditorProvider from '@/contextProviders/EditorProvider'
import CodeRunnerProvider from '@/contextProviders/CodeRunnerProvider'
import TerminalProvider, { useTerminal } from '@/contextProviders/TerminalProvider'
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
        <TabsProvider>
            <FileTreeProvider>
                <EditorProvider>
                    <CodeRunnerProvider>
                        <TerminalProvider>
                            <IdeLayout />
                        </TerminalProvider>
                    </CodeRunnerProvider>
                </EditorProvider>
            </FileTreeProvider>
        </TabsProvider>
    )
}

function Ide() {
    const { projectId } = useParams()

    return (
        <ServiceProvider projectId={projectId}>
            <IdeInner />
        </ServiceProvider>
    )
}

export default Ide
