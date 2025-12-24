import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db } from '../../../../db'
import { expenses, expenseShares, tripMembers, sessions, users } from '../../../../db/schema'
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

export const Route = createFileRoute('/api/trips/$tripId/expenses')({
    server: {
        handlers: {
            // GET - List all expenses for the trip
            GET: async ({ request, params }) => {
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

                // Get expenses with payer info
                const tripExpenses = await db.select({
                    id: expenses.id,
                    title: expenses.title,
                    amount: expenses.amount,
                    splitType: expenses.splitType,
                    createdAt: expenses.createdAt,
                    paidByUserId: expenses.paidByUserId,
                    paidByName: users.displayName,
                })
                    .from(expenses)
                    .innerJoin(users, eq(expenses.paidByUserId, users.id))
                    .where(eq(expenses.tripId, tripId))
                    .orderBy(desc(expenses.createdAt))

                // Get shares for each expense
                const expensesWithShares = await Promise.all(
                    tripExpenses.map(async (exp) => {
                        const shares = await db.select({
                            userId: expenseShares.userId,
                            owesAmount: expenseShares.owesAmount,
                            userName: users.displayName,
                        })
                            .from(expenseShares)
                            .innerJoin(users, eq(expenseShares.userId, users.id))
                            .where(eq(expenseShares.expenseId, exp.id))

                        return { ...exp, shares }
                    })
                )

                return Response.json(expensesWithShares)
            },

            // POST - Add a new expense
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
                        title: z.string().min(1, 'Title is required').max(100),
                        amount: z.number().positive('Amount must be positive'),
                        paidByUserId: z.number(),
                        splitType: z.enum(['EQUAL', 'EXACT']).default('EQUAL'),
                        splitWith: z.array(z.object({
                            userId: z.number(),
                            amount: z.number().optional() // Only used for EXACT split
                        })).min(1, 'Must split with at least one person')
                    }).parse(body)

                    // Create expense
                    const [expense] = await db.insert(expenses).values({
                        tripId,
                        paidByUserId: parsed.paidByUserId,
                        title: parsed.title,
                        amount: parsed.amount.toString(),
                        splitType: parsed.splitType
                    }).returning()

                    // Create shares
                    if (parsed.splitType === 'EQUAL') {
                        const shareAmount = parsed.amount / parsed.splitWith.length
                        await db.insert(expenseShares).values(
                            parsed.splitWith.map(s => ({
                                expenseId: expense.id,
                                userId: s.userId,
                                owesAmount: shareAmount.toFixed(2)
                            }))
                        )
                    } else {
                        // EXACT split
                        await db.insert(expenseShares).values(
                            parsed.splitWith.map(s => ({
                                expenseId: expense.id,
                                userId: s.userId,
                                owesAmount: (s.amount || 0).toFixed(2)
                            }))
                        )
                    }

                    return Response.json(expense)
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        return Response.json({
                            error: 'Validation failed',
                            details: error
                        }, { status: 400 })
                    }
                    console.error('Create expense error:', error)
                    return Response.json({ error: 'Failed to create expense' }, { status: 500 })
                }
            }
        }
    }
})
