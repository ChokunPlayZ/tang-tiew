import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../../db'
import { trips, tripMembers, subGroups, subGroupMembers, users, sessions } from '../../../../db/schema'
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

export const Route = createFileRoute('/api/trips/$tripId/')({
    server: {
        handlers: {
            GET: async ({ request, params }) => {
                const currentUser = await getCurrentUserFromRequest(request)
                if (!currentUser) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 })
                }

                const tripId = parseInt(params.tripId)
                if (isNaN(tripId)) {
                    return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
                }

                // Check if user is a member
                const membership = await db.query.tripMembers.findFirst({
                    where: and(
                        eq(tripMembers.tripId, tripId),
                        eq(tripMembers.userId, currentUser.id)
                    )
                })

                if (!membership) {
                    return Response.json({ error: 'Not a member of this trip' }, { status: 403 })
                }

                // Get trip details
                const trip = await db.query.trips.findFirst({
                    where: eq(trips.id, tripId)
                })

                if (!trip) {
                    return Response.json({ error: 'Trip not found' }, { status: 404 })
                }

                // Get all members with user info
                const members = await db.select({
                    id: tripMembers.id,
                    userId: users.id,
                    displayName: users.displayName,
                    joinedAt: tripMembers.joinedAt,
                })
                    .from(tripMembers)
                    .innerJoin(users, eq(tripMembers.userId, users.id))
                    .where(eq(tripMembers.tripId, tripId))

                // Get subGroups with their members
                const tripSubGroups = await db.select()
                    .from(subGroups)
                    .where(eq(subGroups.tripId, tripId))

                const subGroupsWithMembers = await Promise.all(
                    tripSubGroups.map(async (sg) => {
                        const sgMembers = await db.select({
                            userId: users.id,
                            displayName: users.displayName,
                        })
                            .from(subGroupMembers)
                            .innerJoin(users, eq(subGroupMembers.userId, users.id))
                            .where(eq(subGroupMembers.subGroupId, sg.id))

                        return {
                            ...sg,
                            members: sgMembers
                        }
                    })
                )

                return Response.json({
                    trip,
                    members,
                    subGroups: subGroupsWithMembers,
                    currentUserId: currentUser.id
                })
            }
        }
    }
})
