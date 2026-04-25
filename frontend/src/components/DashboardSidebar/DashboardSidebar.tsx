import { VscFiles, VscOrganization, VscStarFull, VscSettingsGear, VscSignOut, VscFile } from 'react-icons/vsc'
import type { ReactNode } from 'react'

import '@/components/DashboardSidebar/DashboardSidebar.css'

export type DashboardNav = 'all' | 'mine' | 'shared' | 'favorite'

const navItems: Array<{ id: DashboardNav; label: string; icon: ReactNode }> = [
    { id: 'all', label: 'All Projects', icon: <VscFiles size={15} /> },
    { id: 'mine', label: 'My projects', icon: <VscFile size={15} /> },
    { id: 'shared', label: 'Shared with me', icon: <VscOrganization size={15} /> },
    { id: 'favorite', label: 'Favorites', icon: <VscStarFull size={15} /> },
]

type Props = {
    userInitial: string
    username: string
    email: string
    activeNav: DashboardNav
    onNavChange(nav: DashboardNav): void
    onLogout(): void
}

function DashboardSidebar({ userInitial, username, email, activeNav, onNavChange, onLogout }: Props) {
    return (
        <aside className='dashboard-sidebar'>
            <div className='dashboard-sidebar-account'>
                <div className='dashboard-avatar'>{userInitial}</div>
                <div className='dashboard-account-info'>
                    <span className='dashboard-account-name'>{username}</span>
                    <span className='dashboard-account-email'>{email}</span>
                </div>
            </div>

            {navItems.map((item) => (
                <button
                    type='button'
                    key={item.id}
                    className={`dashboard-nav-item ${activeNav === item.id ? 'active' : ''}`}
                    onClick={() => onNavChange(item.id)}
                >
                    <span className='dashboard-nav-icon'>{item.icon}</span>
                    {item.label}
                </button>
            ))}

            <div className='dashboard-nav-divider' />

            <div className='dashboard-sidebar-bottom'>
                <button type='button' className='dashboard-nav-item' disabled title='Unavailable'>
                    <span className='dashboard-nav-icon'>
                        <VscSettingsGear size={15} />
                    </span>
                    Settings
                </button>
                <button type='button' className='dashboard-nav-item' onClick={onLogout}>
                    <span className='dashboard-nav-icon'>
                        <VscSignOut size={15} />
                    </span>
                    Logout
                </button>
            </div>
        </aside>
    )
}

export default DashboardSidebar
