import React, { createContext, useState, useContext, useMemo, useRef } from 'react'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import CppCodeRunner from '@/services/codeRunner/cppCodeRunner'
import { CodeRunner } from '@/core/codeRunner'
import { ProjectIndexService } from '@/core/projectIndexService'
import LocalProjectIndexService from '@/services/projectIndexService/localProjectIndexService'
import WSConnectionFactory from '@/services/connectionFactory/wsConnectionFactory'
import LocalConnectionFactory from '@/services/connectionFactory/localConnectionFactory'
import SharedFileSystemManager from '@/services/fileSystemManager/sharedFileSystemManager'
import FileSystemPresenceService from '@/services/presenceService/fileSystemPresenceService'
import MultipleFileSyncManager from '@/services/fileSyncManager/multipleFileSyncManager'
import PersistentTabManager from '@/services/tabManager/persistentTabManager'
import LocalFileTreeManager from '@/services/fileTreeManager/localFileTreeManager'
import UserAuthManager from '@/services/authManager/userAuthManager'
import AuthedApiClient from '@/services/apiClient/authedApiClient'
import UserProjectManager from '@/services/projectManager/userProjectManager'
import { ConnectionFactory } from '@/core/connectionFactory'
import { FileSystemManager } from '@/core/fileSystemManager'
import { PresenceService } from '@/core/presenceService'
import { FileSyncManager } from '@/core/fileSyncManager'
import { TabManager } from '@/core/tabManager'
import { FileTreeManager } from '@/core/fileTreeManager'
import { AuthManager } from '@/core/authManager'
import { ApiClient } from '@/core/apiClient'
import { ProjectManager } from '@/core/projectManager'
import type { AbstractClass } from '@/utils/types'
import type { BaseService } from '@/core/general'

type ServiceRegistry = Map<AbstractClass<BaseService>, BaseService>

const ServiceContext = createContext<ServiceRegistry>(new Map())

function initGlobalServices(): ServiceRegistry {
    const services: ServiceRegistry = new Map()

    const authManager = new UserAuthManager()
    services.set(AuthManager, authManager)

    const apiClient = new AuthedApiClient(authManager)
    services.set(ApiClient, apiClient)

    const projectManager = new UserProjectManager(apiClient)
    services.set(ProjectManager, projectManager)

    return services
}

async function initIdeServices(
    projectId: string | undefined,
    authToken: string,
    username?: string,
): Promise<ServiceRegistry> {
    const services: ServiceRegistry = new Map()

    const connectionFactory =
        projectId == null ? new LocalConnectionFactory() : new WSConnectionFactory(projectId, authToken)
    services.set(ConnectionFactory, connectionFactory)

    const fileSystemManager = new SharedFileSystemManager(connectionFactory)
    services.set(FileSystemManager, fileSystemManager)
    await fileSystemManager.init()

    const presenceService = new FileSystemPresenceService(fileSystemManager, username)
    services.set(PresenceService, presenceService)

    const fileSyncManager = new MultipleFileSyncManager(connectionFactory)
    services.set(FileSyncManager, fileSyncManager)

    const tabManager = new PersistentTabManager(fileSystemManager)
    services.set(TabManager, tabManager)

    const fileTreeManager = new LocalFileTreeManager(fileSystemManager)
    services.set(FileTreeManager, fileTreeManager)

    const projectFileIndex = new LocalProjectIndexService(fileSystemManager)
    services.set(ProjectIndexService, projectFileIndex)

    const compilationService = new CppCodeRunner(fileSystemManager, fileSyncManager, projectFileIndex, tabManager)
    services.set(CodeRunner, compilationService)

    return services
}

export function useService<T extends BaseService>(baseClass: AbstractClass<T>): T {
    const registry = useContext(ServiceContext)
    const service = registry.get(baseClass)
    if (!service) {
        throw new Error(`Service with class ${baseClass.name} is not registered`)
    }
    return service as T
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
    const registryRef = useRef<ServiceRegistry>(new Map())
    const ideServiceKeysRef = useRef<Set<AbstractClass<BaseService>>>(new Set())
    const [ready, setReady] = useState(false)

    useAsyncEffect(
        async (isAborted) => {
            const ideServices = await initIdeServices(projectId, authToken, username)
            ideServiceKeysRef.current = new Set(ideServices.keys())

            parentRegistry.forEach((service, key) => {
                if (!ideServices.has(key)) {
                    ideServices.set(key, service)
                }
            })

            if (isAborted()) return
            registryRef.current = ideServices
            setReady(true)
        },
        () => {
            ideServiceKeysRef.current.forEach((key) => {
                const service = registryRef.current.get(key)
                service?.destroy?.()
            })

            registryRef.current = new Map()
            ideServiceKeysRef.current = new Set()
            setReady(false)
        },
        [projectId, authToken, username, parentRegistry],
    )

    if (!ready) return <div>Loading...</div>

    return <ServiceContext value={registryRef.current}>{children}</ServiceContext>
}
