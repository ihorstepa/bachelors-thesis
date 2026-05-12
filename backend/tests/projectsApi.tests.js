import * as t from 'lib0/testing'
import { PROJECT_MAX_PER_OWNER } from '../src/config.js'
import { createApiTestContext } from './utils.js'

const { request, registerUser } = await createApiTestContext({
    port: 9012,
    redisPrefix: 'yhub:testing:projects-api',
})

/**
 * @param {t.TestCase} tc
 */
export const testProjectsCrudAndFavorite = async (tc) => {
    // Owner creates a project and can see it in their listing.
    const owner = await registerUser(tc, 'projects-owner')

    const createRes = await request('/api/projects', {
        method: 'POST',
        token: owner.token,
        body: { name: 'Thesis Project' },
    })
    t.assert(createRes.status === 201)
    const projectId = createRes.data?.project?.id
    t.assert(typeof projectId === 'string' && projectId.length > 0)
    t.assert(createRes.data?.project?.ownerUsername === owner.username)
    t.assert(createRes.data?.project?.favorited === false)
    t.assert(createRes.data?.project?.memberCount === 0)

    const listRes = await request('/api/projects', { token: owner.token })
    /** @type {Array<{ id: string, favorited?: boolean }>} */
    const listedProjects = listRes.data?.projects ?? []
    t.assert(listRes.status === 200)
    t.assert(listedProjects.some((project) => project.id === projectId))

    // Owner can rename the project.
    const patchRes = await request(`/api/projects/${projectId}`, {
        method: 'PATCH',
        token: owner.token,
        body: { name: 'Renamed Thesis Project' },
    })
    t.assert(patchRes.status === 200)
    t.assert(patchRes.data?.project?.name === 'Renamed Thesis Project')
    t.assert(patchRes.data?.project?.ownerUsername === owner.username)
    t.assert(patchRes.data?.project?.favorited === false)

    const favoriteRes = await request(`/api/projects/${projectId}/favorite`, {
        method: 'PUT',
        // Favorite flag can be toggled off again.
        token: owner.token,
    })
    t.assert(favoriteRes.status === 204)

    const listAfterFavoriteRes = await request('/api/projects', { token: owner.token })
    /** @type {Array<{ id: string, favorited?: boolean }>} */
    const favoritedProjects = listAfterFavoriteRes.data?.projects ?? []
    const favorited = favoritedProjects.find((project) => project.id === projectId)
    t.assert(favorited?.favorited === true)

    const unfavoriteRes = await request(`/api/projects/${projectId}/favorite`, {
        method: 'DELETE',
        token: owner.token,
    })
    t.assert(unfavoriteRes.status === 204)

    const listAfterUnfavoriteRes = await request('/api/projects', { token: owner.token })
    /** @type {Array<{ id: string, favorited?: boolean }>} */
    const unfavoritedProjects = listAfterUnfavoriteRes.data?.projects ?? []
    const unfavorited = unfavoritedProjects.find((project) => project.id === projectId)
    t.assert(unfavorited?.favorited === false)
}

/**
 * @param {t.TestCase} tc
 */
export const testProjectsMembershipAndPermissions = async (tc) => {
    // Owner creates a project and grants read-only membership.
    const owner = await registerUser(tc, 'projects-owner-2')
    const member = await registerUser(tc, 'projects-member')

    const createRes = await request('/api/projects', {
        method: 'POST',
        token: owner.token,
        body: { name: 'Members Project' },
    })
    t.assert(createRes.status === 201)
    const projectId = createRes.data?.project?.id

    const addMemberRes = await request(`/api/projects/${projectId}/members`, {
        method: 'POST',
        token: owner.token,
        body: { username: member.username, accessType: 'r' },
    })
    t.assert(addMemberRes.status === 200)
    t.assert(addMemberRes.data?.member?.username === member.username)

    const memberGetRes = await request(`/api/projects/${projectId}`, { token: member.token })
    t.assert(memberGetRes.status === 200)
    t.assert(memberGetRes.data?.project?.accessType === 'r')
    t.assert(memberGetRes.data?.project?.ownerUsername === owner.username)
    t.assert(memberGetRes.data?.project?.memberCount === 1)

    // Read-only members must not be able to mutate project metadata.
    const memberPatchRes = await request(`/api/projects/${projectId}`, {
        method: 'PATCH',
        token: member.token,
        body: { name: 'Should Not Work' },
    })
    t.assert(memberPatchRes.status === 403)

    const removeMemberRes = await request(`/api/projects/${projectId}/members/${member.user.id}`, {
        method: 'DELETE',
        token: owner.token,
    })
    t.assert(removeMemberRes.status === 204)

    // Removed members lose project access.
    const memberGetAfterRemovalRes = await request(`/api/projects/${projectId}`, { token: member.token })
    t.assert(memberGetAfterRemovalRes.status === 403)
}

/**
 * @param {t.TestCase} tc
 */
export const testProjectsAuthAndValidationErrors = async (tc) => {
    const owner = await registerUser(tc, 'projects-errors')

    // Listing projects requires authentication.
    const unauthListRes = await request('/api/projects')
    t.assert(unauthListRes.status === 401)

    // Name validation should reject too-short names.
    const invalidNameRes = await request('/api/projects', {
        method: 'POST',
        token: owner.token,
        body: { name: 'x' },
    })
    t.assert(invalidNameRes.status === 400)
    t.assert(invalidNameRes.data?.error?.type === 'VALIDATION_FAILED')

    const created = await request('/api/projects', {
        method: 'POST',
        token: owner.token,
        body: { name: 'Validation Project' },
    })
    t.assert(created.status === 201)
    const projectId = created.data?.project?.id

    // Membership accessType is constrained to supported enum values.
    const invalidAccessTypeRes = await request(`/api/projects/${projectId}/members`, {
        method: 'POST',
        token: owner.token,
        body: { username: owner.username, accessType: 'admin' },
    })
    t.assert(invalidAccessTypeRes.status === 400)
    t.assert(invalidAccessTypeRes.data?.error?.type === 'VALIDATION_FAILED')
}

/**
 * @param {t.TestCase} tc
 */
export const testProjectsOwnerLimit = async (tc) => {
    // Fill the per-owner quota exactly.
    const owner = await registerUser(tc, 'projects-limit')

    for (let i = 0; i < PROJECT_MAX_PER_OWNER; i++) {
        const createRes = await request('/api/projects', {
            method: 'POST',
            token: owner.token,
            body: { name: `Limit Project ${i}` },
        })
        t.assert(createRes.status === 201)
    }

    // One additional project should be rejected by abuse-prevention limits.
    const overflowRes = await request('/api/projects', {
        method: 'POST',
        token: owner.token,
        body: { name: 'Overflow Project' },
    })
    t.assert(overflowRes.status === 400)
    t.assert(overflowRes.data?.error?.type === 'VALIDATION_FAILED')
}
