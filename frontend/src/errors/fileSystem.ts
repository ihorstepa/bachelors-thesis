import type { NullableString } from '@/utils/types'

export class NodeNotFoundError extends Error {
    constructor(id: string) {
        super(`Node with id "${id}" does not exist`)
        this.name = 'NodeNotFoundError'
    }
}

export class NodeNameConflictError extends Error {
    constructor(name: string) {
        super(`Node with name "${name}" already exists in this directory`)
        this.name = 'NodeNameConflictError'
    }
}

export class InvalidNodeNameError extends Error {
    constructor(name: string, msg: string = 'Invalid node name') {
        super(`${msg}: "${name}"`)
        this.name = 'InvalidNodeNameError'
    }
}

export class InvalidParentError extends Error {
    constructor(parentId: string) {
        super(`Node with id "${parentId}" is not a directory`)
        this.name = 'InvalidParentError'
    }
}

export class CircularMoveError extends Error {
    constructor(id: string) {
        super(`Cannot move node with id "${id}" into its own descendant`)
        this.name = 'CircularMoveError'
    }
}

export class FileNotOpenError extends Error {
    constructor(id: string) {
        super(`File with id "${id}" is not open`)
        this.name = 'FileNotOpenError'
    }
}

export class MissingIndexError extends Error {
    constructor(id: NullableString) {
        super(`Index missing for ${id ? 'root node' : 'node with id ' + id}`)
        this.name = 'MissingIndexError'
    }
}
