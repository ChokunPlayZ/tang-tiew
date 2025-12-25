import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../../../db'
import { subGroupMembers, tripMembers, sessions, users } from '../../../../../db/schema'
import { eq, and } from 'drizzle-orm'

const SESSION_COOKIE = 'auth_session'

function parseCookies(cookieHeader: string | null): Record<string, string> {
    const cookies: Record<string, string> = {}
    if (!cookieHeader) return cookies

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.split('=')
        if (name && rest.length > 0) {
            cookies[name.trim()] = rest.join('=').trim()
        }
    })
    return cookies
}

async function getCurrentUserFromRequest(request: Request) {
    const cookies = parseCookies(request.headers.get('cookie'))
    const sessionId = cookies[SESSION_COOKIE]

    if (!sessionId) return null

    const result = await db.select({
        user: users,
        session: sessions
    })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.id, sessionId))
        .limit(1)

    if (result.length === 0) return null

    const { session, user } = result[0]

    if (new Date() > session.expiresAt) {
        await db.delete(sessions).where(eq(sessions.id, sessionId))
        return null
    }

    return user
}

export const Route = createFileRoute('/api/trips/$tripId/subgroups/join')({
    server: {
        handlers: {
            POST: async ({ request, params }) => {
                try {
                    const currentUser = await getCurrentUserFromRequest(request)
                    if (!currentUser) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    const tripId = parseInt(params.tripId)
                    if (isNaN(tripId)) {
                        return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
                    }

                    // Check membership
                    const membership = await db.query.tripMembers.findFirst({
                        where: and(
                            eq(tripMembers.tripId, tripId),
                            eq(tripMembers.userId, currentUser.id)
                        )
                    })

                    if (!membership) {
                        return Response.json({ error: 'Not a member' }, { status: 403 })
                    }

                    const body = await request.json()
                    const { subGroupId, action } = z.object({
                        subGroupId: z.number(),
                        action: z.enum(['join', 'leave'])
                    }).parse(body)

                    if (action === 'join') {
                        // Check if already a member
                        const existing = await db.query.subGroupMembers.findFirst({
                            where: and(
                                eq(subGroupMembers.subGroupId, subGroupId),
                                eq(subGroupMembers.userId, currentUser.id)
                            )
                        })

                        if (!existing) {
                            await db.insert(subGroupMembers).values({
                                subGroupId,
                                userId: currentUser.id
                            })
                        }
                    } else {
                        await db.delete(subGroupMembers).where(
                            and(
                                eq(subGroupMembers.subGroupId, subGroupId),
                                eq(subGroupMembers.userId, currentUser.id)
                            )
                        )
                    }

                    return Response.json({ success: true })
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return Response.json({
                            error: 'Validation failed',
                            details: error.issues
                        }, { status: 400 })
                    }
                    console.error('SubGroup join error:', error)
                    return Response.json({ error: 'Failed to update subGroup membership' }, { status: 500 })
                }
            }
        }
    }
})
