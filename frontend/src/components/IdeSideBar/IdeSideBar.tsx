import { useState } from 'react'
import { useNavigate } from 'react-router'
import { VscFiles, VscSearch, VscSourceControl, VscRunAll, VscSettingsGear, VscAccount } from 'react-icons/vsc'
import type { ComponentType, ReactNode } from 'react'

import FileTree from '@/components/FileTree/FileTree'
import IdeContextMenu from '@/components/IdeContextMenu/IdeContextMenu'
import RunPanel from '@/components/RunPanel/RunPanel'
import { useAuth } from '@/contextProviders/AuthProvider'
import type { IdeContextMenuItem } from '@/components/IdeContextMenu/IdeContextMenu'

import '@/components/IdeSideBar/IdeSideBar.css'

type View = 'explorer' | 'search' | 'run' | 'sourceControl'
type Menu = 'account' | 'settings'

type Action = {
    id: View
    icon: ComponentType
    title: string
    view?: (canWrite: boolean) => ReactNode
}

type ExtraAction = {
    id: Menu
    icon: ComponentType
    title: string
    menuSections: IdeContextMenuItem[][]
}

type ExtraActionConfigActions = {
    logout?: () => void
    openTemporarySettings?: () => void
}

const mainActions: Action[] = [
    {
        id: 'explorer',
        icon: VscFiles,
        title: 'Explorer',
        view: (canWrite) => <FileTree canWrite={canWrite} />,
    },
    {
        id: 'run',
        icon: VscRunAll,
        title: 'Run',
        view: (canWrite) => <RunPanel canWrite={canWrite} />,
    },
    { id: 'search', icon: VscSearch, title: 'Search (Unavailable)' },
    { id: 'sourceControl', icon: VscSourceControl, title: 'Source Control (Unavailable)' },
]

const createExtraActions = (a: ExtraActionConfigActions): ExtraAction[] => [
    {
        id: 'account',
        icon: VscAccount,
        title: 'Account',
        menuSections: [[{ id: 'logout', label: 'Logout', onSelect: a.logout }]],
    },
    {
        id: 'settings',
        icon: VscSettingsGear,
        title: 'Settings (Unavailable)',
        menuSections: [],
    },
]

type Props = {
    canWrite: boolean
}

function IdeSideBar({ canWrite }: Props) {
    const navigate = useNavigate()
    const auth = useAuth()
    const [activeView, setActiveView] = useState<View | null>('explorer')
    const [activeExtraMenuId, setActiveExtraMenuId] = useState<Menu | null>(null)

    const handleExtraActionClick = (actionId: Menu) => {
        setActiveExtraMenuId((currentId) => (currentId === actionId ? null : actionId))
    }

    const extraActions = createExtraActions({
        logout: () => {
            auth.logout()
            navigate('/auth')
        },
    })

    const renderView = () => {
        const activeAction = mainActions.find((a) => a.id === activeView)
        if (!activeAction || !activeAction.view) {
            return null
        }
        return (
            <div className='sidebar-view'>
                <div className='sidebar-view-header'>{activeAction.title}</div>
                {activeAction.view(canWrite)}
            </div>
        )
    }

    return (
        <div className='ide-sidebar'>
            <div className='sidebar-actions'>
                <div className='actions-main'>
                    {mainActions.map(({ id, icon: Icon, title, view }) => (
                        <button
                            key={id}
                            className={`sidebar-action ${activeView === id ? 'active' : ''}`}
                            onClick={() => setActiveView((prev) => (prev === id ? null : id))}
                            title={title}
                            disabled={!view}
                        >
                            <Icon />
                        </button>
                    ))}
                </div>
                <div className={`actions-extra ${activeExtraMenuId ? 'menu-active' : ''}`}>
                    {extraActions.map(({ id, icon: Icon, title, menuSections }) => (
                        <div key={id} className='sidebar-extra-action'>
                            <button
                                className='sidebar-action'
                                onClick={() => handleExtraActionClick(id)}
                                title={title}
                                disabled={!menuSections?.length}
                            >
                                <Icon />
                            </button>
                            {menuSections && (
                                <IdeContextMenu
                                    sections={menuSections}
                                    isOpen={activeExtraMenuId === id}
                                    onClose={() => setActiveExtraMenuId(null)}
                                    lockScroll
                                    className='sidebar-context-menu-panel'
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className={`sidebar-content ${!activeView ? 'collapsed' : ''}`}>{renderView()}</div>
        </div>
    )
}

export default IdeSideBar
