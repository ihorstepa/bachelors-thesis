import { VscBeaker, VscAdd, VscSearch, VscMenu, VscClose } from 'react-icons/vsc'

import '@/components/DashboardTopBar/DashboardTopBar.css'

type Props = {
    search: string
    isSidebarOpen: boolean
    onSearchChange(value: string): void
    onToggleSidebar(): void
    onOpenPlayground(): void
    onCreateProject(): void
}

function DashboardTopBar({
    search,
    isSidebarOpen,
    onSearchChange,
    onToggleSidebar,
    onOpenPlayground,
    onCreateProject,
}: Props) {
    return (
        <div className='dashboard-topbar'>
            <button type='button' className='dashboard-menu-btn' onClick={onToggleSidebar} aria-label='Toggle menu'>
                {isSidebarOpen ? <VscClose size={16} /> : <VscMenu size={16} />}
            </button>
            <div className='dashboard-search'>
                <VscSearch size={14} />
                <input
                    placeholder='Search projects...'
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <button
                type='button'
                className='dashboard-playground-btn'
                onClick={onOpenPlayground}
                aria-label='Open playground'
            >
                <VscBeaker size={13} />
                <span className='dashboard-btn-label'>playground</span>
            </button>

            <button
                type='button'
                className='dashboard-new-btn'
                onClick={onCreateProject}
                aria-label='Create new project'
            >
                <VscAdd size={13} />
                <span className='dashboard-btn-label'>New project</span>
            </button>
        </div>
    )
}

export default DashboardTopBar
