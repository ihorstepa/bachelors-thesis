import { Routes, Route } from 'react-router'

import { GlobalServiceProvider } from '@/contextProviders/ServiceProvider'
import AuthProvider from '@/contextProviders/AuthProvider'
import RequireAuth from '@/components/AuthForm/RequireAuth'
import RedirectIfAuthenticated from '@/components/AuthForm/RedirectIfAuthenticated'
import Dashboard from '@/pages/Dashboard/Dashboard'
import Ide from '@/pages/Ide/Ide'
import Auth from '@/pages/Auth/Auth'
import '@/App.css'

function App() {
    return (
        <GlobalServiceProvider>
            <AuthProvider>
                <Routes>
                    <Route element={<RedirectIfAuthenticated />}>
                        <Route path='/auth' element={<Auth />} />
                    </Route>
                    <Route element={<RequireAuth />}>
                        <Route path='/' element={<Dashboard />} />
                        <Route path='/ide/:projectId?' element={<Ide />} />
                    </Route>
                </Routes>
            </AuthProvider>
        </GlobalServiceProvider>
    )
}

export default App
