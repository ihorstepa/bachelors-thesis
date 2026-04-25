import '@/App.css'

import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router'

import RedirectIfAuthenticated from '@/components/AuthForm/RedirectIfAuthenticated'
import RequireAuth from '@/components/AuthForm/RequireAuth'
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import AuthProvider from '@/contextProviders/auth/AuthProvider'
import ProjectsProvider from '@/contextProviders/projects/ProjectsProvider'
import { GlobalServiceProvider } from '@/contextProviders/service/ServiceProvider'
import Auth from '@/pages/Auth/Auth'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Ide from '@/pages/Ide/Ide'

type RouteTransitionOverlayProps = {
    pathname: string
}

function RouteTransitionOverlay({ pathname }: RouteTransitionOverlayProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timeout = window.setTimeout(() => setVisible(false), 180)
        return () => window.clearTimeout(timeout)
    }, [pathname])

    return visible ? <FullScreenLoader /> : null
}

function App() {
    const location = useLocation()

    return (
        <GlobalServiceProvider>
            <AuthProvider>
                <Routes>
                    <Route element={<RedirectIfAuthenticated />}>
                        <Route path='/auth' element={<Auth />} />
                    </Route>
                    <Route element={<RequireAuth />}>
                        <Route
                            path='/'
                            element={
                                <ProjectsProvider>
                                    <Dashboard />
                                </ProjectsProvider>
                            }
                        />
                        <Route path='/ide/:projectId?' element={<Ide />} />
                    </Route>
                </Routes>
                <RouteTransitionOverlay pathname={location.pathname} />
            </AuthProvider>
        </GlobalServiceProvider>
    )
}

export default App

