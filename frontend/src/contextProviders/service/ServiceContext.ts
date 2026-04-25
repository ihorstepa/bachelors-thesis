import { createContext, useContext } from 'react'

import type { BaseService } from '@/core/general'
import type { AbstractClass } from '@/utils/types'

export type ServiceRegistry = Map<AbstractClass<BaseService>, BaseService>

export const ServiceContext = createContext<ServiceRegistry>(new Map())

export function useService<T extends BaseService>(baseClass: AbstractClass<T>): T {
    const registry = useContext(ServiceContext)
    const service = registry.get(baseClass)
    if (!service) {
        throw new Error(`Service with class ${baseClass.name} is not registered`)
    }
    return service as T
}
