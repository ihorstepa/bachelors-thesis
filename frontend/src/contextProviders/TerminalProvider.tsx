import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useService } from '@/contextProviders/ServiceProvider'
import { CodeRunner } from '@/core/codeRunner'
import type { CodeRunnerStatus } from '@/core/codeRunner'

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
    const hasAutoOpenedRef = useRef(false)

    const isInteractiveStatus = (status: CodeRunnerStatus): boolean => status === 'running'

    useEffect(() => {
        const openOnce = () => {
            if (hasAutoOpenedRef.current) return
            hasAutoOpenedRef.current = true
            setTerminalOpen(true)
        }

        const unsubChange = codeRunner.on('change', (status) => {
            if (status === 'compiling') hasAutoOpenedRef.current = false

            if (isInteractiveStatus(status) || codeRunner.getCanSendInput()) {
                openOnce()
            }
        })

        const unsubStdout = codeRunner.on('stdout', openOnce)
        const unsubStderr = codeRunner.on('stderr', openOnce)

        return () => {
            unsubChange()
            unsubStdout()
            unsubStderr()
        }
    }, [codeRunner])

    const value: TerminalState = { terminalOpen, setTerminalOpen }

    return <TerminalContext value={value}>{children}</TerminalContext>
}

export default TerminalProvider
