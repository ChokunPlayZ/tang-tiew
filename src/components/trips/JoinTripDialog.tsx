import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Check } from 'lucide-react'

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
    const [codeError, setCOdeError] = useState('')
    const [step, setStep] = useState<'CODE' | 'SUBGROUP'>('CODE')
    const [subGroups, setSubGroups] = useState<SubGroup[]>([])
    const [selectedSubGroups, setSelectedSubGroups] = useState<number[]>([])
    const [tripId, setTripId] = useState<number | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const resetForm = () => {
        setCode('')
        setCOdeError('')
        setStep('CODE')
        setSubGroups([])
        setSelectedSubGroups([])
        setTripId(null)
    }

    const toggleSubGroup = (id: number) => {
        if (selectedSubGroups.includes(id)) {
            setSelectedSubGroups(selectedSubGroups.filter(g => g !== id))
        } else {
            setSelectedSubGroups([...selectedSubGroups, id])
        }
    }

    const handleCodeSubmit = async () => {
        setCOdeError('')

        if (!code.trim()) {
            setCOdeError('กรุณาใส่รหัสทริป')
            return
        }

        if (code.length !== 6) {
            setCOdeError('รหัสทริปต้องมี 6 ตัวอักษร')
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch('/api/trips/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            })

            if (!response.ok) {
                const data = await response.json()
                setCOdeError(data.error || 'ไม่พบทริป กรุณาตรวจสอบรหัส')
                return
            }

            const result: JoinTripResult = await response.json()

            if (result.requiresSubGroupSelection && result.subGroups) {
                setSubGroups(result.subGroups)
                setTripId(result.tripId || null)
                setStep('SUBGROUP')
                return
            }

            // No subgroups, navigate directly
            setIsOpen(false)
            resetForm()
            router.invalidate()
            await router.navigate({ to: `/app/trips/${result.tripId}` as any })

        } catch (error) {
            console.error(error)
            setCOdeError('เกิดข้อผิดพลาด กรุณาลองใหม่')
        } finally {
            setIsLoading(false)
        }
    }

    const handleConfirmSubGroups = async () => {
        setIsLoading(true)
        try {
            // Join each selected subgroup
            for (const subGroupId of selectedSubGroups) {
                await fetch('/api/trips/join', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, subGroupId }),
                })
            }

            setIsOpen(false)
            resetForm()
            router.invalidate()
            await router.navigate({ to: `/app/trips/${tripId}` as any })

        } catch (error) {
            console.error(error)
            alert('เกิดข้อผิดพลาด')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) resetForm()
        }}>
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
                            <Label>รหัสทริป (Trip Code) *</Label>
                            <Input
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value.toUpperCase())
                                    setCOdeError('')
                                }}
                                placeholder="XXXXXX"
                                maxLength={6}
                                className="text-center text-2xl tracking-widest uppercase"
                            />
                            {codeError && <p className="text-sm text-red-500">{codeError}</p>}
                        </div>
                        <Button
                            onClick={handleCodeSubmit}
                            className="w-full bg-cyan-600"
                            disabled={isLoading}
                        >
                            {isLoading ? 'กำลังตรวจสอบ...' : 'ถัดไป (Next)'}
                        </Button>
                    </div>
                )}

                {step === 'SUBGROUP' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-500">
                            ทริปนี้มีกลุ่มย่อย คุณสามารถเลือกเข้าหลายกลุ่มได้ (เช่น อยู่รถคัน A และเป็นคนดื่ม)
                        </p>
                        <div className="grid gap-2">
                            {subGroups.map(sg => {
                                const isSelected = selectedSubGroups.includes(sg.id)
                                return (
                                    <Button
                                        key={sg.id}
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => toggleSubGroup(sg.id)}
                                        className="justify-start"
                                    >
                                        {isSelected && <Check size={16} className="mr-2" />}
                                        {sg.name}
                                    </Button>
                                )
                            })}
                        </div>
                        <p className="text-xs text-gray-400">
                            คุณสามารถเปลี่ยนกลุ่มได้ภายหลังในหน้าทริป
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    // Skip subgroup selection
                                    setIsOpen(false)
                                    resetForm()
                                    router.invalidate()
                                    router.navigate({ to: `/app/trips/${tripId}` as any })
                                }}
                                className="flex-1"
                            >
                                ข้ามไปก่อน
                            </Button>
                            <Button
                                onClick={handleConfirmSubGroups}
                                className="flex-1 bg-cyan-600"
                                disabled={isLoading}
                            >
                                {isLoading ? 'กำลังบันทึก...' : 'ยืนยัน'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
