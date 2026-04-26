import { afterEach, describe, expect, it, vi } from 'vitest'

import { generateColorFromSeed, generateRandomColor, generateRandomName } from '@/utils/identity'

afterEach(() => {
    vi.restoreAllMocks()
})

describe('utils/identity', () => {
    it('generates a random name from adjective and animal pools', () => {
        const random = vi.spyOn(Math, 'random')
        random.mockReturnValueOnce(0)
        random.mockReturnValueOnce(0)
        expect(generateRandomName()).toBe('Swift Fox')

        random.mockReturnValueOnce(0.999)
        random.mockReturnValueOnce(0.999)
        expect(generateRandomName()).toBe('Vibrant Lynx')
    })

    it('generates a hex color from random hue', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0)
        expect(generateRandomColor()).toBe('#c32222')
    })

    it('produces deterministic seed-based colors in hex format', () => {
        const a1 = generateColorFromSeed('alice')
        const a2 = generateColorFromSeed('alice')
        const b = generateColorFromSeed('bob')

        expect(a1).toBe(a2)
        expect(a1).toMatch(/^#[0-9a-f]{6}$/)
        expect(b).toMatch(/^#[0-9a-f]{6}$/)
        expect(a1).not.toBe(b)
    })
})
