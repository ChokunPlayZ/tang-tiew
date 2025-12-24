import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { AppNavbar } from '../../components/AppNavbar'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { User, Phone, CreditCard, Save, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

type UserProfile = {
    id: number
    displayName: string | null
    phoneNumber: string
    promptPayId: string | null
    promptPayType: string | null
}

export const Route = createFileRoute('/app/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [displayName, setDisplayName] = useState('')
    const [promptPayId, setPromptPayId] = useState('')
    const [promptPayType, setPromptPayType] = useState<'PHONE' | 'NATIONAL_ID' | 'EWALLET'>('PHONE')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        async function loadProfile() {
            try {
                const response = await fetch('/api/profile', {
                    credentials: 'include',
                })
                if (!response.ok) {
                    router.navigate({ to: '/login' })
                    return
                }
                const data = await response.json()
                setProfile(data)
                setDisplayName(data.displayName || '')
                setPromptPayId(data.promptPayId || '')
                setPromptPayType(data.promptPayType || 'PHONE')
            } catch (error) {
                console.error('Failed to load profile:', error)
            } finally {
                setLoading(false)
            }
        }
        loadProfile()
    }, [router])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            const response = await fetch('/api/profile/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    displayName: displayName.trim(),
                    promptPayId: promptPayId.trim() || null,
                    promptPayType: promptPayId.trim() ? promptPayType : null,
                }),
            })

            if (response.ok) {
                setMessage({ type: 'success', text: 'บันทึกเรียบร้อยแล้ว!' })
            } else {
                setMessage({ type: 'error', text: 'ไม่สามารถบันทึกได้ กรุณาลองใหม่' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาด' })
        } finally {
            setSaving(false)
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <AppNavbar />

            <div className="max-w-lg mx-auto p-4 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link to="/app/trips">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">ตั้งค่าบัญชี</h1>
                </div>

                {/* Profile Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User size={20} />
                            ข้อมูลส่วนตัว
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อที่แสดง</Label>
                            <Input
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="ชื่อเล่น"
                            />
                            <p className="text-xs text-gray-500">ชื่อนี้จะแสดงให้เพื่อนร่วมทริปเห็น</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Phone size={14} />
                                เบอร์โทรศัพท์
                            </Label>
                            <Input
                                value={profile?.phoneNumber || ''}
                                disabled
                                className="bg-gray-100 dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500">ไม่สามารถเปลี่ยนเบอร์โทรได้</p>
                        </div>
                    </CardContent>
                </Card>

                {/* PromptPay Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard size={20} />
                            PromptPay (พร้อมเพย์)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-gray-500">
                            ตั้งค่า PromptPay เพื่อให้เพื่อนสามารถสแกน QR โอนเงินให้คุณได้
                        </p>

                        <div className="space-y-2">
                            <Label>ประเภท PromptPay</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={promptPayType === 'PHONE' ? 'default' : 'outline'}
                                    onClick={() => setPromptPayType('PHONE')}
                                >
                                    เบอร์โทร
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={promptPayType === 'NATIONAL_ID' ? 'default' : 'outline'}
                                    onClick={() => setPromptPayType('NATIONAL_ID')}
                                >
                                    บัตรประชาชน
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={promptPayType === 'EWALLET' ? 'default' : 'outline'}
                                    onClick={() => setPromptPayType('EWALLET')}
                                >
                                    E-Wallet
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {promptPayType === 'PHONE' && 'เบอร์โทร PromptPay'}
                                {promptPayType === 'NATIONAL_ID' && 'เลขบัตรประชาชน'}
                                {promptPayType === 'EWALLET' && 'E-Wallet ID'}
                            </Label>
                            <Input
                                value={promptPayId}
                                onChange={(e) => setPromptPayId(e.target.value)}
                                placeholder={
                                    promptPayType === 'PHONE' ? '08XXXXXXXX' :
                                        promptPayType === 'NATIONAL_ID' ? '1XXXXXXXXXXXX' :
                                            'E-Wallet ID'
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Message */}
                {message && (
                    <div className={`p-3 rounded-lg text-center ${message.type === 'success'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    className="w-full bg-cyan-600 gap-2"
                    disabled={saving}
                >
                    <Save size={16} />
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </Button>
            </div>
        </div>
    )
}
