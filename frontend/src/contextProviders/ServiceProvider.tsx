import React, { createContext, useState, useContext, useRef } from 'react'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import WSConnectionFactory from '@/services/connectionFactory/wsConnectionFactory'
import SharedFileSystemManager from '@/services/fileSystemManager/sharedFileSystemManager'
import FileSystemPresenceService from '@/services/presenceService/fileSystemPresenceService'
import MultipleFileSyncManager from '@/services/fileSyncManager/multipleFileSyncManager'
import PersistentTabManager from '@/services/tabManager/persistentTabManager'
import LocalFileTreeManager from '@/services/fileTreeManager/localFileTreeManager'
import { ConnectionFactory } from '@/core/connectionFactory'
import { FileSystemManager } from '@/core/fileSystemManager'
import { PresenceService } from '@/core/presenceService'
import { FileSyncManager } from '@/core/fileSyncManager'
import { TabManager } from '@/core/tabManager'
import { FileTreeManager } from '@/core/fileTreeManager'
import type { AbstractClass } from '@/utils/types'
import type { BaseService } from '@/core/general'

type ServiceRegistry = Map<AbstractClass<BaseService>, BaseService>

const ServiceContext = createContext<ServiceRegistry>(new Map())

async function initServices(projectId?: string): Promise<ServiceRegistry> {
    const services: ServiceRegistry = new Map()
    projectId = projectId ?? 'default'

    const connectionFactory = new WSConnectionFactory(projectId)
    services.set(ConnectionFactory, connectionFactory)

    const fileSystemManager = new SharedFileSystemManager(connectionFactory)
    services.set(FileSystemManager, fileSystemManager)
    await fileSystemManager.init()

    const presenceService = new FileSystemPresenceService(fileSystemManager)
    services.set(PresenceService, presenceService)

    const fileSyncManager = new MultipleFileSyncManager(connectionFactory)
    services.set(FileSyncManager, fileSyncManager)

    const tabManager = new PersistentTabManager(fileSystemManager)
    services.set(TabManager, tabManager)

    const fileTreeManager = new LocalFileTreeManager(fileSystemManager)
    services.set(FileTreeManager, fileTreeManager)

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

type Props = {
    projectId?: string
    children: React.ReactNode
}

function ServiceProvider({ projectId, children }: Props): React.ReactNode {
    const registryRef = useRef<ServiceRegistry>(new Map())
    const [ready, setReady] = useState(false)

    useAsyncEffect(
        async (isAborted) => {
            const services = await initServices(projectId)
            if (isAborted()) return
            registryRef.current = services
            setReady(true)
        },
        () => {
            registryRef.current.forEach((service) => service.destroy?.())
            registryRef.current = new Map()
            setReady(false)
        },
        [projectId],
    )

    if (!ready) return <div>Loading...</div>

    return <ServiceContext value={registryRef.current}>{children}</ServiceContext>
}

export default ServiceProvider
