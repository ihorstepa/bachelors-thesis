import { act, useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const serviceState = vi.hoisted(() => {
    const createDeferred = () => {
        let resolve!: () => void
        const promise = new Promise<void>((res) => {
            resolve = res
        })
        return { promise, resolve }
    }

    const state = {
        createDeferred,
        fsInit: createDeferred(),
        userAuthInstances: [] as unknown[],
        apiClientInstances: [] as unknown[],
        userProjectManagerInstances: [] as unknown[],
        localConnectionInstances: [] as unknown[],
        wsConnectionInstances: [] as unknown[],
        sharedFsInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        presenceInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        fileSyncInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        tabManagerInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        fileTreeInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        projectIndexInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        exportServiceInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        codeRunnerInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        languageServerInstances: [] as Array<{ destroy: ReturnType<typeof vi.fn> }>,
        reset() {
            this.fsInit = this.createDeferred()
            this.userAuthInstances = []
            this.apiClientInstances = []
            this.userProjectManagerInstances = []
            this.localConnectionInstances = []
            this.wsConnectionInstances = []
            this.sharedFsInstances = []
            this.presenceInstances = []
            this.fileSyncInstances = []
            this.tabManagerInstances = []
            this.fileTreeInstances = []
            this.projectIndexInstances = []
            this.exportServiceInstances = []
            this.codeRunnerInstances = []
            this.languageServerInstances = []
        },
    }

    return state
})

vi.mock('@/services/authManager/userAuthManager', () => {
    class MockUserAuthManager {
        public constructor() {
            serviceState.userAuthInstances.push(this)
        }
    }
    return { default: MockUserAuthManager }
})

vi.mock('@/services/apiClient/authedApiClient', () => {
    class MockAuthedApiClient {
        public constructor(auth: unknown) {
            void auth
            serviceState.apiClientInstances.push(this)
        }
    }
    return { default: MockAuthedApiClient }
})

vi.mock('@/services/projectCache/localProjectCache', () => {
    class MockLocalProjectCache {
        public forScope() {
            return {
                persist: vi.fn(),
                clearRoom: vi.fn(),
            }
        }
    }
    return { default: MockLocalProjectCache }
})

vi.mock('@/services/projectManager/userProjectManager', () => {
    class MockUserProjectManager {
        public constructor(apiClient: unknown, projectCache: unknown) {
            void apiClient
            void projectCache
            serviceState.userProjectManagerInstances.push(this)
        }
    }
    return { default: MockUserProjectManager }
})

vi.mock('@/services/connectionFactory/localConnectionFactory', () => {
    class MockLocalConnectionFactory {
        public constructor(roomCache: unknown) {
            void roomCache
            serviceState.localConnectionInstances.push(this)
        }
    }
    return { default: MockLocalConnectionFactory }
})

vi.mock('@/services/connectionFactory/wsConnectionFactory', () => {
    class MockWSConnectionFactory {
        public constructor(projectId: string, authToken: string, roomCache: unknown) {
            void projectId
            void authToken
            void roomCache
            serviceState.wsConnectionInstances.push(this)
        }
    }
    return { default: MockWSConnectionFactory }
})

vi.mock('@/services/fileSystemManager/sharedFileSystemManager', () => {
    class MockSharedFileSystemManager {
        public readonly destroy = vi.fn()

        public constructor(connectionFactory: unknown) {
            void connectionFactory
            serviceState.sharedFsInstances.push(this)
        }

        public async init(): Promise<void> {
            await serviceState.fsInit.promise
        }
    }
    return { default: MockSharedFileSystemManager }
})

vi.mock('@/services/presenceService/fileSystemPresenceService', () => {
    class MockFileSystemPresenceService {
        public readonly destroy = vi.fn()

        public constructor(fileSystemManager: unknown, username?: string) {
            void fileSystemManager
            void username
            serviceState.presenceInstances.push(this)
        }
    }
    return { default: MockFileSystemPresenceService }
})

vi.mock('@/services/fileSyncManager/multipleFileSyncManager', () => {
    class MockMultipleFileSyncManager {
        public readonly destroy = vi.fn()

        public constructor(connectionFactory: unknown, fileSystemManager: unknown) {
            void connectionFactory
            void fileSystemManager
            serviceState.fileSyncInstances.push(this)
        }
    }
    return { default: MockMultipleFileSyncManager }
})

vi.mock('@/services/tabManager/persistentTabManager', () => {
    class MockPersistentTabManager {
        public readonly destroy = vi.fn()

        public constructor(fileSystemManager: unknown) {
            void fileSystemManager
            serviceState.tabManagerInstances.push(this)
        }
    }
    return { default: MockPersistentTabManager }
})

vi.mock('@/services/fileTreeManager/localFileTreeManager', () => {
    class MockLocalFileTreeManager {
        public readonly destroy = vi.fn()

        public constructor(fileSystemManager: unknown) {
            void fileSystemManager
            serviceState.fileTreeInstances.push(this)
        }
    }
    return { default: MockLocalFileTreeManager }
})

vi.mock('@/services/projectIndexService/localProjectIndexService', () => {
    class MockLocalProjectIndexService {
        public readonly destroy = vi.fn()

        public constructor(fileSystemManager: unknown) {
            void fileSystemManager
            serviceState.projectIndexInstances.push(this)
        }
    }
    return { default: MockLocalProjectIndexService }
})

vi.mock('@/services/exportService/browserProjectExportService', () => {
    class MockBrowserProjectExportService {
        public readonly destroy = vi.fn()

        public constructor(projectIndex: unknown, fileSyncManager: unknown) {
            void projectIndex
            void fileSyncManager
            serviceState.exportServiceInstances.push(this)
        }
    }
    return { default: MockBrowserProjectExportService }
})

vi.mock('@/services/codeRunner/cppCodeRunner', () => {
    class MockCppCodeRunner {
        public readonly destroy = vi.fn()

        public constructor(
            fileSystemManager: unknown,
            fileSyncManager: unknown,
            projectIndex: unknown,
            tabManager: unknown,
        ) {
            void fileSystemManager
            void fileSyncManager
            void projectIndex
            void tabManager
            serviceState.codeRunnerInstances.push(this)
        }
    }
    return { default: MockCppCodeRunner }
})

vi.mock('@/services/languageServer/cppLanguageServerManager', () => {
    class MockCppLanguageServerManager {
        public readonly destroy = vi.fn()

        public constructor(
            fileSyncManager: unknown,
            projectIndex: unknown,
            presenceService: unknown,
            tabManager: unknown,
        ) {
            void fileSyncManager
            void projectIndex
            void presenceService
            void tabManager
            serviceState.languageServerInstances.push(this)
        }
    }
    return { default: MockCppLanguageServerManager }
})

import { ServiceContext, type ServiceRegistry, useService } from '@/contextProviders/service/ServiceContext'
import { GlobalServiceProvider, IdeServiceProvider } from '@/contextProviders/service/ServiceProvider'
import { ApiClient } from '@/core/apiClient'
import { AuthManager } from '@/core/authManager'
import { CodeRunner } from '@/core/codeRunner'
import { ConnectionFactory } from '@/core/connectionFactory'
import { FileSystemManager } from '@/core/fileSystemManager'
import { ProjectCache } from '@/core/projectCache'
import { ProjectManager } from '@/core/projectManager'
import LocalProjectCache from '@/services/projectCache/localProjectCache'

import { mountWithServices, unmountMounted, waitForCondition } from './testHarness'

type GlobalSnapshot = {
    auth: unknown
    apiClient: unknown
    projectManager: unknown
}

type IdeSnapshot = {
    auth: unknown
    connectionFactory: unknown
    fileSystemManager: unknown
    codeRunner: unknown
}

function GlobalProbe({ onSnapshot }: { onSnapshot: (snapshot: GlobalSnapshot) => void }) {
    const auth = useService(AuthManager)
    const apiClient = useService(ApiClient)
    const projectManager = useService(ProjectManager)

    useEffect(() => {
        onSnapshot({ auth, apiClient, projectManager })
    }, [auth, apiClient, projectManager, onSnapshot])

    return null
}

function IdeProbe({ onSnapshot }: { onSnapshot: (snapshot: IdeSnapshot) => void }) {
    const auth = useService(AuthManager)
    const connectionFactory = useService(ConnectionFactory)
    const fileSystemManager = useService(FileSystemManager)
    const codeRunner = useService(CodeRunner)

    useEffect(() => {
        onSnapshot({ auth, connectionFactory, fileSystemManager, codeRunner })
    }, [auth, connectionFactory, fileSystemManager, codeRunner, onSnapshot])

    return null
}

describe('ServiceProvider integration', () => {
    const mounted: Array<Awaited<ReturnType<typeof mountWithServices>>> = []

    beforeEach(() => {
        serviceState.reset()
    })

    afterEach(async () => {
        await Promise.all(mounted.splice(0).map((entry) => unmountMounted(entry)))
        document.body.innerHTML = ''
    })

    it('GlobalServiceProvider wires global service graph', async () => {
        const latest = { current: null as GlobalSnapshot | null }

        const rendered = await mountWithServices(
            <GlobalServiceProvider>
                <GlobalProbe onSnapshot={(snapshot) => (latest.current = snapshot)} />
            </GlobalServiceProvider>,
            new Map(),
        )
        mounted.push(rendered)

        await waitForCondition(() => latest.current != null)

        expect(serviceState.userAuthInstances).toHaveLength(1)
        expect(serviceState.apiClientInstances).toHaveLength(1)
        expect(serviceState.userProjectManagerInstances).toHaveLength(1)

        expect(latest.current?.auth).toBe(serviceState.userAuthInstances[0])
        expect(latest.current?.apiClient).toBe(serviceState.apiClientInstances[0])
        expect(latest.current?.projectManager).toBe(serviceState.userProjectManagerInstances[0])
    })

    it('IdeServiceProvider waits for init and merges parent services', async () => {
        const parentAuth = { destroy: vi.fn() } as unknown as AuthManager
        const parentRegistry: ServiceRegistry = new Map()
        parentRegistry.set(AuthManager, parentAuth)
        parentRegistry.set(ProjectCache, new LocalProjectCache())
        const latest = { current: null as IdeSnapshot | null }

        const rendered = await mountWithServices(
            <IdeServiceProvider projectId='project-1' authToken='token-1' username='alice'>
                <IdeProbe onSnapshot={(snapshot) => (latest.current = snapshot)} />
            </IdeServiceProvider>,
            parentRegistry,
        )
        mounted.push(rendered)

        expect(latest.current).toBeNull()
        expect(rendered.container.querySelector('[role="status"]')).not.toBeNull()

        await act(async () => {
            serviceState.fsInit.resolve()
        })
        await waitForCondition(() => latest.current != null)

        expect(latest.current?.auth).toBe(parentAuth)
        expect(latest.current?.connectionFactory).toBe(serviceState.wsConnectionInstances[0])
        expect(latest.current?.fileSystemManager).toBe(serviceState.sharedFsInstances[0])
        expect(latest.current?.codeRunner).toBe(serviceState.codeRunnerInstances[0])
        expect(rendered.container.querySelector('[role="status"]')).toBeNull()
    })

    it('IdeServiceProvider tears down old ide services on dependency change and unmount', async () => {
        const parentAuth = { destroy: vi.fn() } as unknown as AuthManager
        const parentRegistry: ServiceRegistry = new Map()
        parentRegistry.set(AuthManager, parentAuth)
        parentRegistry.set(ProjectCache, new LocalProjectCache())
        const latest = { current: null as IdeSnapshot | null }

        const rendered = await mountWithServices(
            <IdeServiceProvider authToken='token-1' username='alice'>
                <IdeProbe onSnapshot={(snapshot) => (latest.current = snapshot)} />
            </IdeServiceProvider>,
            parentRegistry,
        )
        mounted.push(rendered)

        await act(async () => {
            serviceState.fsInit.resolve()
        })
        await waitForCondition(() => latest.current != null)

        const firstConnection = serviceState.localConnectionInstances[0]
        const firstFs = serviceState.sharedFsInstances[0]
        const firstRunner = serviceState.codeRunnerInstances[0]

        serviceState.fsInit = serviceState.createDeferred()

        await act(async () => {
            rendered.root.render(
                <ServiceContext value={parentRegistry}>
                    <IdeServiceProvider projectId='project-2' authToken='token-2' username='alice'>
                        <IdeProbe onSnapshot={(snapshot) => (latest.current = snapshot)} />
                    </IdeServiceProvider>
                </ServiceContext>,
            )
        })

        expect(firstFs.destroy).toHaveBeenCalledOnce()
        expect(firstRunner.destroy).toHaveBeenCalledOnce()
        expect(latest.current?.connectionFactory).toBe(firstConnection)

        await act(async () => {
            serviceState.fsInit.resolve()
        })
        await waitForCondition(() => latest.current?.connectionFactory === serviceState.wsConnectionInstances[0])

        const secondFs = serviceState.sharedFsInstances[1]
        const secondRunner = serviceState.codeRunnerInstances[1]

        await unmountMounted(rendered)
        mounted.pop()

        expect(secondFs.destroy).toHaveBeenCalledOnce()
        expect(secondRunner.destroy).toHaveBeenCalledOnce()
        expect(parentAuth.destroy).not.toHaveBeenCalled()
    })

    it('cleans up created ide services when init resolves after unmount', async () => {
        const parentAuth = { destroy: vi.fn() } as unknown as AuthManager
        const parentRegistry: ServiceRegistry = new Map()
        parentRegistry.set(AuthManager, parentAuth)
        parentRegistry.set(ProjectCache, new LocalProjectCache())

        const rendered = await mountWithServices(
            <IdeServiceProvider authToken='token-1' username='alice'>
                <div data-testid='ide-child'>child</div>
            </IdeServiceProvider>,
            parentRegistry,
        )
        mounted.push(rendered)

        expect(serviceState.sharedFsInstances).toHaveLength(1)
        expect(serviceState.presenceInstances).toHaveLength(0)
        expect(serviceState.fileSyncInstances).toHaveLength(0)
        expect(serviceState.tabManagerInstances).toHaveLength(0)
        expect(serviceState.fileTreeInstances).toHaveLength(0)
        expect(serviceState.projectIndexInstances).toHaveLength(0)
        expect(serviceState.exportServiceInstances).toHaveLength(0)
        expect(serviceState.codeRunnerInstances).toHaveLength(0)
        const fs = serviceState.sharedFsInstances[0]

        await unmountMounted(rendered)
        mounted.pop()

        await act(async () => {
            serviceState.fsInit.resolve()
        })
        await waitForCondition(() => serviceState.codeRunnerInstances.length > 0)

        const presence = serviceState.presenceInstances[0]
        const fileSync = serviceState.fileSyncInstances[0]
        const tabs = serviceState.tabManagerInstances[0]
        const tree = serviceState.fileTreeInstances[0]
        const index = serviceState.projectIndexInstances[0]
        const exportService = serviceState.exportServiceInstances[0]
        const runner = serviceState.codeRunnerInstances[0]

        await waitForCondition(() =>
            [
                fs.destroy,
                presence.destroy,
                fileSync.destroy,
                tabs.destroy,
                tree.destroy,
                index.destroy,
                exportService.destroy,
                runner.destroy,
            ].every((destroyMock) => destroyMock.mock.calls.length > 0),
        )

        expect(fs.destroy).toHaveBeenCalledOnce()
        expect(presence.destroy).toHaveBeenCalledOnce()
        expect(fileSync.destroy).toHaveBeenCalledOnce()
        expect(tabs.destroy).toHaveBeenCalledOnce()
        expect(tree.destroy).toHaveBeenCalledOnce()
        expect(index.destroy).toHaveBeenCalledOnce()
        expect(exportService.destroy).toHaveBeenCalledOnce()
        expect(runner.destroy).toHaveBeenCalledOnce()
        expect(parentAuth.destroy).not.toHaveBeenCalled()
    })
})
