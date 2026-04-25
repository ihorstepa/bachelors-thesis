import '@/components/IdeTopBar/IdeTopBar.css'

import { useRef, useState } from 'react'
import { VscClose } from 'react-icons/vsc'
import { useNavigate, useParams } from 'react-router'

import IdeAboutModal from '@/components/AboutIdeModal/IdeAboutModal'
import ContextMenu, { type IdeContextMenuItem } from '@/components/ContextMenu/ContextMenu'
import GhostButton from '@/components/GhostButton/GhostButton'
import { type EditMenuAction, runEditMenuAction } from '@/components/IdeTopBar/editActions'
import { useEditor } from '@/contextProviders/editor/EditorContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { ExportService } from '@/core/exportService'

type MenuConfig = {
    id: string
    label: string
    sections: IdeContextMenuItem[][]
}

type MenuConfigActions = {
    canWrite: boolean
    exportProject: () => void
    exit: () => void
    runEditAction: (action: EditMenuAction) => void
    showAbout: () => void
}

const createMenuConfigs = (a: MenuConfigActions): MenuConfig[] => [
    {
        id: 'file',
        label: 'File',
        sections: [
            [{ id: 'export', label: 'Export Project', onSelect: a.exportProject }],
            [{ id: 'exit', label: 'Exit', onSelect: a.exit }],
        ],
    },
    {
        id: 'edit',
        label: 'Edit',
        sections: [
            [
                {
                    id: 'undo',
                    label: 'Undo',
                    shortcut: 'Ctrl+Z',
                    onSelect: () => a.runEditAction('undo'),
                    disabled: !a.canWrite,
                },
                {
                    id: 'redo',
                    label: 'Redo',
                    shortcut: 'Ctrl+Y',
                    onSelect: () => a.runEditAction('redo'),
                    disabled: !a.canWrite,
                },
            ],
            [
                {
                    id: 'cut',
                    label: 'Cut',
                    shortcut: 'Ctrl+X',
                    onSelect: () => a.runEditAction('cut'),
                    disabled: !a.canWrite,
                },
                { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', onSelect: () => a.runEditAction('copy') },
                {
                    id: 'paste',
                    label: 'Paste',
                    shortcut: 'Ctrl+V',
                    onSelect: () => a.runEditAction('paste'),
                    disabled: !a.canWrite,
                },
            ],
            [{ id: 'find', label: 'Find', shortcut: 'Ctrl+F', onSelect: () => a.runEditAction('find') }],
        ],
    },
    {
        id: 'help',
        label: 'Help',
        sections: [[{ id: 'about', label: 'About', onSelect: a.showAbout }]],
    },
]

type Props = {
    projectName?: string
    canWrite: boolean
}

function IdeTopBar({ projectName, canWrite }: Props) {
    const navigate = useNavigate()
    const { projectId } = useParams()
    const exportService = useService(ExportService)
    const { editorViewRef, activeUndoManagerRef } = useEditor()

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
    const [isAboutOpen, setIsAboutOpen] = useState(false)
    const menuBoundaryRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const runEditAction = (action: EditMenuAction) => {
        void runEditMenuAction(action, { editorViewRef, activeUndoManagerRef })
    }

    const menuConfigs = createMenuConfigs({
        canWrite,
        exportProject: () => {
            const fallbackName = projectId ?? 'playground'
            void exportService.exportProject(projectName ?? fallbackName)
        },
        exit: () => navigate('/'),
        runEditAction,
        showAbout: () => {
            setIsAboutOpen(true)
        },
    })

    const handleMenuOpen = (menuId: string) => {
        setActiveMenuId((currentMenuId) => (currentMenuId === menuId ? null : menuId))
    }

    const handleMenuClose = (menuId: string) => {
        setActiveMenuId((currentMenuId) => (currentMenuId === menuId ? null : currentMenuId))
    }

    const handleMenuHoverOpen = (menuId: string) => {
        if (activeMenuId != null && activeMenuId !== menuId) {
            setActiveMenuId(menuId)
        }
    }

    const isWithinMenuBoundary = (menuId: string, target: Node) => {
        return menuBoundaryRefs.current[menuId]?.contains(target) ?? false
    }

    return (
        <>
            <div className='ide-topbar'>
                <div className='ide-topbar-left'>
                    {menuConfigs.map((menu) => (
                        <div
                            key={menu.id}
                            ref={(element) => {
                                menuBoundaryRefs.current[menu.id] = element
                            }}
                        >
                            <GhostButton
                                className={`ide-context-menu-trigger ${activeMenuId === menu.id ? 'open' : ''}`}
                                onClick={() => handleMenuOpen(menu.id)}
                                onMouseEnter={() => handleMenuHoverOpen(menu.id)}
                            >
                                {menu.label}
                            </GhostButton>

                            <ContextMenu
                                sections={menu.sections}
                                isOpen={activeMenuId === menu.id}
                                onClose={() => handleMenuClose(menu.id)}
                                isWithinBoundary={(target) => isWithinMenuBoundary(menu.id, target)}
                            />
                        </div>
                    ))}
                </div>

                <span className='ide-topbar-title'>{projectId ? (projectName ?? 'project') : 'playground'}</span>

                <div className='ide-topbar-right'>
                    <GhostButton className='ide-topbar-close' onClick={() => navigate('/')} title='Close project'>
                        <VscClose />
                    </GhostButton>
                </div>
            </div>

            {isAboutOpen && <IdeAboutModal onClose={() => setIsAboutOpen(false)} />}
        </>
    )
}

export default IdeTopBar
