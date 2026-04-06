import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'

function RequireAuth() {
    const auth = useAuth()
    const location = useLocation()

    if (!auth.isAuthenticated) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    return <Outlet />
}

export default RequireAuth
