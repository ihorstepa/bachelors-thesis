import mixin from '@/utils/mixin'
import { BaseService, Observable } from '@/core/general'

export type TabEvents = {
    readonly change: []
    readonly activeChange: [id: string | null]
}

const ClassBase = mixin(BaseService, Observable<TabEvents>)

export abstract class TabManager extends ClassBase {
    public abstract getTabs(): readonly string[]
    public abstract getActiveId(): string | null

    public abstract open(id: string): void
    public abstract reorder(fromIndex: number, toIndex: number): void
    public abstract close(id: string): void
    public abstract closeAll(): void
}
