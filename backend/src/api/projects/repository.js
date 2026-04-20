import postgres from 'postgres'
import { logger } from '../../logger.js'

const log = logger.child({ module: 'project-repository' })
const PROJECT_ACTIVITY_TOUCH_MIN_INTERVAL_SECONDS = 30

/**
 * @typedef {object} Project
 * @property {string} id
 * @property {number} ownerId
 * @property {string} name
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {object} ProjectMember
 * @property {string} projectId
 * @property {number} userId
 * @property {string} username
 * @property {string} email
 * @property {'r'|'rw'} accessType
 */

/**
 * @typedef {object} ProjectListEntry
 * @property {string} id
 * @property {string} name
 * @property {number} ownerId
 * @property {string} ownerUsername
 * @property {'r'|'rw'} accessType
 * @property {boolean} favorited
 * @property {number} memberCount
 * @property {string[]} memberPreviewUsernames
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/** @param {any} row */
const mapUserRow = (row) => ({
    id: Number(row.id),
    username: row.username,
    email: row.email,
})

/** @param {any} row */
const mapProjectListEntryRow = (row) => ({
    id: row.id,
    name: row.name,
    ownerId: Number(row.owner_id),
    ownerUsername: row.owner_username,
    accessType: row.access_type,
    favorited: row.favorited === true || row.favorited === 't',
    memberCount: Number(row.member_count),
    memberPreviewUsernames: [],
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
})

/** @param {any} row */
const mapProjectRow = (row) => ({
    id: row.id,
    ownerId: Number(row.owner_id),
    name: row.name,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
})

/** @param {any} row */
const mapMemberRow = (row) => ({
    projectId: row.project_id,
    userId: Number(row.user_id),
    username: row.username,
    email: row.email,
    accessType: row.access_type,
})

export class ProjectRepository {
    /** @param {string} postgresUrl */
    constructor(postgresUrl) {
        this.sql = postgres(postgresUrl, { connect_timeout: 60 })
    }

    /**
     * @param {{ ownerId: number, name: string }} params
     * @returns {Promise<Project>}
     */
    async createProject({ ownerId, name }) {
        const rows = await this.sql`
            INSERT INTO projects (owner_id, name)
            VALUES (${ownerId}, ${name})
            RETURNING id, owner_id, name, created_at, updated_at
        `
        return mapProjectRow(rows[0])
    }

    /**
     * @param {string} id
     * @returns {Promise<Project|null>}
     */
    async getProjectById(id) {
        try {
            const rows = await this.sql`
                SELECT id, owner_id, name, created_at, updated_at
                FROM projects
                WHERE id = ${id}
                LIMIT 1
            `
            return rows.length === 0 ? null : mapProjectRow(rows[0])
        } catch (err) {
            // Invalid UUID input should behave as "not found" for project routes.
            if (typeof err === 'object' && err != null && 'code' in err && err.code === '22P02') {
                return null
            }
            throw err
        }
    }

    /**
     * @param {string} projectId
     * @returns {Promise<{ id: number, username: string, email: string }|null>}
     */
    async getProjectOwnerUser(projectId) {
        const rows = await this.sql`
            SELECT u.id, u.username, u.email
            FROM projects p
            JOIN users u ON u.id = p.owner_id
            WHERE p.id = ${projectId}
            LIMIT 1
        `
        return rows.length === 0 ? null : mapUserRow(rows[0])
    }

    /**
     * @param {string} username
     * @returns {Promise<{ id: number, username: string, email: string }|null>}
     */
    async getUserByUsername(username) {
        const rows = await this.sql`
            SELECT id, username, email
            FROM users
            WHERE LOWER(username) = LOWER(${username})
            LIMIT 1
        `
        return rows.length === 0 ? null : mapUserRow(rows[0])
    }

    /**
     * @param {string[]} projectIds
     * @param {number} limit
     * @returns {Promise<Map<string, string[]>>}
     */
    async listProjectMemberPreview(projectIds, limit) {
        if (!Array.isArray(projectIds) || projectIds.length === 0 || limit <= 0) {
            return new Map()
        }

        const rows = await this.sql`
            SELECT preview.project_id, preview.username
            FROM (
                SELECT
                    pm.project_id,
                    u.username,
                    ROW_NUMBER() OVER (PARTITION BY pm.project_id ORDER BY u.username ASC) AS rn
                FROM project_members pm
                JOIN users u ON u.id = pm.user_id
                WHERE pm.project_id = ANY(${projectIds})
            ) preview
            WHERE preview.rn <= ${limit}
            ORDER BY preview.project_id, preview.username ASC
        `

        const result = new Map()
        for (const row of rows) {
            const projectId = String(row.project_id)
            const current = result.get(projectId)
            if (current == null) {
                result.set(projectId, [String(row.username)])
            } else {
                current.push(String(row.username))
            }
        }

        return result
    }

