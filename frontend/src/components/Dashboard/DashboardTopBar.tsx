import { VscBeaker, VscAdd, VscSearch } from 'react-icons/vsc'

type DashboardTopBarProps = {
    search: string
    onSearchChange(value: string): void
    onOpenPlayground(): void
    onCreateProject(): void
}

function DashboardTopBar({ search, onSearchChange, onOpenPlayground, onCreateProject }: DashboardTopBarProps) {
    return (
        <div className='dashboard-topbar'>
            <div className='dashboard-search'>
                <VscSearch size={14} />
                <input
                    placeholder='Search projects...'
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <button type='button' className='dashboard-playground-btn' onClick={onOpenPlayground}>
                <VscBeaker size={13} />
                playground
            </button>

            <button type='button' className='dashboard-new-btn' onClick={onCreateProject}>
                <VscAdd size={13} />
                New project
            </button>
        </div>
    )
}

export default DashboardTopBar
