import { Routes, Route, useLocation } from 'react-router'
import { useEffect, useState } from 'react'

import { GlobalServiceProvider } from '@/contextProviders/ServiceProvider'
import AuthProvider from '@/contextProviders/AuthProvider'
import ProjectsProvider from '@/contextProviders/ProjectsProvider'
import RequireAuth from '@/components/AuthForm/RequireAuth'
import RedirectIfAuthenticated from '@/components/AuthForm/RedirectIfAuthenticated'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Ide from '@/pages/Ide/Ide'
import Auth from '@/pages/Auth/Auth'
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import '@/App.css'

function RouteTransitionOverlay() {
    const location = useLocation()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        setVisible(true)
        const timeout = window.setTimeout(() => setVisible(false), 180)
        return () => window.clearTimeout(timeout)
    }, [location.pathname])

    if (!visible) {
        return null
    }

    return <FullScreenLoader />
}

function App() {
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
                <RouteTransitionOverlay />
            </AuthProvider>
        </GlobalServiceProvider>
    )
}

export default App
