import type { Terminal as XTerm } from '@xterm/xterm'

const CTRL_C = '\u0003' as const
const CR = '\r' as const
const LF = '\n' as const
const DEL = '\u007f' as const
const BS = '\b' as const

export type TerminalInputControllerDeps = Readonly<{
    terminal: Pick<XTerm, 'write'>
    sendInput: (text: string) => void
    stop: () => void
    canSendInput: () => boolean
    isActive: () => boolean
    onFirstInput?: () => void
}>

export class TerminalInputController {
    private inputBuffer = ''

    constructor(private readonly deps: TerminalInputControllerDeps) {}

    reset(): void {
        this.inputBuffer = ''
    }

    handleData(value: string): void {
        if (value === CTRL_C && this.deps.isActive()) {
            this.deps.stop()
            return
        }

        if (!this.deps.canSendInput()) return

        this.deps.onFirstInput?.()

        for (let i = 0; i < value.length; i += 1) {
            const ch = value[i]
            if (ch === LF && i > 0 && value[i - 1] === CR) continue

            const isLineBreak = ch === CR || ch === LF
            if (isLineBreak) {
                this.deps.terminal.write(`${CR}${LF}`)
                this.deps.sendInput(`${this.inputBuffer}${LF}`)
                this.reset()
                continue
            }

            const isBackspace = ch === DEL || ch === BS
            if (isBackspace) {
                if (this.inputBuffer.length <= 0) continue
                this.deps.terminal.write(`${BS} ${BS}`)
                this.inputBuffer = this.inputBuffer.slice(0, -1)
                continue
            }

            const isPrintable = ch === '\t' || ch >= ' '
            if (!isPrintable) continue

            this.deps.terminal.write(ch)
            this.inputBuffer += ch
        }
    }
}
