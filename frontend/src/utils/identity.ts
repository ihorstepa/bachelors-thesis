const adjectives = ['Swift', 'Silent', 'Mighty', 'Clever', 'Bright', 'Golden', 'Vibrant']
const animals = ['Fox', 'Eagle', 'Otter', 'Panther', 'Owl', 'Dolphin', 'Lynx']
const saturation = 0.7
const lightness = 0.45

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
    const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
    const lightnessAdjustment = lightness - chroma / 2

    const sector = Math.floor(hue / 60) % 6
    const rgbBySector = [
        [chroma, secondary, 0],
        [secondary, chroma, 0],
        [0, chroma, secondary],
        [0, secondary, chroma],
        [secondary, 0, chroma],
        [chroma, 0, secondary],
    ]

    const [r, g, b] = rgbBySector[sector].map((c) => Math.round((c + lightnessAdjustment) * 255))
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const hashString = (value: string): number => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash * 31 + value.charCodeAt(i)) >>> 0
    }
    return hash
}

export const generateRandomName = (): string => {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const animal = animals[Math.floor(Math.random() * animals.length)]
    return `${adj} ${animal}`
}

export const generateRandomColor = (): string => {
    const hue = Math.floor(Math.random() * 360)
    return hslToHex(hue, saturation, lightness)
}

export const generateColorFromSeed = (seed: string): string => {
    const hash = hashString(seed)
    const hue = hash % 360
    return hslToHex(hue, saturation, lightness)
}
