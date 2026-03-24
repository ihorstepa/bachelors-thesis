import React, { createContext, useState, useContext } from 'react'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import WSConnectionFactory from '@/core/services/wsConnectionFactory'
import FileSystemManager from '@/core/services/fileSystemManager'
import MultipleFileSyncManager from '@/core/services/multipleFileSyncManager'
import { IConnectionFactory } from '@/core/interfaces/connectionFactory'
import { IFileSystemManager } from '@/core/interfaces/fileSystemManager'
import { IFileSyncManager } from '@/core/interfaces/fileSyncManager'
import type { AbstractClass } from '@/utils/types'
import type { BaseService } from '@/core/interfaces/general'

type ServiceRegistry = Map<AbstractClass<BaseService>, BaseService>

const ServiceContext = createContext<ServiceRegistry>(new Map())

async function initServices(projectId?: string): Promise<ServiceRegistry> {
    const services: ServiceRegistry = new Map()
    projectId = projectId ?? 'default'

    const connectionFactory = new WSConnectionFactory(projectId)
    services.set(IConnectionFactory, connectionFactory)

    const fileSystemManager = new FileSystemManager(connectionFactory)
    services.set(IFileSystemManager, fileSystemManager)
    await fileSystemManager.init()

    const fileSyncManager = new MultipleFileSyncManager(connectionFactory)
    services.set(IFileSyncManager, fileSyncManager)

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

function ServiceContainer({ projectId, children }: Props): React.ReactNode {
    const [registry, setRegistry] = useState<ServiceRegistry>(new Map())

    useAsyncEffect(
        async (isAborted) => {
            const services = await initServices(projectId)
            if (isAborted()) return
            setRegistry(services)
        },
        () => {
            registry.forEach((service) => service.destroy?.())
            setRegistry(new Map())
        },
        [projectId],
    )

    if (registry.size === 0) return <div>Loading...</div>

    return <ServiceContext value={registry}>{children}</ServiceContext>
}

export default ServiceContainer
