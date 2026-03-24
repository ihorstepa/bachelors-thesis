import type { MaybePromise } from '@/utils/types'

export abstract class BaseService {
    public init?(): MaybePromise<void>
    public destroy?(): void
}

export abstract class Observable {
    protected observers: Set<() => void>

    public constructor() {
        this.observers = new Set()
    }

    public onChange(callback: () => void): () => void {
        this.observers.add(callback)
        return () => this.observers.delete(callback)
    }

    protected notifyObservers(): void {
        ;[...this.observers].forEach((callback) => callback())
    }
}
