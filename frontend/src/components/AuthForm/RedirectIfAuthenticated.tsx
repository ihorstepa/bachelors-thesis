import { Navigate, Outlet, useLocation } from 'react-router'

import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import { useAuth } from '@/contextProviders/auth/AuthContext'

function RedirectIfAuthenticated() {
    const auth = useAuth()
    const location = useLocation()

    if (auth.isInitializing) {
        return <FullScreenLoader />
    }

    if (auth.isAuthenticated) {
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        return <Navigate to={from ?? '/'} replace />
    }

    return <Outlet />
}

export default RedirectIfAuthenticated


