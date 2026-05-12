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

    public mostRecent(): T | null {
        if (this.items.length === 0) return null
        return this.items[this.items.length - 1] ?? null
    }

    public toArray(): T[] {
        return [...this.items]
    }

    public clear(): void {
        this.items = []
    }
}

const QUOTE = 34
const LEFT_BRACE = 123
const RIGHT_BRACE = 125
const BACKSLASH = 92
const LOWERCASE_U = 117

export class JsonStream {
    private inJson = false
    private rawText: number[] = []
    private unbalancedBraces = 0
    private inString = false
    private inEscape = 0
    private textDecoder = new TextDecoder()

    public insert(charCode: number): string | null {
        if (!this.inJson && charCode === LEFT_BRACE) {
            this.inJson = true
            this.rawText = []
            this.unbalancedBraces = 0
            this.inString = false
            this.inEscape = 0
        }

        if (!this.inJson) {
            return null
        }

        this.rawText.push(charCode)

        if (this.inString) {
            if (this.inEscape > 0) {
                if (charCode === LOWERCASE_U) {
                    this.inEscape += 4
                }
                this.inEscape -= 1
            } else if (charCode === BACKSLASH) {
                this.inEscape = 1
            } else if (charCode === QUOTE) {
                this.inString = false
            }

            return null
        }

        if (charCode === LEFT_BRACE) {
            this.unbalancedBraces += 1
        } else if (charCode === RIGHT_BRACE) {
            this.unbalancedBraces -= 1
            if (this.unbalancedBraces === 0) {
                this.inJson = false
                return this.textDecoder.decode(new Uint8Array(this.rawText))
            }
        } else if (charCode === QUOTE) {
            this.inString = true
        }

        return null
    }
}
