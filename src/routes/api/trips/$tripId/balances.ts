import { createFileRoute } from '@tanstack/react-router'
import { db } from '../../../../db'
import { expenses, expenseShares, tripMembers, payments, sessions, users } from '../../../../db/schema'
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

type BalanceMap = Record<number, Record<number, number>>

export const Route = createFileRoute('/api/trips/$tripId/balances')({
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

                // Get all members
                const members = await db.select({
                    userId: users.id,
                    displayName: users.displayName,
                    promptPayId: users.promptPayId,
                    promptPayType: users.promptPayType,
                })
                    .from(tripMembers)
                    .innerJoin(users, eq(tripMembers.userId, users.id))
                    .where(eq(tripMembers.tripId, tripId))

                // Get all expenses for this trip with shares
                const tripExpenses = await db.select({
                    id: expenses.id,
                    paidByUserId: expenses.paidByUserId,
                    amount: expenses.amount,
                })
                    .from(expenses)
                    .where(eq(expenses.tripId, tripId))

                // Build a balance matrix: balances[from][to] = amount from owes to
                const balances: BalanceMap = {}

                for (const exp of tripExpenses) {
                    const shares = await db.select({
                        userId: expenseShares.userId,
                        owesAmount: expenseShares.owesAmount,
                    })
                        .from(expenseShares)
                        .where(eq(expenseShares.expenseId, exp.id))

                    for (const share of shares) {
                        if (share.userId === exp.paidByUserId) continue // Don't owe yourself

                        if (!balances[share.userId]) balances[share.userId] = {}
                        if (!balances[share.userId][exp.paidByUserId]) {
                            balances[share.userId][exp.paidByUserId] = 0
                        }
                        balances[share.userId][exp.paidByUserId] += parseFloat(share.owesAmount)
                    }
                }

                // Apply payments to reduce balances
                const tripPayments = await db.select()
                    .from(payments)
                    .where(eq(payments.tripId, tripId))

                for (const payment of tripPayments) {
                    if (balances[payment.fromUserId]?.[payment.toUserId]) {
                        balances[payment.fromUserId][payment.toUserId] -= parseFloat(payment.amount)
                    }
                }

                // Simplify: net off mutual debts
                const simplified: BalanceMap = {}
                for (const fromId in balances) {
                    for (const toId in balances[fromId]) {
                        const amount = balances[fromId][toId]
                        const reverseAmount = balances[toId]?.[fromId] || 0

                        const net = amount - reverseAmount
                        if (net > 0.01) { // More than 1 satang
                            if (!simplified[fromId]) simplified[fromId] = {}
                            simplified[fromId][toId] = Math.round(net * 100) / 100
                        }
                    }
                }

                // Format for response
                const result = []
                for (const fromId in simplified) {
                    for (const toId in simplified[fromId]) {
                        const fromUser = members.find(m => m.userId === parseInt(fromId))
                        const toUser = members.find(m => m.userId === parseInt(toId))

                        if (fromUser && toUser) {
                            result.push({
                                fromUserId: parseInt(fromId),
                                fromUserName: fromUser.displayName,
                                toUserId: parseInt(toId),
                                toUserName: toUser.displayName,
                                toPromptPayId: toUser.promptPayId,
                                toPromptPayType: toUser.promptPayType,
                                amount: simplified[fromId][toId]
                            })
                        }
                    }
                }

                return Response.json({
                    balances: result,
                    currentUserId: currentUser.id
                })
            }
        }
    }
})
