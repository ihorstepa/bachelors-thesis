import '@/components/DashboardSidebar/DashboardSidebar.css'

import type { ReactNode } from 'react'
import { VscFile, VscFiles, VscOrganization, VscSettingsGear, VscSignOut, VscStarFull } from 'react-icons/vsc'

import { PROJECT_LIMIT_WARNING_PERCENT } from '@/config'

export type DashboardNav = 'all' | 'mine' | 'shared' | 'favorite'

const navItems: Array<{ id: DashboardNav; label: string; icon: ReactNode }> = [
    { id: 'all', label: 'All projects', icon: <VscFiles /> },
    { id: 'mine', label: 'My projects', icon: <VscFile /> },
    { id: 'shared', label: 'Shared with me', icon: <VscOrganization /> },
    { id: 'favorite', label: 'Favorites', icon: <VscStarFull /> },
]

type Props = {
    userInitial: string
    username: string
    email: string
    personalProjectCount: number
    personalProjectLimit: number
    activeNav: DashboardNav
    onNavChange(nav: DashboardNav): void
    onLogout(): void
}

function DashboardSidebar({
    userInitial,
    username,
    email,
    personalProjectCount,
    personalProjectLimit,
    activeNav,
    onNavChange,
    onLogout,
}: Props) {
    const usagePercent = Math.round((personalProjectCount / personalProjectLimit) * 100)
    const isWarning = usagePercent >= PROJECT_LIMIT_WARNING_PERCENT

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

            <div className='dashboard-sidebar-limit'>
                <span className='dashboard-sidebar-limit-label'>Personal projects</span>
                <div className='dashboard-sidebar-limit-track'>
                    <div
                        className={`dashboard-sidebar-limit-fill ${isWarning ? 'danger' : ''}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                </div>
                <span className='dashboard-sidebar-limit-value'>
                    {personalProjectCount} of {personalProjectLimit}
                </span>
            </div>

            <div className='dashboard-sidebar-bottom'>
                <button type='button' className='dashboard-nav-item' disabled title='Unavailable'>
                    <span className='dashboard-nav-icon'>
                        <VscSettingsGear />
                    </span>
                    Settings
                </button>
                <button type='button' className='dashboard-nav-item' onClick={onLogout}>
                    <span className='dashboard-nav-icon'>
                        <VscSignOut />
                    </span>
                    Logout
                </button>
            </div>
        </aside>
    )
}

export default DashboardSidebar
