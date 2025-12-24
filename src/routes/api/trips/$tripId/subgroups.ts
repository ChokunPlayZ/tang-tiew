import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../../db'
import { subGroups, subGroupMembers, tripMembers, sessions, users } from '../../../../db/schema'
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

export const Route = createFileRoute('/api/trips/$tripId/subgroups')({
    server: {
        handlers: {
            // Create a new subGroup
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
                    const { name } = z.object({
                        name: z.string().min(1, 'Name is required').max(50, 'Name too long')
                    }).parse(body)

                    const [created] = await db.insert(subGroups).values({
                        tripId,
                        name
                    }).returning()

                    return Response.json(created)
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return Response.json({
                            error: 'Validation failed',
                            details: error
                        }, { status: 400 })
                    }
                    console.error('Create subGroup error:', error)
                    return Response.json({ error: 'Failed to create subGroup' }, { status: 500 })
                }
            },

            // Delete a subGroup
            DELETE: async ({ request, params }) => {
                try {
                    const currentUser = await getCurrentUserFromRequest(request)
                    if (!currentUser) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    const tripId = parseInt(params.tripId)
                    const url = new URL(request.url)
                    const subGroupId = parseInt(url.searchParams.get('subGroupId') || '')

                    if (isNaN(tripId) || isNaN(subGroupId)) {
                        return Response.json({ error: 'Invalid IDs' }, { status: 400 })
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

                    // Delete members first, then subGroup
                    await db.delete(subGroupMembers).where(eq(subGroupMembers.subGroupId, subGroupId))
                    await db.delete(subGroups).where(
                        and(
                            eq(subGroups.id, subGroupId),
                            eq(subGroups.tripId, tripId)
                        )
                    )

                    return Response.json({ success: true })
                } catch (error) {
                    console.error('Delete subGroup error:', error)
                    return Response.json({ error: 'Failed to delete subGroup' }, { status: 500 })
                }
            }
        }
    }
})
