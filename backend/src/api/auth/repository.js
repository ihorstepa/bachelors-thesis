import postgres from 'postgres'
import { logger } from '../../logger.js'
import { AuthConflictError, AUTH_ERROR_TYPE } from './errors.js'

const log = logger.child({ module: 'auth-repository' })

/**
 * @typedef {object} AuthUser
 * @property {number} id
 * @property {string} email
 * @property {string} username
 * @property {string} passwordHash
 * @property {Date} createdAt
 */

const EMAIL_UNIQUE_INDEX = 'yhub_users_email_unique_idx'
const USERNAME_UNIQUE_INDEX = 'yhub_users_username_unique_idx'

/**
 * @param {any} row
 * @returns {AuthUser}
 */
const mapUserRow = (row) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
})

export class UserRepository {
    /**
     * @param {string} postgresUrl
     */
    constructor(postgresUrl) {
        this.sql = postgres(postgresUrl, { connect_timeout: 60 })
    }

    /**
     * @param {{ email: string, username: string, passwordHash: string }} params
     * @returns {Promise<AuthUser>}
     */
    async createUser({ email, username, passwordHash }) {
        try {
            const rows = await this.sql`
                INSERT INTO yhub_users (email, username, password_hash)
                VALUES (${email}, ${username}, ${passwordHash})
                RETURNING id, email, username, password_hash, created_at
            `
            return mapUserRow(rows[0])
        } catch (err) {
            if (err != null && typeof err === 'object' && 'code' in err && err.code === '23505') {
                const constraint =
                    'constraint' in err && typeof err.constraint === 'string' ? err.constraint : null
                if (constraint === USERNAME_UNIQUE_INDEX) {
                    throw new AuthConflictError(AUTH_ERROR_TYPE.USERNAME_TAKEN, 'Username is already taken')
                }
                if (constraint === EMAIL_UNIQUE_INDEX) {
                    throw new AuthConflictError(AUTH_ERROR_TYPE.EMAIL_TAKEN, 'Email is already registered')
                }
            }
            throw err
        }
    }

    /**
     * @param {string} email
     * @returns {Promise<AuthUser|null>}
     */
    async getUserByEmail(email) {
        const rows = await this.sql`
            SELECT id, email, username, password_hash, created_at
            FROM yhub_users
            WHERE LOWER(email) = LOWER(${email})
            LIMIT 1
        `
        return rows.length === 0 ? null : mapUserRow(rows[0])
    }

    /**
     * @param {string} username
     * @returns {Promise<AuthUser|null>}
     */
    async getUserByUsername(username) {
        const rows = await this.sql`
            SELECT id, email, username, password_hash, created_at
            FROM yhub_users
            WHERE LOWER(username) = LOWER(${username})
            LIMIT 1
        `
        return rows.length === 0 ? null : mapUserRow(rows[0])
    }

    async destroy() {
        try {
            await this.sql.end({ timeout: 5 })
        } catch (err) {
            log.error({ err }, 'error closing auth repository connection')
        }
    }
}

/**
 * @param {string} postgresUrl
 */
export const createUserRepository = (postgresUrl) => new UserRepository(postgresUrl)
