import { createProjectRepository } from './repository.js'
import { createProjectService } from './service.js'
import { createProjectsApi } from './api.js'

/**
 * @param {{
 *   postgresUrl: string,
 *   verifyAccessToken: (token: string) => Promise<{ userid: string }>
 * }} params
 */
export const createProjectsModule = async ({ postgresUrl, verifyAccessToken }) => {
    const repository = createProjectRepository(postgresUrl)
    const projectService = createProjectService({ repository })
    const projectsApi = createProjectsApi({ projectService, verifyAccessToken })

    /** @param {{ app: import('uws').TemplatedApp }} ctx */
    const setupApi = (ctx) => projectsApi.registerRoutes(ctx.app)

    /**
     * Returns the access type for a user on a project room.
     * @param {number} userId
     * @param {string} projectId
     * @returns {Promise<'r'|'rw'|null>}
     */
    const getAccessType = (userId, projectId) => projectService.getAccessType(userId, projectId)

    return {
        setupApi,
        getAccessType,
        destroy: () => repository.destroy(),
    }
}
