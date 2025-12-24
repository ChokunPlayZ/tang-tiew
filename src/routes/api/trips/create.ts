import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../db'
import { trips, tripMembers, sessions, users } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { getEvent, getCookie, deleteCookie } from 'vinxi/http'

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

function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const Route = createFileRoute('/api/trips/create')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json()
                    const { name } = z.object({ name: z.string().min(3) }).parse(body)

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

                    const code = generateCode()

                    const newTrip = await db.transaction(async (tx) => {
                        const [created] = await tx.insert(trips).values({
                            name: name,
                            code: code,
                            createdBy: user.id
                        }).returning()

                        await tx.insert(tripMembers).values({
                            tripId: created.id,
                            userId: user.id
                        })

                        return created
                    })

                    return Response.json(newTrip)
                } catch (error) {
                    console.error('Create trip error:', error)
                    return Response.json({ error: 'Failed to create trip' }, { status: 400 })
                }
            }
        }
    }
})
