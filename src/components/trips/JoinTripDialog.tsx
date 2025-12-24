import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'

type SubGroup = {
    id: number
    name: string
}

type JoinTripResult = {
    success?: boolean
    tripId?: number
    requiresSubGroupSelection?: boolean
    subGroups?: SubGroup[]
    error?: string
}

export function JoinTripDialog() {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [step, setStep] = useState<'CODE' | 'SUBGROUP'>('CODE')
    const [subGroups, setSubGroups] = useState<SubGroup[]>([])
    const [selectedSubGroup, setSelectedSubGroup] = useState<number | null>(null)
    const [isOpen, setIsOpen] = useState(false)

    const handleJoin = async () => {
        try {
            const response = await fetch('/api/trips/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    subGroupId: selectedSubGroup || undefined
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to join trip')
            }

            const result: JoinTripResult = await response.json()

            if (result.requiresSubGroupSelection && result.subGroups) {
                setSubGroups(result.subGroups)
                setStep('SUBGROUP')
                return
            }

            setIsOpen(false)
            router.invalidate()
            await router.navigate({ to: `/app/trips/${result.tripId}` as any })

        } catch (error) {
            console.error(error)
            alert('Failed to join trip. Check code.')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">เข้าร่วมทริป (Join)</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>เข้าร่วมทริป</DialogTitle>
                </DialogHeader>

                {step === 'CODE' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>รหัสทริป (Trip Code)</Label>
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="text-center text-2xl tracking-widest uppercase"
                            />
                        </div>
                        <Button onClick={handleJoin} className="w-full bg-cyan-600">ถัดไป (Next)</Button>
                    </div>
                )}

                {step === 'SUBGROUP' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">ทริปนี้มีการแบ่งกลุ่มย่อย กรุณาเลือกกลุ่มที่คุณอยู่ (เช่น รถคันไหน)</p>
                        <div className="grid gap-2">
                            {subGroups.map(sg => (
                                <Button
                                    key={sg.id}
                                    variant={selectedSubGroup === sg.id ? "default" : "outline"}
                                    onClick={() => setSelectedSubGroup(sg.id)}
                                    className="justify-start"
                                >
                                    {sg.name}
                                </Button>
                            ))}
                            <Button
                                variant={selectedSubGroup === -1 ? "default" : "ghost"}
                                onClick={() => setSelectedSubGroup(-1)}
                                className="text-gray-500 justify-start"
                            >
                                ไม่ระบุ / ไม่เข้ากลุ่ม
                            </Button>
                        </div>
                        <Button
                            onClick={async () => {
                                if (selectedSubGroup === -1 || selectedSubGroup === null) {
                                    setIsOpen(false)
                                    router.invalidate()
                                    window.location.reload()
                                } else {
                                    handleJoin()
                                }
                            }}
                            className="w-full bg-cyan-600"
                            disabled={selectedSubGroup === null}
                        >
                            ยืนยัน (Confirm)
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
