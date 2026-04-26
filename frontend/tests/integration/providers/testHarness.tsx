import type { ReactNode } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { ServiceContext, type ServiceRegistry } from '@/contextProviders/service/ServiceContext'

type Mounted = {
    root: Root
    container: HTMLDivElement
}

export async function mountWithServices(node: ReactNode, registry: ServiceRegistry): Promise<Mounted> {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

    const container = document.createElement('div')
    document.body.appendChild(container)

    const root = createRoot(container)
    await act(async () => {
        root.render(<ServiceContext value={registry}>{node}</ServiceContext>)
    })

    return { root, container }
}

export async function unmountMounted(mounted: Mounted): Promise<void> {
    await act(async () => {
        mounted.root.unmount()
    })
    mounted.container.remove()
}

export async function waitForCondition(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
    throw new Error(`Timed out after ${timeoutMs}ms while waiting for condition`)
}
