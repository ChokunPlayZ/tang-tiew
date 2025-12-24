import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db'
import { tripMembers, trips, sessions, users } from '../../../db/schema'
import { eq, desc } from 'drizzle-orm'

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

export const Route = createFileRoute('/api/trips/')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const cookies = parseCookies(request.headers.get('cookie'))
                const sessionId = cookies[SESSION_COOKIE]

                if (!sessionId) {
                    return Response.json([])
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
                    return Response.json([])
                }

                const { session, user } = result[0]

                if (new Date() > session.expiresAt) {
                    await db.delete(sessions).where(eq(sessions.id, sessionId))
                    return Response.json([])
                }

                // Fetch trips user is a member of
                const userTrips = await db.select({
                    id: trips.id,
                    name: trips.name,
                    code: trips.code,
                    createdAt: trips.createdAt,
                    memberCount: db.$count(tripMembers, eq(tripMembers.tripId, trips.id))
                })
                    .from(tripMembers)
                    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
                    .where(eq(tripMembers.userId, user.id))
                    .orderBy(desc(trips.createdAt))

                return Response.json(userTrips)
            }
        }
    }
})
