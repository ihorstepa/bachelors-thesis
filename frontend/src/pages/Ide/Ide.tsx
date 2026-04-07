import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'

import TabsProvider from '@/contextProviders/TabsProvider'
import Editor from '@/components/Editor/Editor'
import SideBar from '@/components/SideBar/SideBar'
import Tabs from '@/components/Tabs/Tabs'
import StatusBar from '@/components/StatusBar/StatusBar'
import Terminal from '@/components/Terminal/Terminal'
import TopBar from '@/components/TopBar/TopBar'
import { IdeServiceProvider } from '@/contextProviders/ServiceProvider'
import FileTreeProvider from '@/contextProviders/FileTreeProvider'
import EditorProvider from '@/contextProviders/EditorProvider'
import CodeRunnerProvider from '@/contextProviders/CodeRunnerProvider'
import TerminalProvider, { useTerminal } from '@/contextProviders/TerminalProvider'
import { useAuth } from '@/contextProviders/AuthProvider'
import { useService } from '@/contextProviders/ServiceProvider'
import { ProjectManager } from '@/core/projectManager'
import NestedProviders from '@/contextProviders/NestedProviders'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import { HttpError, normalizeHttpError } from '@/errors/http'
import '@/pages/Ide/Ide.css'

type IdeLayoutProps = {
    canWrite: boolean
}

function IdeLayout({ canWrite }: IdeLayoutProps) {
    const { terminalOpen } = useTerminal()

    return (
        <div className='ide'>
            <TopBar />
            <Tabs />
            <SideBar canWrite={canWrite} />
            <div className={`ide-workbench ${terminalOpen ? 'with-terminal' : 'without-terminal'}`}>
                <Editor canWrite={canWrite} />
                <Terminal />
            </div>
            <StatusBar />
        </div>
    )
}

type IdeInnerProps = {
    canWrite: boolean
}

function IdeInner({ canWrite }: IdeInnerProps) {
    return (
        <NestedProviders
            providers={[TabsProvider, FileTreeProvider, EditorProvider, CodeRunnerProvider, TerminalProvider]}
        >
            <IdeLayout canWrite={canWrite} />
        </NestedProviders>
    )
}

function Ide() {
    const { projectId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()
    const auth = useAuth()
    const authToken = auth.token
    const projectManager = useService(ProjectManager)
    const [canWrite, setCanWrite] = useState(projectId == null)
    const [checkingAccess, setCheckingAccess] = useState(projectId != null)
    const [accessError, setAccessError] = useState<HttpError | null>(null)

    useAsyncEffect(
        async (isAborted) => {
            if (auth.isInitializing || !auth.isAuthenticated) {
                return
            }

            if (projectId == null) {
                setCanWrite(true)
                setCheckingAccess(false)
                setAccessError(null)
                return
            }

            setCheckingAccess(true)

            try {
                const project = await projectManager.getProject(projectId)
                if (isAborted()) return

                setCanWrite(project.accessType === 'rw')
                setAccessError(null)
                setCheckingAccess(false)
            } catch (error) {
                if (isAborted()) return

                const httpError = normalizeHttpError(error)
                if (httpError.type === 'UNAUTHORIZED') {
                    navigate('/auth', { replace: true, state: { from: location } })
                    return
                }

                setAccessError(httpError)
                setCheckingAccess(false)
            }
        },
        undefined,
        [projectId, projectManager, auth.isInitializing, auth.isAuthenticated, navigate, location],
    )

    if (auth.isInitializing) {
        return <FullScreenLoader label='Loading session...' />
    }

    if (!auth.isAuthenticated) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    if (authToken == null) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    if (checkingAccess) {
        return <FullScreenLoader label='Loading project...' />
    }

    if (accessError != null) {
        return (
            <div className='ide-route-state'>
                <h2 className='ide-route-title'>Unable to open project</h2>
                <p className='ide-route-message'>
                    {accessError.status} {accessError.type}
                </p>
                {accessError.message.length > 0 && <p className='ide-route-message'>{accessError.message}</p>}
                <button className='ide-route-button' type='button' onClick={() => navigate('/', { replace: true })}>
                    Back to dashboard
                </button>
            </div>
        )
    }

    return (
        <IdeServiceProvider projectId={projectId} authToken={authToken} username={auth.user?.username ?? undefined}>
            <IdeInner canWrite={canWrite} />
        </IdeServiceProvider>
    )
}

export default Ide
