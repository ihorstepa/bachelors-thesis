import { createContext, useContext } from 'react'

import { type CodeRunner,type CodeRunnerStatus } from '@/core/codeRunner'

export type CodeRunnerState = {
    status: CodeRunnerStatus
    canSendInput: boolean
    hasConfig: boolean
    targets: string[]
    selectedTarget: string
    setSelectedTarget: (target: string) => void
    error: string | null
    runner: CodeRunner
}

export const CodeRunnerContext = createContext<CodeRunnerState | null>(null)

export function useCodeRunner(): CodeRunnerState {
    const ctx = useContext(CodeRunnerContext)
    if (!ctx) throw new Error('useCodeRunner must be used within CodeRunnerProvider')
    return ctx
}

