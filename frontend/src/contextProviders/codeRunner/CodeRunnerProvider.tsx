import type { ReactNode } from 'react'
import { useState, useSyncExternalStore } from 'react'

import { CodeRunnerContext, type CodeRunnerState } from '@/contextProviders/codeRunner/CodeRunnerContext'
import { useService } from '@/contextProviders/service/ServiceContext'
import { CodeRunner } from '@/core/codeRunner'

type Props = { children: ReactNode }

function CodeRunnerProvider({ children }: Props) {
    const codeRunner = useService(CodeRunner)
    const [selectedTarget, setSelectedTarget] = useState('')

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
        selectedTarget,
        setSelectedTarget,
        error,
        runner: codeRunner,
    }

    return <CodeRunnerContext value={value}>{children}</CodeRunnerContext>
}

export default CodeRunnerProvider
