import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../../db'
import { payments, tripMembers, sessions, users } from '../../../../db/schema'
import { eq, and, desc } from 'drizzle-orm'

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

export const Route = createFileRoute('/api/trips/$tripId/payments')({
    server: {
        handlers: {
            // GET - List all payments with user names
            GET: async ({ request, params }) => {
                const currentUser = await getCurrentUserFromRequest(request)
                if (!currentUser) {
                    return Response.json({ error: 'Unauthorized' }, { status: 401 })
                }

                const tripId = parseInt(params.tripId)
                if (isNaN(tripId)) {
                    return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
                }

                // Get payments
                const tripPayments = await db.select({
                    id: payments.id,
                    fromUserId: payments.fromUserId,
                    toUserId: payments.toUserId,
                    amount: payments.amount,
                    slipUrl: payments.slipUrl,
                    status: payments.status,
                    createdAt: payments.createdAt,
                })
                    .from(payments)
                    .where(eq(payments.tripId, tripId))
                    .orderBy(desc(payments.createdAt))

                // Get user names for each payment
                const paymentsWithNames = await Promise.all(
                    tripPayments.map(async (p) => {
                        const fromUser = await db.select({ displayName: users.displayName })
                            .from(users).where(eq(users.id, p.fromUserId)).limit(1)
                        const toUser = await db.select({ displayName: users.displayName })
                            .from(users).where(eq(users.id, p.toUserId)).limit(1)
                        return {
                            ...p,
                            fromUserName: fromUser[0]?.displayName || 'Unknown',
                            toUserName: toUser[0]?.displayName || 'Unknown',
                        }
                    })
                )

                return Response.json(paymentsWithNames)
            },

            // POST - Record a payment
            POST: async ({ request, params }) => {
                try {
                    const currentUser = await getCurrentUserFromRequest(request)
                    if (!currentUser) {
                        return Response.json({ error: 'Unauthorized' }, { status: 401 })
                    }

                    const tripId = parseInt(params.tripId)
                    if (isNaN(tripId)) {
                        return Response.json({ error: 'Invalid trip ID' }, { status: 400 })
                    }

                    // Check membership
                    const membership = await db.query.tripMembers.findFirst({
                        where: and(
                            eq(tripMembers.tripId, tripId),
                            eq(tripMembers.userId, currentUser.id)
                        )
                    })

                    if (!membership) {
                        return Response.json({ error: 'Not a member' }, { status: 403 })
                    }

                    const body = await request.json()
                    const parsed = z.object({
                        toUserId: z.number(),
                        amount: z.number().positive('Amount must be positive'),
                        slipUrl: z.string().optional()
                    }).parse(body)

                    const [payment] = await db.insert(payments).values({
                        tripId,
                        fromUserId: currentUser.id,
                        toUserId: parsed.toUserId,
                        amount: parsed.amount.toString(),
                        slipUrl: parsed.slipUrl,
                        status: 'PENDING'
                    }).returning()

                    return Response.json(payment)
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return Response.json({
                            error: 'Validation failed',
                            details: error
                        }, { status: 400 })
                    }
                    console.error('Create payment error:', error)
                    return Response.json({ error: 'Failed to record payment' }, { status: 500 })
                }
            }
        }
    }
})
