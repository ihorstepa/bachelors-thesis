import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'

function RedirectIfAuthenticated() {
    const auth = useAuth()
    const location = useLocation()

    if (auth.isInitializing) {
        return <FullScreenLoader label='Loading session...' />
    }

    if (auth.isAuthenticated) {
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        return <Navigate to={from ?? '/'} replace />
    }

    return <Outlet />
}

export default RedirectIfAuthenticated
