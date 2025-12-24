import { db } from '../db'
import { sessions, users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { getCookie, setCookie, deleteCookie, getEvent } from 'vinxi/http'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'auth_session'
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7

export async function createSession(userId: number) {
    const sessionId = randomUUID()
    const expiresAt = new Date(Date.now() + ONE_WEEK_MS)

    await db.insert(sessions).values({
        id: sessionId,
        userId,
        expiresAt,
    })

    setCookie(getEvent(), SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    })

    return sessionId
}

export async function getSession() {
    const sessionId = getCookie(getEvent(), SESSION_COOKIE)
    if (!sessionId) return null

    const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
        with: {
            user: true,
        },
    })

    if (!session) {
        deleteCookie(getEvent(), SESSION_COOKIE)
        return null
    }

    if (new Date() > session.expiresAt) {
        await db.delete(sessions).where(eq(sessions.id, sessionId))
        deleteCookie(getEvent(), SESSION_COOKIE)
        return null
    }

    return session
}

export async function getCurrentUser() {
    const sessionId = getCookie(getEvent(), SESSION_COOKIE)
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
        deleteCookie(getEvent(), SESSION_COOKIE)
        return null
    }

    return user
}

export async function logout() {
    const sessionId = getCookie(getEvent(), SESSION_COOKIE)
    if (sessionId) {
        await db.delete(sessions).where(eq(sessions.id, sessionId))
    }
    deleteCookie(getEvent(), SESSION_COOKIE)
}
