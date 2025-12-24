import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../db'
import { sessions } from '../../../db/schema'
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

export const Route = createFileRoute('/api/auth/logout')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                const cookies = parseCookies(request.headers.get('cookie'))
                const sessionId = cookies[SESSION_COOKIE]

                if (sessionId) {
                    // Delete session from database
                    await db.delete(sessions).where(eq(sessions.id, sessionId))
                }

                // Clear the session cookie
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
                    }
                })
            }
        }
    }
})
