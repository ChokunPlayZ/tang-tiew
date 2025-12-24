import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db'
import { sessions, users } from '../../../db/schema'
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

export const Route = createFileRoute('/api/auth/check')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const cookies = parseCookies(request.headers.get('cookie'))
                const sessionId = cookies[SESSION_COOKIE]

                if (!sessionId) {
                    return Response.json({ authenticated: false }, { status: 401 })
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
                    // Clear the invalid cookie
                    const response = Response.json({ authenticated: false }, { status: 401 })
                    response.headers.set('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`)
                    return response
                }

                const { session, user } = result[0]

                if (new Date() > session.expiresAt) {
                    await db.delete(sessions).where(eq(sessions.id, sessionId))
                    const response = Response.json({ authenticated: false }, { status: 401 })
                    response.headers.set('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0`)
                    return response
                }

                return Response.json({
                    authenticated: true,
                    user: {
                        id: user.id,
                        phoneNumber: user.phoneNumber,
                        displayName: user.displayName,
                        promptPayId: user.promptPayId,
                    }
                })
            }
        }
    }
})
