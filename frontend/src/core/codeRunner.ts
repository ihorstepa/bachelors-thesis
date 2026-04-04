import { BaseService, Observable } from '@/core/general'
import mixin from '@/utils/mixin'

export type CodeRunnerStatus = 'idle' | 'syncing' | 'compiling' | 'linking' | 'running' | 'success' | 'error'

type CodeRunnerEvents = {
    readonly change: [status: CodeRunnerStatus]
    readonly stdout: [text: string]
    readonly stderr: [text: string]
    readonly exit: [code: number, ok: boolean]
    readonly error: [message: string]
}

const ClassBase = mixin(BaseService, Observable<CodeRunnerEvents>)

export abstract class CodeRunner extends ClassBase {
    public abstract run(targetName: string): Promise<void>
    public abstract sendInput(text: string): void
    public abstract stop(): void

    public abstract createConfig(): Promise<void>
    public abstract hasConfig(): boolean
    public abstract getStatus(): CodeRunnerStatus
    public abstract getCanSendInput(): boolean
    public abstract getTargets(): string[]
    public abstract getError(): string | null
}
