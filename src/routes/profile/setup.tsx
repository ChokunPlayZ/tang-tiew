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

import { z } from 'zod'

export const Route = createFileRoute('/profile/setup')({
    validateSearch: z.object({
        redirect: z.string().optional(),
    }),
    component: ProfileSetupPage,
})

function ProfileSetupPage() {
    const router = useRouter()
    const { redirect } = Route.useSearch()
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
                    router.navigate({ to: '/login', search: { redirect: undefined } })
                    return
                }

                const data = await response.json()

                if (data.needsLogin) {
                    router.navigate({ to: '/login', search: { redirect: undefined } })
                    return
                }

                if (data.onboardingComplete) {
                    router.navigate({ to: '/app/trips' })
                    return
                }

                setLoading(false)
            } catch (error) {
                console.error('Onboarding check failed:', error)
                router.navigate({ to: '/login', search: { redirect: undefined } })
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

            if (redirect) {
                await router.navigate({ to: redirect as any })
            } else {
                await router.navigate({ to: '/app/trips' })
            }
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
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-cyan-600 to-teal-800 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-linear-to-br from-cyan-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg mb-4 rotate-3">
                        <span className="text-2xl">👤</span>
                    </div>
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400">
                        ตั้งค่าโปรไฟล์
                    </CardTitle>
                    <CardDescription>
                        ระบุชื่อและ QR รับเงินของคุณเพื่อให้เพื่อนจ่ายเงินให้คุณได้สะดวก
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-sm font-medium">ชื่อเล่น (Display Name)</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="เช่น น้องเอ (e.g. Alice)"
                                required
                                className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 py-6 text-lg"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">QR รับเงิน (PromptPay QR)</Label>
                            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative overflow-hidden group ${qrStatus === 'SUCCESS'
                                ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20'
                                : 'border-gray-300 dark:border-gray-700 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20'
                                }`}>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleFileChange}
                                />
                                <div className="space-y-3 pointer-events-none relative z-0">
                                    <div className={`text-4xl transition-transform duration-300 ${qrStatus === 'READING' ? 'animate-pulse' : 'group-hover:scale-110'}`}>
                                        {qrStatus === 'SUCCESS' ? '✅' : '📸'}
                                    </div>
                                    <div className="text-sm">
                                        {qrStatus === 'IDLE' && (
                                            <span className="text-gray-500">แตะเพื่ออัพโหลดรูป QR PromptPay ของคุณ</span>
                                        )}
                                        {qrStatus === 'READING' && (
                                            <span className="text-cyan-600 font-medium">กำลังอ่านข้อมูล...</span>
                                        )}
                                        {qrStatus === 'SUCCESS' && (
                                            <div className="text-green-600">
                                                <div className="font-bold">อ่านข้อมูลสำเร็จ!</div>
                                                <div className="text-xs mt-1 opacity-80 backdrop-blur-sm p-1 rounded">
                                                    ID: {scannedId} ({scannedType})
                                                </div>
                                            </div>
                                        )}
                                        {qrStatus === 'ERROR' && (
                                            <span className="text-red-500 font-medium">อ่านไม่สำเร็จ กรุณาลองใหม่</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full text-lg py-6 bg-linear-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 rounded-xl"
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
