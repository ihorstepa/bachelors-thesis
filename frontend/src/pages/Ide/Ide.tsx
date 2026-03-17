import '@/pages/Ide/Ide.css'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import TabBar from '@/components/TabBar/TabBar'
import StatusBar from '@/components/StatusBar/StatusBar'
import TopBar from '@/components/TopBar/TopBar'

function Ide() {
    return (
        <div className='ide'>
            <TopBar />
            <TabBar />
            <SideBar />
            <Editor />
            <StatusBar />
        </div>
    )
}

export default Ide
