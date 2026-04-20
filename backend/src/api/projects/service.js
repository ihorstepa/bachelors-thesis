import {
    ProjectValidationError,
    ProjectNotFoundError,
    ProjectForbiddenError,
    ProjectError,
    PROJECT_ERROR_TYPE,
} from './errors.js'
import { normalizeProjectName, validateProjectAccessType, validateProjectName } from './validators.js'

/** @param {import('./repository.js').Project} p */
const serializeProject = (p) => ({
    id: p.id,
    name: p.name,
    ownerId: String(p.ownerId),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
})

/**
 * @param {{ userId: number|string, username: string, email: string, accessType: 'r'|'rw', isOwner?: boolean }} m
 */
const serializeMember = (m) => ({
    userId: String(m.userId),
    username: m.username,
    email: m.email,
    accessType: m.accessType,
    isOwner: m.isOwner === true,
})

/**
 * @param {import('./repository.js').ProjectListEntry} entry
 * @param {string[]} memberPreviewUsernames
 */
const serializeProjectListEntry = (entry, memberPreviewUsernames) => ({
    id: entry.id,
    name: entry.name,
    ownerId: String(entry.ownerId),
    ownerUsername: entry.ownerUsername,
    memberPreviewUsernames: [entry.ownerUsername, ...memberPreviewUsernames].slice(0, 3),
    accessType: entry.accessType,
    favorited: entry.favorited,
    memberCount: entry.memberCount,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
})

/**
 * @param {import('./repository.js').Project} project
 * @param {'r'|'rw'} accessType
 */
const serializeProjectDetails = (project, accessType) => ({
    ...serializeProject(project),
    accessType,
})

/**
 * @param {{ id: number, username: string, email: string }|null} ownerUser
 * @param {import('./repository.js').ProjectMember[]} members
 */
const serializeProjectMembers = (ownerUser, members) => {
    const ownerMember =
        ownerUser == null
            ? []
            : [
                serializeMember({
                    userId: ownerUser.id,
                    username: ownerUser.username,
                    email: ownerUser.email,
                    accessType: /** @type {'rw'} */ ('rw'),
                    isOwner: true,
                }),
            ]

    return [...ownerMember, ...members.map((member) => serializeMember({ ...member, isOwner: false }))]
}

/**
 * @param {unknown} body
 * @returns {Record<string, unknown>}
 */
const requireObjectBody = (body) => {
    if (body == null || typeof body !== 'object') {
        throw new ProjectValidationError('Request body must be a JSON object')
    }
    return /** @type {Record<string, unknown>} */ (body)
}

/**
 * @param {unknown} body
 * @returns {string}
 */
const parseValidatedProjectName = (body) => {
    const { name: rawName } = requireObjectBody(body)
    const name = normalizeProjectName(/** @type {string} */(rawName ?? ''))
    validateProjectName(name)
    return name
}

export class ProjectService {
    /**
     * @param {{
     *   repository: import('./repository.js').ProjectRepository,
     *   onProjectDeleted?: ((projectId: string) => Promise<void>) | null
     * }} params
     */
    constructor({ repository, onProjectDeleted = null }) {
        this.repository = repository
        this.onProjectDeleted = onProjectDeleted
    }

    /**
     * @param {number} userId
     * @param {unknown} body
     */
    async createProject(userId, body) {
        const name = parseValidatedProjectName(body)

        const project = await this.repository.createProject({ ownerId: userId, name })
        const ownerUser = await this.repository.getProjectOwnerUser(project.id)
        if (ownerUser == null) {
            throw new ProjectError(PROJECT_ERROR_TYPE.INTERNAL_ERROR, 'Project owner not found after creation')
        }
        const ownerUsername = ownerUser.username
        return {
            project: {
                ...serializeProject(project),
                ownerUsername,
                memberPreviewUsernames: [ownerUsername],
                accessType: 'rw',
                favorited: false,
                memberCount: 0,
            },
        }
    }

