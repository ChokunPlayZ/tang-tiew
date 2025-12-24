import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../db'
import { trips, tripMembers, subGroups, subGroupMembers, sessions, users } from '../../../db/schema'
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

export const Route = createFileRoute('/api/trips/join')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json()
                    const payload = z.object({
                        code: z.string().length(6),
                        subGroupId: z.number().optional()
                    }).parse(body)

                    const cookies = parseCookies(request.headers.get('cookie'))
                    const sessionId = cookies[SESSION_COOKIE]

                    if (!sessionId) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    const result = await db.select({
                        user: users,
                        session: sessions
                    })
                        .from(sessions)
                        .innerJoin(users, eq(sessions.userId, users.id))
                        .where(eq(sessions.id, sessionId))
                        .limit(1)

                    if (result.length === 0) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    const { session, user } = result[0]

                    if (new Date() > session.expiresAt) {
                        await db.delete(sessions).where(eq(sessions.id, sessionId))
                        return Response.json({ error: 'Session expired' }, { status: 401 })
                    }

                    const trip = await db.query.trips.findFirst({
                        where: eq(trips.code, payload.code.toUpperCase())
                    })

                    if (!trip) {
                        return Response.json({ error: 'Trip not found' }, { status: 404 })
                    }

                    const existingMember = await db.query.tripMembers.findFirst({
                        where: and(
                            eq(tripMembers.tripId, trip.id),
                            eq(tripMembers.userId, user.id)
                        )
                    })

                    if (!existingMember) {
                        await db.insert(tripMembers).values({
                            tripId: trip.id,
                            userId: user.id
                        })
                    }

                    if (payload.subGroupId) {
                        const existingSubMember = await db.query.subGroupMembers.findFirst({
                            where: and(
                                eq(subGroupMembers.subGroupId, payload.subGroupId),
                                eq(subGroupMembers.userId, user.id)
                            )
                        })

                        if (!existingSubMember) {
                            await db.insert(subGroupMembers).values({
                                subGroupId: payload.subGroupId,
                                userId: user.id
                            })
                        }

                        return Response.json({ success: true, tripId: trip.id })
                    }

                    const availableSubGroups = await db.select().from(subGroups).where(eq(subGroups.tripId, trip.id))

                    if (availableSubGroups.length > 0) {
                        return Response.json({
                            success: true,
                            tripId: trip.id,
                            requiresSubGroupSelection: true,
                            subGroups: availableSubGroups
                        })
                    }

                    return Response.json({ success: true, tripId: trip.id })
                } catch (error) {
                    console.error('Join trip error:', error)
                    return Response.json({ error: 'Failed to join trip' }, { status: 400 })
                }
            }
        }
    }
})
