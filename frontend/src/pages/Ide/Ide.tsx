import { useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'

import TabsProvider, { useTabs } from '@/contextProviders/TabsProvider'
import IdeEditor from '@/components/IdeEditor/IdeEditor'
import IdeSideBar from '@/components/IdeSideBar/IdeSideBar'
import IdeTabs from '@/components/IdeTabs/IdeTabs'
import IdeStatusBar from '@/components/IdeStatusBar/IdeStatusBar'
import IdeTerminal from '@/components/IdeTerminal/IdeTerminal'
import IdeTopBar from '@/components/IdeTopBar/IdeTopBar'
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
    projectName?: string
}

function IdeLayout({ canWrite, projectName }: IdeLayoutProps) {
    const { terminalOpen } = useTerminal()
    const { tabs } = useTabs()
    const hasTabs = tabs.length > 0

    return (
        <div className={`ide ${hasTabs ? 'has-tabs' : 'no-tabs'}`}>
            <IdeTopBar projectName={projectName} canWrite={canWrite} />
            {hasTabs && <IdeTabs />}
            <IdeSideBar canWrite={canWrite} />
            <div className={`ide-workbench ${terminalOpen ? 'with-terminal' : 'without-terminal'}`}>
                <IdeEditor canWrite={canWrite} />
                <IdeTerminal />
            </div>
            <IdeStatusBar />
        </div>
    )
}

type IdeInnerProps = {
    canWrite: boolean
    projectName?: string
}

function IdeInner({ canWrite, projectName }: IdeInnerProps) {
    return (
        <NestedProviders
            providers={[TabsProvider, FileTreeProvider, EditorProvider, CodeRunnerProvider, TerminalProvider]}
        >
            <IdeLayout canWrite={canWrite} projectName={projectName} />
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
    const [projectName, setProjectName] = useState<string | undefined>(undefined)
    const [checkingAccess, setCheckingAccess] = useState(projectId != null)
    const [accessError, setAccessError] = useState<HttpError | null>(null)

    useAsyncEffect(
        async (isAborted) => {
            if (auth.isInitializing || !auth.isAuthenticated) {
                return
            }

            if (projectId == null) {
                setCanWrite(true)
                setProjectName(undefined)
                setCheckingAccess(false)
                setAccessError(null)
                return
            }

            setCheckingAccess(true)

            try {
                const project = await projectManager.getProject(projectId)
                if (isAborted()) return

                setCanWrite(project.accessType === 'rw')
                setProjectName(project.name)
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
                setProjectName(undefined)
                setCheckingAccess(false)
            }
        },
        undefined,
        [projectId, projectManager, auth.isInitializing, auth.isAuthenticated, navigate, location],
    )

    if (auth.isInitializing) {
        return <FullScreenLoader />
    }

    if (!auth.isAuthenticated) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    if (authToken == null) {
        return <Navigate to='/auth' replace state={{ from: location }} />
    }

    if (checkingAccess) {
        return <FullScreenLoader />
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
            <IdeInner canWrite={canWrite} projectName={projectName} />
        </IdeServiceProvider>
    )
}

export default Ide
