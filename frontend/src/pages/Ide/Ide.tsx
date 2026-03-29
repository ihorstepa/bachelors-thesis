import { useParams } from 'react-router'

import TabsProvider from '@/contextProviders/TabsProvider'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import TopBar from '@/components/TopBar/TopBar'
import ServiceProvider from '@/contextProviders/ServiceProvider'
import '@/pages/Ide/Ide.css'
import FileTreeProvider from '@/contextProviders/FileTreeProvider'

function IdeInner() {
    return (
        <TabsProvider>
            <FileTreeProvider>
                <div className='ide'>
                    <TopBar />
                    <Tabs />
                    <SideBar />
                    <Editor />
                    <StatusBar />
                </div>
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
