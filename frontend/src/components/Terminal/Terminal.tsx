import { useCallback, useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

import TerminalHeader from '@/components/Terminal/TerminalHeader'
import { TerminalInputController } from '@/components/Terminal/terminalInputController'
import { useCodeRunner } from '@/contextProviders/CodeRunnerProvider'
import type { CodeRunnerStatus } from '@/core/codeRunner'
import { useTerminal } from '@/contextProviders/TerminalProvider'
import '@/components/Terminal/Terminal.css'

const ansi = {
    dim: (text: string) => `\u001b[90m${text}\u001b[0m`,
    red: (text: string) => `\u001b[31m${text}\u001b[0m`,
} as const

const messages = {
    nothingRunning: `${ansi.dim('[nothing currently running]')}\n`,
    stopped: `\n${ansi.dim('[stopped]')}\n`,
    exit: (code: number) => `${ansi.dim(`[exit ${code}]`)}\n`,
} as const

const activeStatuses: ReadonlySet<CodeRunnerStatus> = new Set(['syncing', 'compiling', 'linking', 'running'])

function toTerminalText(text: string): string {
    return text.replace(/\r?\n/g, '\r\n')
}

function isExecutionActive(status: CodeRunnerStatus): boolean {
    return activeStatuses.has(status)
}

function Terminal() {
    const { canSendInput, status, runner } = useCodeRunner()
    const { terminalOpen, setTerminalOpen } = useTerminal()
    const isActive = isExecutionActive(status)

    const containerRef = useRef<HTMLDivElement | null>(null)
    const terminalRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const inputEnabledRef = useRef(canSendInput)
    const isActiveRef = useRef(isActive)
    const inputControllerRef = useRef<TerminalInputController | null>(null)
    const placeholderShownRef = useRef(false)

    useEffect(() => {
        inputEnabledRef.current = canSendInput
        isActiveRef.current = isActive
    }, [canSendInput, isActive])

    useEffect(() => {
        const computed = getComputedStyle(document.documentElement)
        const terminal = new XTerm({
            cursorBlink: true,
            fontSize: 12,
            lineHeight: 1.3,
            theme: {
                background: computed.getPropertyValue('--bg-base'),
                foreground: computed.getPropertyValue('--text-primary'),
                cursor: computed.getPropertyValue('--text-primary'),
                selectionBackground: computed.getPropertyValue('--bg-selection'),
                red: computed.getPropertyValue('--color-red'),
            },
        })
        const fitAddon = new FitAddon()

        const clearPlaceholder = () => {
            if (!placeholderShownRef.current) return
            terminal.clear()
            placeholderShownRef.current = false
        }

        const writeOutput = (text: string) => {
            clearPlaceholder()
            terminal.write(text)
            inputControllerRef.current?.reset()
        }

        terminal.loadAddon(fitAddon)
        terminal.open(containerRef.current!)
        fitAddon.fit()

        if (status === 'idle') {
            terminal.write(toTerminalText(messages.nothingRunning))
            placeholderShownRef.current = true
        }

        const resizeObserver = new ResizeObserver(() => fitAddon.fit())
        resizeObserver.observe(containerRef.current!)

        const keyDisposable = terminal.onKey(({ domEvent }) => {
            const isCtrl = domEvent.ctrlKey || domEvent.metaKey
            if (!isCtrl) return

            const key = domEvent.key.toLowerCase()
            if (key === 'c' && isActiveRef.current) {
                domEvent.preventDefault()
                runner.stop()
            }
        })

        inputControllerRef.current = new TerminalInputController({
            terminal,
            sendInput: (text) => runner.sendInput(text),
            stop: () => runner.stop(),
            canSendInput: () => inputEnabledRef.current,
            isActive: () => isActiveRef.current,
            onFirstInput: () => {
                clearPlaceholder()
            },
        })

        const disposable = terminal.onData((value) => {
            inputControllerRef.current?.handleData(value)
        })

        const unsubStdout = runner.on('stdout', (text) => {
            writeOutput(toTerminalText(text))
        })

        const unsubStderr = runner.on('stderr', (text) => {
            writeOutput(toTerminalText(ansi.red(text)))
        })

        const unsubExit = runner.on('exit', (code) => {
            writeOutput(toTerminalText(messages.exit(code)))
        })

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon

        return () => {
            keyDisposable.dispose()
            disposable.dispose()
            unsubStdout()
            unsubStderr()
            unsubExit()
            resizeObserver.disconnect()
            terminal.dispose()
            terminalRef.current = null
            fitAddonRef.current = null
            inputControllerRef.current = null
        }
    }, [])

    useEffect(() => {
        const terminal = terminalRef.current
        if (!terminal || !terminalOpen) return

        const handle = requestAnimationFrame(() => {
            fitAddonRef.current?.fit()
            terminal.focus()
        })

        return () => cancelAnimationFrame(handle)
    }, [terminalOpen])

    useEffect(() => {
        if (status !== 'idle' && placeholderShownRef.current) {
            terminalRef.current?.clear()
            placeholderShownRef.current = false
        }
    }, [status])

    const prevStatusRef = useRef(status)
    useEffect(() => {
        const prev = prevStatusRef.current
        const wasActive = isExecutionActive(prev)
        if (wasActive && status === 'idle') {
            terminalRef.current?.write(toTerminalText(messages.stopped))
        }
        prevStatusRef.current = status
    }, [status])

    const handleClear = useCallback(() => {
        terminalRef.current?.clear()
        terminalRef.current?.reset()
        inputControllerRef.current?.reset()
        placeholderShownRef.current = false
    }, [])

    return (
        <section className={`ide-terminal-panel ${terminalOpen ? 'open' : 'closed'}`}>
            <TerminalHeader
                isActive={isActive}
                onClear={handleClear}
                onStop={() => runner.stop()}
                onClose={() => setTerminalOpen(false)}
            />
            <div className='ide-terminal-body'>
                <div className='run-terminal' ref={containerRef} />
            </div>
        </section>
    )
}

export default Terminal
