import type { MaybePromise } from '@/utils/types'

export abstract class BaseService {
    public init?(): MaybePromise<void>
    public destroy?(): void
}

export abstract class Observable<T extends Record<string, unknown[]>> {
    protected observers: { [K in keyof T]?: Set<(...args: T[K]) => void> } = {}

    public on<K extends keyof T>(event: K, callback: (...args: T[K]) => void): () => void {
        if (!this.observers[event]) {
            this.observers[event] = new Set()
        }
        this.observers[event]!.add(callback)
        return () => this.off(event, callback)
    }

    public off<K extends keyof T>(event: K, callback: (...args: T[K]) => void): void {
        if (!this.observers[event]) return
        this.observers[event]!.delete(callback)
        if (this.observers[event]!.size === 0) {
            delete this.observers[event]
        }
    }

    protected emit<K extends keyof T>(event: K, ...args: T[K]): void {
        this.observers[event]?.forEach((callback) => callback(...args))
    }
}
