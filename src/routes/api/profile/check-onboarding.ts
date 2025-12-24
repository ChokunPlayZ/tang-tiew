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

export const Route = createFileRoute('/api/profile/check-onboarding')({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const user = await getCurrentUserFromRequest(request)

                if (!user) {
                    return Response.json({ needsLogin: true }, { status: 401 })
                }

                if (user.displayName && user.promptPayId) {
                    return Response.json({ onboardingComplete: true })
                }

                return Response.json({
                    onboardingComplete: false,
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
