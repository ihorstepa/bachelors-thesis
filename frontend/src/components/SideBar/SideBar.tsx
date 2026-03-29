import { useState } from 'react'
import { VscFiles, VscSearch, VscSourceControl, VscRunAll, VscSettingsGear, VscAccount } from 'react-icons/vsc'

import FileTree from '@/components/FileTree/FileTree'
import '@/components/SideBar/SideBar.css'

type View = 'explorer' | 'search' | 'run' | 'sourceControl' | 'account' | 'settings'

type Action = {
    id: View
    icon: React.ComponentType
    title: string
    component: React.ComponentType | null
}

const mainActions: Action[] = [
    { id: 'explorer', icon: VscFiles, title: 'Explorer', component: FileTree },
    { id: 'search', icon: VscSearch, title: 'Search', component: null },
    { id: 'run', icon: VscRunAll, title: 'Run', component: null },
    { id: 'sourceControl', icon: VscSourceControl, title: 'Source Control', component: null },
]

const extraActions: Action[] = [
    { id: 'account', icon: VscAccount, title: 'Account', component: null },
    { id: 'settings', icon: VscSettingsGear, title: 'Settings', component: null },
]

function SideBar() {
    const [activeView, setActiveView] = useState<View | null>('explorer')

    const handleViewClick = (view: View) => {
        setActiveView((prev) => (prev === view ? null : view))
    }

    const renderView = () => {
        const activeAction = mainActions.find((a) => a.id === activeView)
        if (!activeAction || !activeAction.component) {
            return activeView ? (
                <div className='sidebar-view'>
                    <div className='sidebar-view-header'>{activeAction?.title}</div>
                    <div className='sidebar-view-empty'>No content available</div>
                </div>
            ) : null
        }

        const Component = activeAction.component
        return (
            <div className='sidebar-view'>
                <div className='sidebar-view-header'>{activeAction.title}</div>
                <Component />
            </div>
        )
    }

    return (
        <div className='ide-sidebar'>
            <div className='sidebar-actions'>
                <div className='actions-main'>
                    {mainActions.map(({ id, icon: Icon, title }) => (
                        <button
                            key={id}
                            className={`sidebar-action ${activeView === id ? 'active' : ''}`}
                            onClick={() => handleViewClick(id)}
                            title={title}
                        >
                            <Icon />
                        </button>
                    ))}
                </div>
                <div className='actions-extra'>
                    {extraActions.map(({ id, icon: Icon, title }) => (
                        <button key={id} className='sidebar-action' title={title}>
                            <Icon />
                        </button>
                    ))}
                </div>
            </div>
            <div className={`sidebar-content ${!activeView ? 'collapsed' : ''}`}>{renderView()}</div>
        </div>
    )
}

export default SideBar