    /**
     * Returns all projects visible to the user (owned or member), with membership/favorite info.
     * @param {number} userId
     * @returns {Promise<ProjectListEntry[]>}
     */
    async listProjectsForUser(userId) {
        const rows = await this.sql`
            SELECT
                p.id,
                p.name,
                p.owner_id,
                u.username AS owner_username,
                CASE WHEN p.owner_id = ${userId} THEN 'rw' ELSE pm.access_type END AS access_type,
                (ps.user_id IS NOT NULL) AS favorited,
                COUNT(pm2.user_id) AS member_count,
                p.created_at,
                p.updated_at
            FROM projects p
            JOIN users u ON u.id = p.owner_id
            LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}
            LEFT JOIN project_favorites ps ON ps.project_id = p.id AND ps.user_id = ${userId}
            LEFT JOIN project_members pm2 ON pm2.project_id = p.id
            WHERE p.owner_id = ${userId} OR pm.user_id = ${userId}
            GROUP BY p.id, p.name, p.owner_id, u.username, pm.access_type, ps.user_id
            ORDER BY p.updated_at DESC
        `
        return rows.map(mapProjectListEntryRow)
    }

    /**
     * @param {string} id
     * @param {{ name: string }} params
     * @returns {Promise<Project|null>}
     */
    async updateProject(id, { name }) {
        const rows = await this.sql`
            UPDATE projects
            SET name = ${name}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, owner_id, name, created_at, updated_at
        `
        return rows.length === 0 ? null : mapProjectRow(rows[0])
    }

    /**
     * Touches project activity timestamp, but only if enough time elapsed since last update.
     * @param {string} id
     * @returns {Promise<boolean>} true when row was updated
     */
    async touchProjectActivity(id) {
        const rows = await this.sql`
            UPDATE projects
            SET updated_at = NOW()
            WHERE id = ${id}
              AND updated_at < NOW() - (${PROJECT_ACTIVITY_TOUCH_MIN_INTERVAL_SECONDS} * INTERVAL '1 second')
            RETURNING id
        `
        return rows.length > 0
    }

    /**
     * @param {string} id
     * @returns {Promise<boolean>}
     */
    async deleteProject(id) {
        const rows = await this.sql`
            DELETE FROM projects WHERE id = ${id} RETURNING id
        `
        return rows.length > 0
    }

    /**
     * @param {string} projectId
     * @returns {Promise<ProjectMember[]>}
     */
    async listMembers(projectId) {
        const rows = await this.sql`
            SELECT pm.project_id, pm.user_id, u.username, u.email, pm.access_type
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = ${projectId}
            ORDER BY u.username ASC
        `
        return rows.map(mapMemberRow)
    }

    /**
     * @param {string} projectId
     * @param {number} userId
     * @returns {Promise<ProjectMember|null>}
     */
    async getMember(projectId, userId) {
        const rows = await this.sql`
            SELECT pm.project_id, pm.user_id, u.username, u.email, pm.access_type
            FROM project_members pm
            JOIN users u ON u.id = pm.user_id
            WHERE pm.project_id = ${projectId} AND pm.user_id = ${userId}
            LIMIT 1
        `
        return rows.length === 0 ? null : mapMemberRow(rows[0])
    }

    /**
     * @param {string} projectId
     * @param {number} userId
     * @param {'r'|'rw'} accessType
     * @returns {Promise<ProjectMember>}
     */
    async upsertMember(projectId, userId, accessType) {
        const rows = await this.sql`
            INSERT INTO project_members (project_id, user_id, access_type)
            VALUES (${projectId}, ${userId}, ${accessType})
            ON CONFLICT (project_id, user_id)
            DO UPDATE SET access_type = EXCLUDED.access_type
            RETURNING project_id, user_id, access_type
        `
        const row = rows[0]
        const userRows = await this.sql`SELECT username, email FROM users WHERE id = ${userId} LIMIT 1`
        return mapMemberRow({
            ...row,
            username: userRows[0]?.username ?? '',
            email: userRows[0]?.email ?? '',
        })
    }

    /**
     * @param {string} projectId
     * @param {number} userId
     * @returns {Promise<boolean>}
     */
    async removeMember(projectId, userId) {
        const rows = await this.sql`
            DELETE FROM project_members
            WHERE project_id = ${projectId} AND user_id = ${userId}
            RETURNING user_id
        `
        return rows.length > 0
    }

    /**
     * @param {string} projectId
     * @param {number} userId
     * @returns {Promise<void>}
     */
    async favoriteProject(projectId, userId) {
        await this.sql`
            INSERT INTO project_favorites (project_id, user_id)
            VALUES (${projectId}, ${userId})
            ON CONFLICT DO NOTHING
        `
    }

    /**
     * @param {string} projectId
     * @param {number} userId
     * @returns {Promise<void>}
     */
    async unfavoriteProject(projectId, userId) {
        await this.sql`
            DELETE FROM project_favorites
            WHERE project_id = ${projectId} AND user_id = ${userId}
        `
    }

    /**
     * Returns the access type for a user on a project, or null if no access.
     * Owner always gets 'rw'.
     * @param {number} userId
     * @param {string} projectId
     * @returns {Promise<'r'|'rw'|null>}
     */
    async getAccessType(userId, projectId) {
        const rows = await this.sql`
            SELECT
                CASE WHEN p.owner_id = ${userId} THEN 'rw' ELSE pm.access_type END AS access_type
                        FROM projects p
                        LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ${userId}
            WHERE p.id = ${projectId}
              AND (p.owner_id = ${userId} OR pm.user_id = ${userId})
            LIMIT 1
        `
        if (rows.length === 0) return null
        return rows[0].access_type
    }

    async destroy() {
        try {
            await this.sql.end({ timeout: 5 })
        } catch (err) {
            log.error({ err }, 'error closing project repository connection')
        }
    }
}

/** @param {string} postgresUrl */
export const createProjectRepository = (postgresUrl) => new ProjectRepository(postgresUrl)
