import { BaseService, Observable } from '@/core/general'
import mixin from '@/utils/mixin'

export type LanguageServerEvents = {
    message: [string]
    ready: []
}

const ClassBase = mixin(BaseService, Observable<LanguageServerEvents>)

export abstract class LanguageServerManager extends ClassBase {
    public abstract send(message: string): void
    public abstract getDocumentUri(fileId: string): string | null
    public abstract isReady(): boolean
}
