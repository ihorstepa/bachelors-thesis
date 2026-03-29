const ADJECTIVES = ['Swift', 'Silent', 'Mighty', 'Clever', 'Bright', 'Golden', 'Vibrant']
const ANIMALS = ['Fox', 'Eagle', 'Otter', 'Panther', 'Owl', 'Dolphin', 'Lynx']

export const generateRandomName = (): string => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
    return `${adj} ${animal}`
}

export const generateRandomColor = (): string => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 45%)`
}
