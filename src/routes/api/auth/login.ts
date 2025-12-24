import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../db'
import { users, sessions } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'auth_session'
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7

export const Route = createFileRoute('/api/auth/login')({
    server: {
        handlers: {
            POST: async ({ request }) => {
                try {
                    const body = await request.json()
                    const { phoneNumber } = z.object({
                        phoneNumber: z.string().min(10),
                    }).parse(body)

                    let user = await db.query.users.findFirst({
                        where: eq(users.phoneNumber, phoneNumber),
                    })

                    let userId = user?.id

                    if (!userId) {
                        const result = await db.insert(users).values({ phoneNumber }).returning({ id: users.id })
                        userId = result[0].id
                    }

                    // Create session
                    const sessionId = randomUUID()
                    const expiresAt = new Date(Date.now() + ONE_WEEK_MS)

                    await db.insert(sessions).values({
                        id: sessionId,
                        userId,
                        expiresAt,
                    })

                    // Create response with Set-Cookie header
                    const response = Response.json({ success: true })
                    response.headers.set('Set-Cookie',
                        `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
                    )

                    return response
                } catch (error) {
                    console.error('Login error:', error)
                    return Response.json({ error: 'Login failed' }, { status: 400 })
                }
            }
        }
    }
})
