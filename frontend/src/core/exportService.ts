import { BaseService } from '@/core/general'

export abstract class ExportService extends BaseService {
    public abstract exportProject(name: string): Promise<void>
}
