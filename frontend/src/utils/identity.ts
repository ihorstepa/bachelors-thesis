const ADJECTIVES = ['Swift', 'Silent', 'Mighty', 'Clever', 'Bright', 'Golden', 'Vibrant']
const ANIMALS = ['Fox', 'Eagle', 'Otter', 'Panther', 'Owl', 'Dolphin', 'Lynx']

export const generateRandomName = (): string => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `${adj} ${animal}`
}

export const generateRandomColor = (): string => {
    const hue = Math.floor(Math.random() * 360)
    const saturation = 0.7
    const lightness = 0.45

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
