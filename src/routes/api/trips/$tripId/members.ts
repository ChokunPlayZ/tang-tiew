import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../../db'
import { trips, tripMembers, subGroupMembers, subGroups, users, sessions } from '../../../../db/schema'
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

export const Route = createFileRoute('/api/trips/$tripId/members')({
    server: {
        handlers: {
            DELETE: async ({ request, params }) => {
                try {
                    const tripId = parseInt(params.tripId)
                    if (isNaN(tripId)) {
                        return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
                    }

                    const body = await request.json()
                    const { userId } = z.object({ userId: z.number() }).parse(body)

                    const cookies = parseCookies(request.headers.get('cookie'))
                    const sessionId = cookies[SESSION_COOKIE]

                    if (!sessionId) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    // Get current user ( requester )
                    const sessionResult = await db.select({
                        user: users,
                        session: sessions
                    })
                        .from(sessions)
                        .innerJoin(users, eq(sessions.userId, users.id))
                        .where(eq(sessions.id, sessionId))
                        .limit(1)

                    if (sessionResult.length === 0) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }
                    const requester = sessionResult[0].user

                    // Get Trip
                    const trip = await db.query.trips.findFirst({
                        where: eq(trips.id, tripId)
                    })

                    if (!trip) {
                        return Response.json({ error: 'Trip not found' }, { status: 404 })
                    }

                    // Check authorization: Only creator can kick
                    if (trip.createdBy !== requester.id) {
                        return Response.json({ error: 'Only the trip owner can remove members' }, { status: 403 })
                    }

                    // Prevent kicking yourself
                    if (userId === requester.id) {
                        return Response.json({ error: 'Cannot kick yourself' }, { status: 400 })
                    }

                    // 1. Remove from all sub-groups of this trip
                    // Find all sub-groups for this trip
                    const tripSubGroups = await db.select().from(subGroups).where(eq(subGroups.tripId, tripId))

                    if (tripSubGroups.length > 0) {
                        for (const sg of tripSubGroups) {
                            await db.delete(subGroupMembers).where(and(
                                eq(subGroupMembers.subGroupId, sg.id),
                                eq(subGroupMembers.userId, userId)
                            ))
                        }
                    }

                    // 2. Remove from trip
                    await db.delete(tripMembers).where(and(
                        eq(tripMembers.tripId, tripId),
                        eq(tripMembers.userId, userId)
                    ))

                    return Response.json({ success: true })
                } catch (error) {
                    console.error('Kick member error:', error)
                    return Response.json({ error: 'Failed to remove member' }, { status: 500 })
                }
            }
        }
    }
})
