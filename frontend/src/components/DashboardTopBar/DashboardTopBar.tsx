import '@/components/DashboardTopBar/DashboardTopBar.css'

import { VscAdd, VscBeaker, VscClose, VscMenu, VscSearch } from 'react-icons/vsc'

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
            <button type='button' className='dashboard-menu-btn' onClick={onToggleSidebar} title='Toggle menu'>
                {isSidebarOpen ? <VscClose /> : <VscMenu />}
            </button>
            <div className='dashboard-search'>
                <VscSearch />
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
                title='Open playground'
            >
                <VscBeaker />
                <span className='dashboard-btn-label'>Playground</span>
            </button>

            <button type='button' className='dashboard-new-btn' onClick={onCreateProject} title='Create new project'>
                <VscAdd />
                <span className='dashboard-btn-label'>New project</span>
            </button>
        </div>
    )
}

export default DashboardTopBar
