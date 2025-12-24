import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../db'
import { users, sessions } from '../../../db/schema'
import { eq } from 'drizzle-orm'

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

export const Route = createFileRoute('/api/profile/save')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json()
                    const parsed = z.object({
                        displayName: z.string().min(2),
                        promptPayId: z.string().min(10),
                        promptPayType: z.enum(['PHONE', 'NATIONAL_ID', 'EWALLET', 'UNKNOWN']),
                    }).parse(body)

                    const currentUser = await getCurrentUserFromRequest(request)
                    if (!currentUser) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    await db.update(users)
                        .set({
                            displayName: parsed.displayName,
                            promptPayId: parsed.promptPayId,
                            promptPayType: parsed.promptPayType,
                        })
                        .where(eq(users.id, currentUser.id))

                    return Response.json({ success: true })
                } catch (error) {
                    console.error('Profile save error:', error)
                    return Response.json({ error: 'Failed to save profile' }, { status: 400 })
                }
            }
        }
    }
})
