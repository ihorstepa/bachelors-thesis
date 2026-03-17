import path from 'path-browserify'

export function isValidNodeName(filePath: string): boolean {
    if (!filePath || filePath.length === 0) return false
    if (filePath.includes('\0')) return false
    if (path.normalize(filePath) !== filePath) return false
    if (path.isAbsolute(filePath)) return false
    return true
}
