import { createContext, useContext } from 'react'

export type TerminalState = {
    terminalOpen: boolean
    setTerminalOpen: (value: boolean) => void
}

export const TerminalContext = createContext<TerminalState | null>(null)

export function useTerminal(): TerminalState {
    const ctx = useContext(TerminalContext)
    if (!ctx) throw new Error('useTerminal must be used within TerminalProvider')
    return ctx
}

