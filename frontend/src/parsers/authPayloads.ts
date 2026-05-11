import { z } from 'zod'

import { HttpError } from '@/errors/http'

const AuthUserSchema = z.object({
    id: z.string().min(1),
    email: z.string().min(1),
    username: z.string().min(1),
})

export type AuthUser = z.infer<typeof AuthUserSchema>

const AuthPayloadSchema = z.object({
    token: z.string().min(1),
    user: AuthUserSchema,
})

export type AuthPayload = z.infer<typeof AuthPayloadSchema>

const MePayloadSchema = z.object({
    user: AuthUserSchema,
})

function parsePayload<T>(schema: z.ZodType<T>, payload: unknown, message: string): T {
    const result = schema.safeParse(payload)
    if (!result.success) {
        throw new HttpError(400, 'INVALID_RESPONSE', message)
    }
    return result.data
}

export function parseAuthPayload(payload: unknown): AuthPayload {
    return parsePayload(AuthPayloadSchema, payload, 'Invalid authentication response')
}

export function parseMePayload(payload: unknown): AuthUser {
    return parsePayload(MePayloadSchema, payload, 'Invalid profile response').user
}
