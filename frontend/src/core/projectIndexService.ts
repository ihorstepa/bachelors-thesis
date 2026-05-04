import { BaseService, Observable } from '@/core/general'
import mixin from '@/utils/mixin'

export type FileLocation = {
    id: string
    path: string
}

export type ProjectIndexServiceEvents = {
    readonly change: []
}

const ClassBase = mixin(BaseService, Observable<ProjectIndexServiceEvents>)

export abstract class ProjectIndexService extends ClassBase {
    public abstract getAllFilePaths(): FileLocation[]
    public abstract getPathById(id: string): string | null
}