    /**
     * @param {number} userId
     */
    async listProjects(userId) {
        const entries = await this.repository.listProjectsForUser(userId)
        const previewByProjectId = await this.repository.listProjectMemberPreview(
            entries.map((entry) => entry.id),
            2,
        )
        const projects = entries.map((entry) =>
            serializeProjectListEntry(entry, previewByProjectId.get(entry.id) ?? []),
        )
        return {
            projects,
        }
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     */
    async getProject(userId, projectId) {
        const { project, accessType } = await this._requireProjectAccess(userId, projectId)
        const members = await this.repository.listMembers(projectId)
        const ownerUser = await this.repository.getProjectOwnerUser(projectId)
        return {
            project: serializeProjectDetails(project, accessType),
            members: serializeProjectMembers(ownerUser, members),
        }
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     * @param {unknown} body
     */
    async updateProject(userId, projectId, body) {
        const project = await this._requireProjectOwner(userId, projectId)

        const name = parseValidatedProjectName(body)
        if (name === project.name) {
            return { project: serializeProject(project) }
        }

        const updated = await this.repository.updateProject(projectId, { name })
        return { project: serializeProject(updated ?? project) }
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     */
    async deleteProject(userId, projectId) {
        await this._requireProjectOwner(userId, projectId)
        await this.onProjectDeleted?.(projectId)
        await this.repository.deleteProject(projectId)
    }

    /**
     * @param {string} projectId
     * @returns {Promise<boolean>}
     */
    async projectExists(projectId) {
        return (await this.repository.getProjectById(projectId)) != null
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     * @param {unknown} body
     */
    async addMember(userId, projectId, body) {
        await this._requireProjectOwner(userId, projectId)
        const { username: targetUsernameRaw, accessType: accessTypeRaw } = requireObjectBody(body)
        const accessType = validateProjectAccessType(accessTypeRaw)

        const targetUsername = typeof targetUsernameRaw === 'string' ? targetUsernameRaw.trim() : ''
        if (targetUsername.length === 0) {
            throw new ProjectValidationError('Username is required')
        }
        const targetUser = await this.repository.getUserByUsername(targetUsername)
        if (targetUser == null) {
            throw new ProjectValidationError('User not found')
        }
        if (targetUser.id === userId) {
            throw new ProjectValidationError('Cannot add the project owner as a member')
        }

        const member = await this.repository.upsertMember(projectId, targetUser.id, accessType)
        return {
            member: serializeMember({ ...member, isOwner: false }),
        }
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     * @param {string} targetUserIdStr
     */
    async removeMember(userId, projectId, targetUserIdStr) {
        await this._requireProjectOwner(userId, projectId)

        const targetUserId = Number(targetUserIdStr)
        if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
            throw new ProjectValidationError('Invalid user ID')
        }

        await this.repository.removeMember(projectId, targetUserId)
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     */
    async favoriteProject(userId, projectId) {
        await this._requireProjectAccess(userId, projectId)
        await this.repository.favoriteProject(projectId, userId)
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     */
    async unfavoriteProject(userId, projectId) {
        await this._requireProjectAccess(userId, projectId)
        await this.repository.unfavoriteProject(projectId, userId)
    }

    /**
     * Returns 'r', 'rw', or null if no access.
     * @param {number} userId
     * @param {string} projectId
     * @returns {Promise<'r'|'rw'|null>}
     */
    async getAccessType(userId, projectId) {
        return this.repository.getAccessType(userId, projectId)
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     * @returns {Promise<import('./repository.js').Project>}
     */
    async _requireProjectOwner(userId, projectId) {
        const project = await this.repository.getProjectById(projectId)
        if (project == null) throw new ProjectNotFoundError()
        if (project.ownerId !== userId) throw new ProjectForbiddenError()
        return project
    }

    /**
     * @param {number} userId
     * @param {string} projectId
     * @returns {Promise<{ project: import('./repository.js').Project, accessType: 'r'|'rw' }>}
     */
    async _requireProjectAccess(userId, projectId) {
        const project = await this.repository.getProjectById(projectId)
        if (project == null) throw new ProjectNotFoundError()

        if (project.ownerId === userId) {
            return { project, accessType: 'rw' }
        }

        const member = await this.repository.getMember(projectId, userId)
        if (member == null) throw new ProjectForbiddenError()
        return { project, accessType: member.accessType }
    }
}

/**
 * @param {{
 *   repository: import('./repository.js').ProjectRepository,
 *   onProjectDeleted?: ((projectId: string) => Promise<void>) | null
 * }} params
 */
export const createProjectService = (params) => new ProjectService(params)
