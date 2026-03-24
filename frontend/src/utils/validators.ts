type ValidationResult = {
    readonly valid: boolean
    readonly msg?: string
}

export function validateNodeName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
        return { valid: false, msg: 'Name cannot be empty' }
    }

    if (name.length > 255) {
        return { valid: false, msg: 'Name is too long (max 255)' }
    }

    const illegalChars = /[\\/:*?"<>|]/
    if (illegalChars.test(name)) {
        return { valid: false, msg: 'Name includes illegal characters' }
    }

    const reserved = /^(\.+)?$/
    if (reserved.test(name)) {
        return { valid: false, msg: 'Name is reserved' }
    }

    return { valid: true }
}
