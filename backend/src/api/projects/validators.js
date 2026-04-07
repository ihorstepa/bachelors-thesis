import { ProjectValidationError } from './errors.js'

const NAME_MIN_LEN = 2
const NAME_MAX_LEN = 100
const NAME_RE = /^[^\x00-\x1F]+$/
const ACCESS_TYPES = new Set(['r', 'rw'])

/**
 * @param {string} name
 * @returns {string}
 */
export const normalizeProjectName = (name) => name.trim()

/**
 * @param {string} name
 */
export const validateProjectName = (name) => {
    if (name.length === 0) {
        throw new ProjectValidationError('Project name is required')
    }
    if (name.length < NAME_MIN_LEN) {
        throw new ProjectValidationError(`Project name must be at least ${NAME_MIN_LEN} characters`)
    }
    if (name.length > NAME_MAX_LEN) {
        throw new ProjectValidationError(`Project name must not exceed ${NAME_MAX_LEN} characters`)
    }
    if (!NAME_RE.test(name)) {
        throw new ProjectValidationError('Project name must not contain control characters')
    }
}

/**
 * @param {unknown} accessType
 * @returns {'r'|'rw'}
 */
export const validateProjectAccessType = (accessType) => {
    if (typeof accessType !== 'string' || !ACCESS_TYPES.has(accessType)) {
        throw new ProjectValidationError("Access type must be 'r' or 'rw'")
    }
    return /** @type {'r'|'rw'} */ (accessType)
}
