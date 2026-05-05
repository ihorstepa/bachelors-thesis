import React, { useContext, useMemo, useRef, useState } from 'react'

import FullScreenLoader from '@/components/FullScreenLoader/FullScreenLoader'
import { ServiceContext, type ServiceRegistry } from '@/contextProviders/service/ServiceContext'
import { ApiClient } from '@/core/apiClient'
import { AuthManager } from '@/core/authManager'
import { CodeRunner } from '@/core/codeRunner'
import { ConnectionFactory } from '@/core/connectionFactory'
import { ExportService } from '@/core/exportService'
import { FileSyncManager } from '@/core/fileSyncManager'
import { FileSystemManager } from '@/core/fileSystemManager'
import { FileTreeManager } from '@/core/fileTreeManager'
import type { BaseService } from '@/core/general'
import { LanguageServerManager } from '@/core/languageServerManager'
import { PresenceService } from '@/core/presenceService'
import { ProjectCache } from '@/core/projectCache'
import { ProjectIndexService } from '@/core/projectIndexService'
import { ProjectManager } from '@/core/projectManager'
import { TabManager } from '@/core/tabManager'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import AuthedApiClient from '@/services/apiClient/authedApiClient'
import UserAuthManager from '@/services/authManager/userAuthManager'
import CppCodeRunner from '@/services/codeRunner/cppCodeRunner'
import LocalConnectionFactory from '@/services/connectionFactory/localConnectionFactory'
import WSConnectionFactory from '@/services/connectionFactory/wsConnectionFactory'
import BrowserProjectExportService from '@/services/exportService/browserProjectExportService'
import MultipleFileSyncManager from '@/services/fileSyncManager/multipleFileSyncManager'
import SharedFileSystemManager from '@/services/fileSystemManager/sharedFileSystemManager'
import LocalFileTreeManager from '@/services/fileTreeManager/localFileTreeManager'
import CppLanguageServerManager from '@/services/languageServer/cppLanguageServerManager'
import FileSystemPresenceService from '@/services/presenceService/fileSystemPresenceService'
import LocalProjectCache from '@/services/projectCache/localProjectCache'
import LocalProjectIndexService from '@/services/projectIndexService/localProjectIndexService'
import UserProjectManager from '@/services/projectManager/userProjectManager'
import PersistentTabManager from '@/services/tabManager/persistentTabManager'
import type { AbstractClass } from '@/utils/types'

function initGlobalServices(): ServiceRegistry {
    const services: ServiceRegistry = new Map()

    const authManager = new UserAuthManager()
    services.set(AuthManager, authManager)

    const apiClient = new AuthedApiClient(authManager)
    services.set(ApiClient, apiClient)

    const projectCache = new LocalProjectCache()
    services.set(ProjectCache, projectCache)

    const projectManager = new UserProjectManager(apiClient, projectCache)
    services.set(ProjectManager, projectManager)

    return services
}

async function initIdeServices(
    projectId: string | undefined,
    authToken: string,
    projectCache: ProjectCache,
    username?: string,
): Promise<ServiceRegistry> {
    const services: ServiceRegistry = new Map()

    const connectionFactory =
        projectId == null
            ? new LocalConnectionFactory(projectCache.forScope('playground'))
            : new WSConnectionFactory(projectId, authToken, projectCache.forScope(projectId))
    services.set(ConnectionFactory, connectionFactory)

    const fileSystemManager = new SharedFileSystemManager(connectionFactory)
    services.set(FileSystemManager, fileSystemManager)
    await fileSystemManager.init()

    const presenceService = new FileSystemPresenceService(fileSystemManager, username)
    services.set(PresenceService, presenceService)

    const fileSyncManager = new MultipleFileSyncManager(connectionFactory, fileSystemManager)
    services.set(FileSyncManager, fileSyncManager)

    const tabManager = new PersistentTabManager(fileSystemManager)
    services.set(TabManager, tabManager)

    const fileTreeManager = new LocalFileTreeManager(fileSystemManager)
    services.set(FileTreeManager, fileTreeManager)

    const projectFileIndex = new LocalProjectIndexService(fileSystemManager)
    services.set(ProjectIndexService, projectFileIndex)

    const exportService = new BrowserProjectExportService(projectFileIndex, fileSyncManager)
    services.set(ExportService, exportService)

    const compilationService = new CppCodeRunner(fileSystemManager, fileSyncManager, projectFileIndex, tabManager)
    services.set(CodeRunner, compilationService)

    const languageServerManager = new CppLanguageServerManager(
        fileSyncManager,
        projectFileIndex,
        presenceService,
        tabManager,
    )
    services.set(LanguageServerManager, languageServerManager)

    return services
}

function destroyServices(registry: ServiceRegistry): void {
    registry.forEach((service) => {
        service.destroy?.()
    })
}

type GlobalServiceProviderProps = {
    children: React.ReactNode
}

export function GlobalServiceProvider({ children }: GlobalServiceProviderProps): React.ReactNode {
    const registry = useMemo(() => initGlobalServices(), [])

    return <ServiceContext value={registry}>{children}</ServiceContext>
}

type IdeServiceProviderProps = {
    projectId?: string
    authToken: string
    username?: string
    children: React.ReactNode
}

export function IdeServiceProvider({
    projectId,
    authToken,
    username,
    children,
}: IdeServiceProviderProps): React.ReactNode {
    const parentRegistry = useContext(ServiceContext)
    const [registry, setRegistry] = useState<ServiceRegistry>(new Map())
    const registryRef = useRef<ServiceRegistry>(new Map())
    const ideServiceKeysRef = useRef<Set<AbstractClass<BaseService>>>(new Set())
    const [ready, setReady] = useState(false)

    useAsyncEffect(
        async (isAborted) => {
            const ideServices = await initIdeServices(
                projectId,
                authToken,
                parentRegistry.get(ProjectCache) as ProjectCache,
                username,
            )
            if (isAborted()) {
                destroyServices(ideServices)
                return
            }
            ideServiceKeysRef.current = new Set(ideServices.keys())

            parentRegistry.forEach((service, key) => {
                if (!ideServices.has(key)) {
                    ideServices.set(key, service)
                }
            })
            registryRef.current = ideServices
            setRegistry(ideServices)
            setReady(true)
        },
        () => {
            ideServiceKeysRef.current.forEach((key) => {
                const service = registryRef.current.get(key)
                service?.destroy?.()
            })

            registryRef.current = new Map()
            setRegistry(new Map())
            ideServiceKeysRef.current = new Set()
            setReady(false)
        },
        [projectId, authToken, username, parentRegistry],
    )

    if (!ready) return <FullScreenLoader />

    return <ServiceContext value={registry}>{children}</ServiceContext>
}
