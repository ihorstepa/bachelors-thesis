import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useService } from '@/contextProviders/service/ServiceContext'
import { TerminalContext, type TerminalState } from '@/contextProviders/terminal/TerminalContext'
import type { CodeRunnerStatus } from '@/core/codeRunner'
import { CodeRunner } from '@/core/codeRunner'

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


