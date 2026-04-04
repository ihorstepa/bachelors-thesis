import { createContext, useContext, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { CodeRunner, type CodeRunnerStatus } from '@/core/codeRunner'

type CodeRunnerState = {
    status: CodeRunnerStatus
    canSendInput: boolean
    hasConfig: boolean
    targets: string[]
    error: string | null
    runner: CodeRunner
}

const CodeRunnerContext = createContext<CodeRunnerState | null>(null)

export function useCodeRunner(): CodeRunnerState {
    const ctx = useContext(CodeRunnerContext)
    if (!ctx) throw new Error('useCodeRunner must be used within CodeRunnerProvider')
    return ctx
}

type Props = { children: ReactNode }

function CodeRunnerProvider({ children }: Props) {
    const codeRunner = useService(CodeRunner)

    const subscribe = (cb: () => void) => codeRunner.on('change', cb)

    const hasConfig = useSyncExternalStore(subscribe, () => codeRunner.hasConfig())
    const status = useSyncExternalStore(subscribe, () => codeRunner.getStatus())
    const canSendInput = useSyncExternalStore(subscribe, () => codeRunner.getCanSendInput())
    const targets = useSyncExternalStore(subscribe, () => codeRunner.getTargets())
    const error = useSyncExternalStore(subscribe, () => codeRunner.getError())

    const value: CodeRunnerState = {
        status,
        canSendInput,
        hasConfig,
        targets,
        error,
        runner: codeRunner,
    }

    return <CodeRunnerContext value={value}>{children}</CodeRunnerContext>
}

export default CodeRunnerProvider
