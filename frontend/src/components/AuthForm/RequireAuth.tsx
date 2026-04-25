import { Navigate, Outlet, useLocation } from 'react-router'

import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import { useAuth } from '@/contextProviders/auth/AuthContext'

function RequireAuth() {
    const auth = useAuth()
    const location = useLocation()

    if (auth.isInitializing) {
        return <FullScreenLoader />
    }

    if (!auth.isAuthenticated) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    return <Outlet />
}

export default RequireAuth
