import { describe, expect, it } from 'vitest'

import { LRUSet } from '@/utils/classes'

describe('utils/classes LRUSet', () => {
    describe('constructor', () => {
        it('initialises empty when no items are provided', () => {
            const s = new LRUSet<number>(3)
            expect(s.toArray()).toEqual([])
        })

        it('truncates initial items to the last `limit` elements', () => {
            const s = new LRUSet<number>(3, [1, 2, 3, 4, 5])
            expect(s.toArray()).toEqual([3, 4, 5])
        })

        it('accepts initial items that are exactly at the limit', () => {
            const s = new LRUSet<number>(3, [7, 8, 9])
            expect(s.toArray()).toEqual([7, 8, 9])
        })
    })

    describe('touch', () => {
        it('appends a new item and returns null while under the limit', () => {
            const s = new LRUSet<string>(3)
            expect(s.touch('a')).toBeNull()
            expect(s.touch('b')).toBeNull()
            expect(s.toArray()).toEqual(['a', 'b'])
        })

        it('evicts the oldest item and returns it when the limit is exceeded', () => {
            const s = new LRUSet<string>(3)
            s.touch('a')
            s.touch('b')
            s.touch('c')
            const evicted = s.touch('d')
            expect(evicted).toBe('a')
            expect(s.toArray()).toEqual(['b', 'c', 'd'])
        })

        it('moves an existing item to most-recent position', () => {
            const s = new LRUSet<string>(3)
            s.touch('a')
            s.touch('b')
            s.touch('c')
            s.touch('a')
            expect(s.toArray()).toEqual(['b', 'c', 'a'])
        })

        it('does not evict when touching an existing item keeps the size at limit', () => {
            const s = new LRUSet<string>(3)
            s.touch('a')
            s.touch('b')
            s.touch('c')
            const evicted = s.touch('b')
            expect(evicted).toBeNull()
            expect(s.toArray()).toEqual(['a', 'c', 'b'])
        })
    })

    describe('remove', () => {
        it('removes an existing item', () => {
            const s = new LRUSet<string>(5)
            s.touch('a')
            s.touch('b')
            s.touch('c')
            s.remove('b')
            expect(s.toArray()).toEqual(['a', 'c'])
        })

        it('is a no-op for a missing item', () => {
            const s = new LRUSet<string>(5)
            s.touch('a')
            expect(() => s.remove('x')).not.toThrow()
            expect(s.toArray()).toEqual(['a'])
        })
    })

    describe('mostRecent', () => {
        it('returns the latest touched item', () => {
            const s = new LRUSet<string>(5)
            s.touch('a')
            s.touch('b')
            s.touch('c')
            s.touch('b')

            expect(s.mostRecent()).toBe('b')
        })

        it('returns null when set is empty', () => {
            const s = new LRUSet<number>(3)
            expect(s.mostRecent()).toBeNull()
        })
    })

    describe('clear', () => {
        it('empties the set', () => {
            const s = new LRUSet<number>(5)
            s.touch(1)
            s.touch(2)
            s.clear()
            expect(s.toArray()).toEqual([])
        })
    })

    describe('toArray', () => {
        it('returns a copy so mutations do not affect the internal state', () => {
            const s = new LRUSet<number>(5)
            s.touch(1)
            s.touch(2)
            const arr = s.toArray()
            arr.push(99)
            expect(s.toArray()).toEqual([1, 2])
        })
    })
})
