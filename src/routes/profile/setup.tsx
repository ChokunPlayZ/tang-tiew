import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../components/ui/card'
import { useState, useEffect } from 'react'
import { extractPromptPayId, readQrFromFile } from '../../lib/promptpay'

export const Route = createFileRoute('/profile/setup')({
    component: ProfileSetupPage,
})

function ProfileSetupPage() {
    const router = useRouter()
    const [qrStatus, setQrStatus] = useState<'IDLE' | 'READING' | 'SUCCESS' | 'ERROR'>('IDLE')
    const [scannedId, setScannedId] = useState<string>('')
    const [scannedType, setScannedType] = useState<string>('')
    const [displayName, setDisplayName] = useState('')
    const [loading, setLoading] = useState(true)

    // Check auth and onboarding status on mount
    useEffect(() => {
        async function checkOnboarding() {
            try {
                const response = await fetch('/api/profile/check-onboarding', {
                    credentials: 'include',
                })

                if (!response.ok) {
                    router.navigate({ to: '/login' })
                    return
                }

                const data = await response.json()

                if (data.needsLogin) {
                    router.navigate({ to: '/login' })
                    return
                }

                if (data.onboardingComplete) {
                    router.navigate({ to: '/app/trips' })
                    return
                }

                setLoading(false)
            } catch (error) {
                console.error('Onboarding check failed:', error)
                router.navigate({ to: '/login' })
            }
        }

        checkOnboarding()
    }, [router])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        console.log('Processing file:', file.name, file.type, file.size)
        setQrStatus('READING')
        try {
            const rawCode = await readQrFromFile(file)
            console.log('QR code raw data:', rawCode)

            if (!rawCode) {
                setQrStatus('ERROR')
                alert('Could not read QR code from image. Make sure the QR code is clear and visible.')
                return
            }

            console.log('Extracting PromptPay ID from:', rawCode)
            const result = extractPromptPayId(rawCode)
            console.log('Extract result:', result)

            if (result.id) {
                setScannedId(result.id)
                setScannedType(result.type)
                setQrStatus('SUCCESS')
            } else {
                setQrStatus('ERROR')
                alert('Invalid PromptPay QR. Could not extract ID. Raw data: ' + rawCode.substring(0, 50) + '...')
            }
        } catch (error) {
            console.error('QR reading error:', error)
            setQrStatus('ERROR')
            alert('Error reading QR: ' + (error instanceof Error ? error.message : String(error)))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!scannedId) {
            alert('Please upload a valid PromptPay QR')
            return
        }

        try {
            const response = await fetch('/api/profile/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName,
                    promptPayId: scannedId,
                    promptPayType: scannedType
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to save profile')
            }

            router.invalidate()
            await router.navigate({ to: '/app/trips' })
        } catch (err) {
            console.error(err)
            alert('Failed to save profile')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">กำลังโหลด...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">ตั้งค่าโปรไฟล์ (Setup Profile)</CardTitle>
                    <CardDescription className="text-center">
                        กรุณาระบุชื่อและ QR รับเงินของคุณ
                        <br />
                        Set your name and payment QR
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName">ชื่อเล่น (Display Name)</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="เช่น น้องเอ (e.g. Alice)"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>QR รับเงิน (PromptPay QR)</Label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                <div className="space-y-2">
                                    <div className="text-4xl">📸</div>
                                    <div className="text-sm text-gray-500">
                                        {qrStatus === 'IDLE' && 'แตะเพื่ออัพโหลด QR Code'}
                                        {qrStatus === 'READING' && 'กำลังอ่านข้อมูล...'}
                                        {qrStatus === 'SUCCESS' && 'อ่านข้อมูลสำเร็จ! ✅'}
                                        {qrStatus === 'ERROR' && 'อ่านไม่สำเร็จ ลองใหม่อีกครั้ง ❌'}
                                    </div>
                                </div>
                            </div>
                            {qrStatus === 'SUCCESS' && (
                                <div className="text-sm bg-green-50 text-green-700 p-3 rounded-md mt-2">
                                    <strong>PromptPay ID:</strong> {scannedId} <br />
                                    <strong>Type:</strong> {scannedType}
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-cyan-600 hover:bg-cyan-700"
                            disabled={qrStatus !== 'SUCCESS' || !displayName}
                        >
                            บันทึกข้อมูล (Save)
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
