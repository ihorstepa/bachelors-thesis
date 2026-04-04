import { useCallback, useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

import TerminalHeader from '@/components/Terminal/TerminalHeader'
import { useCodeRunner } from '@/contextProviders/CodeRunnerProvider'
import { useTerminal } from '@/contextProviders/TerminalProvider'
import '@/components/Terminal/Terminal.css'

function toTerminalText(text: string): string {
    return text.replace(/\r?\n/g, '\r\n')
}

function Terminal() {
    const { canSendInput, status, runner } = useCodeRunner()
    const { terminalOpen, setTerminalOpen } = useTerminal()
    const isActive = status === 'compiling' || status === 'linking' || status === 'running'

    const containerRef = useRef<HTMLDivElement | null>(null)
    const terminalRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const inputEnabledRef = useRef(canSendInput)
    const isActiveRef = useRef(isActive)
    const hasOutputRef = useRef(false)
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

        terminal.loadAddon(fitAddon)
        terminal.open(containerRef.current!)
        fitAddon.fit()

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

        const disposable = terminal.onData((value) => {
            // Ctrl+C chord is handled in onKey above; keep onData as a fallback.
            if (value === '\u0003' && isActiveRef.current) {
                runner.stop()
                return
            }
            if (!inputEnabledRef.current) return
            runner.sendInput(value)
        })

        const unsubStdout = runner.on('stdout', (text) => {
            if (placeholderShownRef.current) {
                terminal.clear()
                placeholderShownRef.current = false
            }
            terminal.write(toTerminalText(text))
            hasOutputRef.current = true
        })

        const unsubStderr = runner.on('stderr', (text) => {
            if (placeholderShownRef.current) {
                terminal.clear()
                placeholderShownRef.current = false
            }
            terminal.write(toTerminalText(`\u001b[31m${text}\u001b[0m`))
            hasOutputRef.current = true
        })

        const unsubExit = runner.on('exit', (code) => {
            if (placeholderShownRef.current) {
                terminal.clear()
                placeholderShownRef.current = false
            }
            terminal.write(toTerminalText(`\n\u001b[90m[exit ${code}]\u001b[0m\n`))
            hasOutputRef.current = true
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
        }
    }, [])

    useEffect(() => {
        const terminal = terminalRef.current
        if (!terminal || !terminalOpen) return

        const handle = requestAnimationFrame(() => {
            fitAddonRef.current?.fit()
            terminal.focus()
        })

        if (!hasOutputRef.current && status === 'idle' && !placeholderShownRef.current) {
            terminal.write(toTerminalText('\u001b[90m[nothing currently running]\u001b[0m\n'))
            placeholderShownRef.current = true
        }

        return () => cancelAnimationFrame(handle)
    }, [terminalOpen, status])

    useEffect(() => {
        if (status !== 'idle' && placeholderShownRef.current) {
            terminalRef.current?.clear()
            placeholderShownRef.current = false
        }
    }, [status])

    // show stopped message when a running build/run is killed (service sets status to 'idle')
    const prevStatusRef = useRef(status)
    useEffect(() => {
        const prev = prevStatusRef.current
        const wasActive = prev === 'compiling' || prev === 'linking' || prev === 'running'
        if (wasActive && status === 'idle') {
            terminalRef.current?.write(toTerminalText('\n\u001b[90m[stopped]\u001b[0m\n'))
        }
        prevStatusRef.current = status
    }, [status])

    const handleClear = useCallback(() => {
        terminalRef.current?.clear()
        terminalRef.current?.reset()
        hasOutputRef.current = false
        if (status === 'idle') {
            terminalRef.current?.write(toTerminalText('\u001b[90m[nothing currently running]\u001b[0m\n'))
            placeholderShownRef.current = true
        }
    }, [status])

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
