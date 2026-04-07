import { BaseService } from '@/core/general'

export abstract class ApiClient extends BaseService {
    public abstract request(path: string, init: RequestInit): Promise<unknown>
}
