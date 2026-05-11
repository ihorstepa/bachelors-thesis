import { z } from 'zod'

import { HttpError } from '@/errors/http'

const AccessTypeSchema = z.enum(['r', 'rw'] as const)

const ProjectInfoSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    ownerId: z.string().min(1),
    ownerUsername: z.string().min(1),
    accessType: AccessTypeSchema,
    favorited: z.boolean(),
    memberCount: z.number(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
})

export type ProjectInfo = z.infer<typeof ProjectInfoSchema>

const ProjectPreviewSchema = ProjectInfoSchema.extend({
    memberPreviewUsernames: z.array(z.string()).optional().default([]),
})

export type ProjectPreview = z.infer<typeof ProjectPreviewSchema>

const ProjectMemberSchema = z.object({
    userId: z.string().min(1),
    username: z.string().min(1),
    email: z.string().min(1),
    accessType: AccessTypeSchema,
    isOwner: z.boolean(),
})

export type ProjectMember = z.infer<typeof ProjectMemberSchema>

const GetProjectPayloadSchema = z.object({
    project: ProjectInfoSchema,
    members: z.array(ProjectMemberSchema),
})

export type GetProjectPayload = z.infer<typeof GetProjectPayloadSchema>

const ProjectListPayloadSchema = z.object({
    projects: z.array(ProjectPreviewSchema),
})

const ProjectPayloadWrapperSchema = z.object({
    project: ProjectPreviewSchema,
})

const MemberPayloadWrapperSchema = z.object({
    member: ProjectMemberSchema,
})

function parsePayload<T>(schema: z.ZodType<T>, payload: unknown, message: string): T {
    const result = schema.safeParse(payload)
    if (!result.success) {
        throw new HttpError(400, 'INVALID_RESPONSE', message)
    }
    return result.data
}

export function parseGetProjectPayload(payload: unknown): GetProjectPayload {
    return parsePayload(GetProjectPayloadSchema, payload, 'Invalid project response')
}

export function parseProjectListPayload(payload: unknown): ProjectPreview[] {
    return parsePayload(ProjectListPayloadSchema, payload, 'Invalid projects list response').projects
}

export function parseProjectPayload(payload: unknown): ProjectPreview {
    return parsePayload(ProjectPayloadWrapperSchema, payload, 'Invalid project response').project
}

export function parseMemberPayload(payload: unknown): ProjectMember {
    return parsePayload(MemberPayloadWrapperSchema, payload, 'Invalid add member response').member
}
