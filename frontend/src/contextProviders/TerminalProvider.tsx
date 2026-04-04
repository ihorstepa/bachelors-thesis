import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { CodeRunner } from '@/core/codeRunner'

type TerminalState = {
    terminalOpen: boolean
    setTerminalOpen: (value: boolean) => void
}

const TerminalContext = createContext<TerminalState | null>(null)

export function useTerminal(): TerminalState {
    const ctx = useContext(TerminalContext)
    if (!ctx) throw new Error('useTerminal must be used within TerminalProvider')
    return ctx
}

type Props = { children: ReactNode }

function TerminalProvider({ children }: Props) {
    const codeRunner = useService(CodeRunner)
    const [terminalOpen, setTerminalOpen] = useState(false)

    useEffect(() => {
        const unsubStdout = codeRunner.on('stdout', () => setTerminalOpen(true))
        const unsubStderr = codeRunner.on('stderr', () => setTerminalOpen(true))
        return () => {
            unsubStdout()
            unsubStderr()
        }
    }, [codeRunner])

    const value: TerminalState = { terminalOpen, setTerminalOpen }

    return <TerminalContext value={value}>{children}</TerminalContext>
}

export default TerminalProvider
