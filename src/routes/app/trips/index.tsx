import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Plus, Users } from 'lucide-react'
import { JoinTripDialog } from '../../../components/trips/JoinTripDialog'

type Trip = {
    id: number
    name: string
    code: string
    createdAt: string | null
    memberCount: number
}

export const Route = createFileRoute('/app/trips/')({
    component: TripsIndexPage,
})

function TripsIndexPage() {
    const router = useRouter()
    const [myTrips, setMyTrips] = useState<Trip[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadTrips() {
            try {
                const response = await fetch('/api/trips', {
                    credentials: 'include',
                })

                if (!response.ok) {
                    router.navigate({ to: '/login' })
                    return
                }

                const trips = await response.json()
                setMyTrips(trips)
            } catch (error) {
                console.error('Failed to load trips:', error)
            } finally {
                setLoading(false)
            }
        }

        loadTrips()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">กำลังโหลด...</div>
            </div>
        )
    }

    return (
        <div className="p-4 max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">ทริปของฉัน (My Trips)</h1>
                <div className="flex gap-2">
                    <JoinTripDialog />
                    <Link to="/app/trips/create">
                        <Button className="bg-cyan-600 gap-2">
                            <Plus size={16} /> สร้างทริป
                        </Button>
                    </Link>
                </div>
            </div>

            {myTrips.length === 0 ? (
                <div className="text-center py-10 opacity-60">
                    <p>ยังไม่มีทริป เริ่มต้นด้วยการสร้างทริปใหม่เลย!</p>
                    <p className="text-sm">No trips yet. Create one to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {myTrips.map(trip => (
                        <Link key={trip.id} to={`/app/trips/${trip.id}` as any} className="block">
                            <Card className="hover:border-cyan-500 transition-colors">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-start">
                                        <span>{trip.name}</span>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-500">
                                            #{trip.code}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center text-sm text-gray-500 gap-4">
                                        <div className="flex items-center gap-1">
                                            <Users size={14} />
                                            <span>{trip.memberCount} คน</span>
                                        </div>
                                        <div>
                                            {new Date(trip.createdAt!).toLocaleDateString('th-TH')}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
