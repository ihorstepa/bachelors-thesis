// Temporary

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import {
    VscFiles,
    VscOrganization,
    VscStarFull,
    VscSettingsGear,
    VscSignOut,
    VscBeaker,
    VscAdd,
    VscSearch,
} from 'react-icons/vsc'
import { useAuth } from '@/contextProviders/AuthProvider'

import '@/pages/Dashboard/Dashboard.css'

type Collaborator = { initials: string; color: string }

type Project = {
    id: string
    name: string
    updatedAt: string
    collaborators: Collaborator[]
    starred: boolean
    owned: boolean
}

const MOCK_PROJECTS: Project[] = [
    {
        id: '1',
        name: 'my-app',
        updatedAt: '2 hours ago',
        collaborators: [
            { initials: 'Y', color: '#61afef' },
            { initials: 'A', color: '#c678dd' },
        ],
        starred: true,
        owned: true,
    },
    {
        id: '2',
        name: 'raytracer',
        updatedAt: 'yesterday',
        collaborators: [{ initials: 'Y', color: '#61afef' }],
        starred: false,
        owned: true,
    },
    {
        id: '3',
        name: 'game-engine',
        updatedAt: '3 days ago',
        collaborators: [
            { initials: 'Y', color: '#61afef' },
            { initials: 'B', color: '#98c379' },
            { initials: 'C', color: '#e5c07b' },
        ],
        starred: true,
        owned: false,
    },
    {
        id: '4',
        name: 'allocator',
        updatedAt: 'last week',
        collaborators: [{ initials: 'Y', color: '#61afef' }],
        starred: false,
        owned: true,
    },
    {
        id: '5',
        name: 'shared-utils',
        updatedAt: '2 weeks ago',
        collaborators: [
            { initials: 'A', color: '#c678dd' },
            { initials: 'Y', color: '#61afef' },
        ],
        starred: false,
        owned: false,
    },
]

const NAV = [
    { id: 'all', label: 'All Projects', icon: <VscFiles size={15} /> },
    { id: 'shared', label: 'Shared with me', icon: <VscOrganization size={15} /> },
    { id: 'starred', label: 'Starred', icon: <VscStarFull size={15} /> },
]

function Dashboard() {
    const navigate = useNavigate()
    const auth = useAuth()
    const [activeNav, setActiveNav] = useState('all')
    const [search, setSearch] = useState('')

    const userInitial = auth.user?.username?.[0]?.toUpperCase() ?? '?'

    const filtered = useMemo(() => {
        let list = MOCK_PROJECTS
        if (activeNav === 'starred') list = list.filter((p) => p.starred)
        if (activeNav === 'shared') list = list.filter((p) => !p.owned)
        if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
        return list
    }, [activeNav, search])

    return (
        <div className='dashboard'>
            <aside className='dashboard-sidebar'>
                <div className='dashboard-sidebar-account'>
                    <div className='dashboard-avatar'>{userInitial}</div>
                    <div className='dashboard-account-info'>
                        <span className='dashboard-account-name'>{auth.user?.username ?? 'Anonymous'}</span>
                        <span className='dashboard-account-email'>{auth.user?.email ?? ''}</span>
                    </div>
                </div>

                {NAV.map((item) => (
                    <button
                        key={item.id}
                        className={`dashboard-nav-item ${activeNav === item.id ? 'active' : ''}`}
                        onClick={() => setActiveNav(item.id)}
                    >
                        <span className='dashboard-nav-icon'>{item.icon}</span>
                        {item.label}
                    </button>
                ))}

                <div className='dashboard-nav-divider' />

                <div className='dashboard-sidebar-bottom'>
                    <button className='dashboard-nav-item'>
                        <span className='dashboard-nav-icon'>
                            <VscSettingsGear size={15} />
                        </span>
                        Settings
                    </button>
                    <button
                        className='dashboard-nav-item'
                        onClick={() => {
                            auth.logout()
                            navigate('/auth')
                        }}
                    >
                        <span className='dashboard-nav-icon'>
                            <VscSignOut size={15} />
                        </span>
                        Sign out
                    </button>
                </div>
            </aside>

            <div className='dashboard-main'>
                <div className='dashboard-topbar'>
                    <div className='dashboard-search'>
                        <VscSearch size={14} />
                        <input
                            placeholder='Search projects...'
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className='dashboard-search-shortcut'>⌘K</span>
                    </div>

                    <button className='dashboard-playground-btn' onClick={() => navigate('/ide')}>
                        <VscBeaker size={13} />
                        playground
                    </button>

                    <button className='dashboard-new-btn'>
                        <VscAdd size={13} />
                        New project
                    </button>
                </div>

                <div className='dashboard-content'>
                    {filtered.length === 0 ? (
                        <div className='dashboard-empty' />
                    ) : (
                        <table className='dashboard-table'>
                            <colgroup>
                                <col className='dashboard-table-col-name' />
                                <col className='dashboard-table-col-updated' />
                                <col className='dashboard-table-col-collabs' />
                                <col className='dashboard-table-col-open' />
                            </colgroup>
                            <thead className='dashboard-table-head'>
                                <tr>
                                    <th>Name</th>
                                    <th>Last edited</th>
                                    <th>Collaborators</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((project) => (
                                    <tr
                                        key={project.id}
                                        className='dashboard-table-row'
                                        onClick={() => navigate(`/ide/${project.id}`)}
                                    >
                                        <td>
                                            <div className='project-name-cell'>
                                                <div className='project-file-icon'>C++</div>
                                                <span className='project-name'>{project.name}</span>
                                                {project.starred && <span className='project-starred'>★</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className='project-updated'>{project.updatedAt}</span>
                                        </td>
                                        <td>
                                            <div className='project-collaborators'>
                                                {project.collaborators.map((c, i) => (
                                                    <div
                                                        key={i}
                                                        className='project-collab-dot'
                                                        style={{ backgroundColor: c.color }}
                                                        title={c.initials}
                                                    >
                                                        {c.initials}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            <span className='project-open-btn'>open →</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
