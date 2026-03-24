import { useParams } from 'react-router'

import '@/pages/Ide/Ide.css'
import { TabsContext, useTabsState } from '@/hooks/useTabs'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import TopBar from '@/components/TopBar/TopBar'
import ServiceContainer from '@/core/ServiceContainer'

function IdeInner() {
    const tabsState = useTabsState()

    return (
        <TabsContext value={tabsState}>
            <div className='ide'>
                <TopBar />
                <Tabs />
                <SideBar />
                <Editor />
                <StatusBar />
            </div>
        </TabsContext>
    )
}

function Ide() {
    const { projectId } = useParams()

    return (
        <ServiceContainer projectId={projectId}>
            <IdeInner />
        </ServiceContainer>
    )
}

export default Ide
