import { useState } from 'react'
import { VscFiles, VscSearch, VscSourceControl, VscRunAll, VscSettingsGear, VscAccount } from 'react-icons/vsc'

import FileTree from '@/components/FileTree/FileTree'
import RunPanel from '@/components/RunPanel/RunPanel'
import '@/components/IdeSideBar/IdeSideBar.css'

type View = 'explorer' | 'search' | 'run' | 'sourceControl' | 'account' | 'settings'

type Action = {
    id: View
    icon: React.ComponentType
    title: string
    hasView: boolean
}

const mainActions: Action[] = [
    { id: 'explorer', icon: VscFiles, title: 'Explorer', hasView: true },
    { id: 'run', icon: VscRunAll, title: 'Run', hasView: true },
    { id: 'search', icon: VscSearch, title: 'Search', hasView: false },
    { id: 'sourceControl', icon: VscSourceControl, title: 'Source Control', hasView: false },
]

const extraActions: Action[] = [
    { id: 'account', icon: VscAccount, title: 'Account', hasView: false },
    { id: 'settings', icon: VscSettingsGear, title: 'Settings', hasView: false },
]

type Props = {
    canWrite: boolean
}

function IdeSideBar({ canWrite }: Props) {
    const [activeView, setActiveView] = useState<View | null>('explorer')

    const handleViewClick = (view: View) => {
        setActiveView((prev) => (prev === view ? null : view))
    }

    const renderView = () => {
        const activeAction = mainActions.find((a) => a.id === activeView)
        if (!activeAction || !activeAction.hasView) {
            return activeView ? (
                <div className='sidebar-view'>
                    <div className='sidebar-view-header'>{activeAction?.title}</div>
                    <div className='sidebar-view-empty'>No content available</div>
                </div>
            ) : null
        }

        const content =
            activeAction.id === 'explorer' ? (
                <FileTree canWrite={canWrite} />
            ) : activeAction.id === 'run' ? (
                <RunPanel canWrite={canWrite} />
            ) : null

        return (
            <div className='sidebar-view'>
                <div className='sidebar-view-header'>{activeAction.title}</div>
                {content}
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

export default IdeSideBar
