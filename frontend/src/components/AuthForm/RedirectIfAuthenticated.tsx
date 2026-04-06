import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'

function RedirectIfAuthenticated() {
    const auth = useAuth()
    const location = useLocation()

    if (auth.isAuthenticated) {
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
        return <Navigate to={from ?? '/'} replace />
    }

    return <Outlet />
}

export default RedirectIfAuthenticated
