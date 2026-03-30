import { useParams } from 'react-router'

import TabsProvider from '@/contextProviders/TabsProvider'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import TopBar from '@/components/TopBar/TopBar'
import ServiceProvider from '@/contextProviders/ServiceProvider'
import FileTreeProvider from '@/contextProviders/FileTreeProvider'
import EditorProvider from '@/contextProviders/EditorProvider'
import '@/pages/Ide/Ide.css'

function IdeInner() {
    return (
        <TabsProvider>
            <FileTreeProvider>
                <EditorProvider>
                    <div className='ide'>
                        <TopBar />
                        <Tabs />
                        <SideBar />
                        <Editor />
                        <StatusBar />
                    </div>
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
