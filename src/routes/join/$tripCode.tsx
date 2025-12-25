import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Map, Users, LogIn } from 'lucide-react'

export const Route = createFileRoute('/join/$tripCode')({
    component: JoinTripPage,
})

function JoinTripPage() {
    const { tripCode } = Route.useParams()
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [isJoining, setIsJoining] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function checkStatus() {
            try {
                // Check Auth
                const authResponse = await fetch('/api/auth/check', { credentials: 'include' })
                if (!authResponse.ok) {
                    setIsAuthenticated(false)
                    return
                }
                const authData = await authResponse.json()
                setIsAuthenticated(authData.authenticated)

                if (authData.authenticated) {
                    // Check Membership
                    const membershipResponse = await fetch(`/api/trips/join?code=${tripCode}`, { credentials: 'include' })
                    if (membershipResponse.ok) {
                        const membershipData = await membershipResponse.json()
                        if (membershipData.isMember) {
                            if (membershipData.requiresOnboarding) {
                                router.navigate({
                                    to: '/profile/setup',
                                    search: { redirect: `/app/trips/${membershipData.tripId}` }
                                })
                            } else {
                                router.navigate({ to: `/app/trips/${membershipData.tripId}` as any })
                            }
                        }
                    }
                }
            } catch {
                setIsAuthenticated(false)
            }
        }
        checkStatus()
    }, [tripCode, router])

    const handleJoin = async () => {
        if (!isAuthenticated) {
            // Redirect to login with return URL
            router.navigate({ to: `/login?redirect=/join/${tripCode}` as any })
            return
        }

        setIsJoining(true)
        setError(null)
        try {
            const response = await fetch('/api/trips/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: tripCode }),
            })

            const data = await response.json()

            if (response.ok) {
                if (data.requiresOnboarding) {
                    router.navigate({
                        to: '/profile/setup',
                        search: { redirect: `/app/trips/${data.tripId}` }
                    })
                } else {
                    router.navigate({ to: `/app/trips/${data.tripId}` as any })
                }
            } else {
                setError(data.error || 'ไม่สามารถเข้าร่วมทริปได้')
            }
        } catch (err) {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsJoining(false)
        }
    }

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500">กำลังโหลด...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-cyan-500 to-teal-600 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mb-4">
                        <Map size={32} className="text-cyan-600" />
                    </div>
                    <CardTitle className="text-2xl">เข้าร่วมทริป</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <div className="text-sm text-gray-500">รหัสทริป</div>
                        <div className="text-3xl font-mono font-bold text-cyan-600">{tripCode}</div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {isAuthenticated ? (
                        <Button
                            onClick={handleJoin}
                            className="w-full bg-cyan-600 gap-2"
                            disabled={isJoining}
                        >
                            <Users size={18} />
                            {isJoining ? 'กำลังเข้าร่วม...' : 'เข้าร่วมทริป'}
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            <Button
                                onClick={() => router.navigate({ to: `/login?redirect=/join/${tripCode}` as any })}
                                className="w-full bg-cyan-600 gap-2"
                            >
                                <LogIn size={18} />
                                เข้าสู่ระบบเพื่อเข้าร่วม
                            </Button>
                            <p className="text-xs text-center text-gray-500">
                                คุณต้องเข้าสู่ระบบก่อนเพื่อเข้าร่วมทริป
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
