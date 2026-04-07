import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/contextProviders/AuthProvider'
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'

function RequireAuth() {
    const auth = useAuth()
    const location = useLocation()

    if (auth.isInitializing) {
        return <FullScreenLoader label='Loading session...' />
    }

    if (!auth.isAuthenticated) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    return <Outlet />
}

export default RequireAuth
