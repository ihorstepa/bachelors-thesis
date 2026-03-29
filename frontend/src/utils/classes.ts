export class LRUSet<T> {
    private items: T[] = []
    private readonly limit: number

    constructor(limit: number, initialItems: T[] = []) {
        this.limit = limit
        this.items = initialItems.slice(-limit)
    }

    public touch(item: T): T | null {
        const index = this.items.indexOf(item)
        if (index !== -1) {
            this.items.splice(index, 1)
        }

        this.items.push(item)

        if (this.items.length > this.limit) {
            return this.items.shift() ?? null
        }

        return null
    }

    public remove(item: T): void {
        const index = this.items.indexOf(item)
        if (index !== -1) {
            this.items.splice(index, 1)
        }
    }

    public toArray(): T[] {
        return [...this.items]
    }

    public clear(): void {
        this.items = []
    }
}
