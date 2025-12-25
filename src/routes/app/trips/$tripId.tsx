import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { ArrowLeft, Plus, Users, Receipt, Wallet, ChevronRight, Check, Upload, X, History, ImageIcon, ArrowRight, Trash2 } from 'lucide-react'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'
import { ShareTripDialog } from '../../../components/trips/ShareTripDialog'

type Member = {
    id: number
    userId: number
    displayName: string | null
    joinedAt: string
}

type SubGroup = {
    id: number
    name: string
    members: { userId: number; displayName: string | null }[]
}

type Trip = {
    id: number
    name: string
    code: string
    createdBy: number
    createdAt: string
}

type Expense = {
    id: number
    title: string
    amount: string
    splitType: string
    createdAt: string
    paidByUserId: number
    paidByName: string | null
    shares: { userId: number; owesAmount: string; userName: string | null }[]
    slipUrl: string | null
}

type Balance = {
    fromUserId: number
    fromUserName: string | null
    toUserId: number
    toUserName: string | null
    toPromptPayId: string | null
    toPromptPayType: string | null
    amount: number
}

type Payment = {
    id: number
    fromUserId: number
    fromUserName: string
    toUserId: number
    toUserName: string
    amount: string
    slipUrl: string | null
    status: string
    createdAt: string
}

export const Route = createFileRoute('/app/trips/$tripId')({
    component: TripDetailPage,
})

function TripDetailPage() {
    const { tripId } = Route.useParams()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [trip, setTrip] = useState<Trip | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [subGroups, setSubGroups] = useState<SubGroup[]>([])
    const [currentUserId, setCurrentUserId] = useState<number | null>(null)
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [balances, setBalances] = useState<Balance[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [activeTab, setActiveTab] = useState('members')

    const loadTripData = async () => {
        try {
            const response = await fetch(`/api/trips/${tripId}`, {
                credentials: 'include',
            })

            if (!response.ok) {
                router.navigate({ to: '/app/trips' })
                return
            }

            const data = await response.json()
            setTrip(data.trip)
            setMembers(data.members)
            setSubGroups(data.subGroups)
            setCurrentUserId(data.currentUserId)
        } catch (error) {
            console.error('Failed to load trip:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadExpenses = async () => {
        const response = await fetch(`/api/trips/${tripId}/expenses`, {
            credentials: 'include',
        })
        if (response.ok) {
            setExpenses(await response.json())
        }
    }

    const loadBalances = async () => {
        const response = await fetch(`/api/trips/${tripId}/balances`, {
            credentials: 'include',
        })
        if (response.ok) {
            const data = await response.json()
            setBalances(data.balances)
        }
    }

    const loadPayments = async () => {
        const response = await fetch(`/api/trips/${tripId}/payments`, {
            credentials: 'include',
        })
        if (response.ok) {
            setPayments(await response.json())
        }
    }

    useEffect(() => {
        loadTripData()
    }, [tripId])

    useEffect(() => {
        if (activeTab === 'expenses') loadExpenses()
        if (activeTab === 'balances') loadBalances()
        if (activeTab === 'payments') loadPayments()
    }, [activeTab])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">กำลังโหลด...</div>
            </div>
        )
    }

    if (!trip) return null

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="border-b sticky top-0 z-10 shadow-sm/50 backdrop-blur-md bg-white/80 dark:bg-gray-800/80 supports-backdrop-filter:bg-white/60">
                <div className="max-w-2xl mx-auto p-4 flex items-center gap-4">
                    <Link to="/app/trips">
                        <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate bg-clip-text text-transparent bg-linear-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                            {trip.name}
                        </h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-xs">#{trip.code}</span>
                        </p>
                    </div>
                    <ShareTripDialog tripCode={trip.code} tripName={trip.name} />
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="members" className="gap-1 text-xs">
                            <Users size={14} /> สมาชิก
                        </TabsTrigger>
                        <TabsTrigger value="expenses" className="gap-1 text-xs">
                            <Receipt size={14} /> รายจ่าย
                        </TabsTrigger>
                        <TabsTrigger value="balances" className="gap-1 text-xs">
                            <Wallet size={14} /> สรุป
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="gap-1 text-xs">
                            <History size={14} /> ประวัติ
                        </TabsTrigger>
                    </TabsList>

                    {/* Members Tab */}
                    <TabsContent value="members" className="space-y-4 mt-4">
                        <MembersTab
                            members={members}
                            subGroups={subGroups}
                            currentUserId={currentUserId}
                            tripId={tripId}
                            createdBy={trip.createdBy}
                            onUpdate={loadTripData}
                        />
                    </TabsContent>

                    {/* Expenses Tab */}
                    <TabsContent value="expenses" className="space-y-4 mt-4">
                        <ExpensesTab
                            expenses={expenses}
                            members={members}
                            subGroups={subGroups}
                            tripId={tripId}
                            currentUserId={currentUserId}
                            onUpdate={loadExpenses}
                        />
                    </TabsContent>

                    {/* Balances Tab */}
                    <TabsContent value="balances" className="space-y-4 mt-4">
                        <BalancesTab
                            balances={balances}
                            currentUserId={currentUserId}
                            tripId={tripId}
                            onUpdate={loadBalances}
                        />
                    </TabsContent>

                    {/* Payments History Tab */}
                    <TabsContent value="payments" className="space-y-4 mt-4">
                        <PaymentsTab payments={payments} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Members Tab Component
// ─────────────────────────────────────────────────────────────────────────────

function MembersTab({
    members,
    subGroups,
    currentUserId,
    tripId,
    createdBy,
    onUpdate
}: {
    members: Member[]
    subGroups: SubGroup[]
    currentUserId: number | null
    tripId: string
    createdBy: number
    onUpdate: () => void
}) {
    const [newGroupName, setNewGroupName] = useState('')
    const [groupError, setGroupError] = useState('')
    const [isAddingGroup, setIsAddingGroup] = useState(false)

    // Import Trash2 if not capable of modifying import statement directly, I'll assume lucide-react has it or I'll use X for now and update import later.
    // Actually, I can use X or Minus, but let's try Trash2. If it fails I'll fix it. 
    // Wait, I can't easily change the top import. I'll use `X` or `LogOut` or just text for now.
    // Ah, I can instruct to change the import at the top too.

    // For now, let's assume I'll use a `Button` with "Kick" text or a generic icon available. `Users` -> `UserMinus`?
    // Let's use `Trash2` but I need to ensure it's imported.
    // I will add another replace_file_content call to add Trash2 to imports.

    const handleKick = async (userId: number, userName: string) => {
        if (!confirm(`ต้องการลบ ${userName} ออกจากทริปใช่หรือไม่?`)) return

        try {
            const response = await fetch(`/api/trips/${tripId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            if (!response.ok) {
                const data = await response.json()
                alert(data.error || 'Failed to remove member')
                return
            }
            onUpdate()
        } catch (error) {
            alert('เกิดข้อผิดพลาด')
        }
    }

    const handleAddGroup = async () => {
        setGroupError('')
        if (!newGroupName.trim()) {
            setGroupError('กรุณาใส่ชื่อกลุ่ม')
            return
        }
        if (newGroupName.length > 50) {
            setGroupError('ชื่อกลุ่มยาวเกินไป (ไม่เกิน 50 ตัวอักษร)')
            return
        }

        try {
            const response = await fetch(`/api/trips/${tripId}/subgroups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newGroupName.trim() }),
            })

            if (!response.ok) {
                const data = await response.json()
                setGroupError(data.error || 'Failed to create group')
                return
            }

            setNewGroupName('')
            setIsAddingGroup(false)
            onUpdate()
        } catch (error) {
            setGroupError('เกิดข้อผิดพลาด')
        }
    }

    const handleJoinGroup = async (subGroupId: number, action: 'join' | 'leave') => {
        try {
            await fetch(`/api/trips/${tripId}/subgroups/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subGroupId, action }),
            })
            onUpdate()
        } catch (error) {
            console.error('Failed to update group membership:', error)
        }
    }

    const isOwner = currentUserId === createdBy

    return (
        <>
            {/* Members List */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">สมาชิก ({members.length} คน)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0 group">
                            <div className="font-medium flex items-center gap-2">
                                {member.displayName || 'ไม่ระบุชื่อ'}
                                {member.userId === createdBy && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Owner</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {member.userId === currentUserId && (
                                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">คุณ</span>
                                )}
                                {isOwner && member.userId !== currentUserId && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleKick(member.userId, member.displayName || 'สมาชิก')}
                                        title="ลบออกจากทริป"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* SubGroups */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">กลุ่มย่อย</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setIsAddingGroup(!isAddingGroup)}>
                            <Plus size={14} className="mr-1" /> เพิ่มกลุ่ม
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isAddingGroup && (
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <Label>ชื่อกลุ่ม (เช่น รถคัน A, คนดื่ม)</Label>
                            <Input
                                value={newGroupName}
                                onChange={(e) => {
                                    setNewGroupName(e.target.value)
                                    setGroupError('')
                                }}
                                placeholder="ชื่อกลุ่ม..."
                                maxLength={50}
                            />
                            {groupError && <p className="text-sm text-red-500">{groupError}</p>}
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleAddGroup}>สร้าง</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingGroup(false)}>ยกเลิก</Button>
                            </div>
                        </div>
                    )}

                    {subGroups.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">ยังไม่มีกลุ่มย่อย</p>
                    ) : (
                        <div className="space-y-3">
                            {subGroups.map(sg => {
                                const isMember = sg.members.some(m => m.userId === currentUserId)
                                return (
                                    <div key={sg.id} className="border rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">{sg.name}</span>
                                            <Button
                                                size="sm"
                                                variant={isMember ? 'default' : 'outline'}
                                                onClick={() => handleJoinGroup(sg.id, isMember ? 'leave' : 'join')}
                                            >
                                                {isMember ? (
                                                    <><Check size={14} className="mr-1" /> อยู่ในกลุ่ม</>
                                                ) : (
                                                    <><Plus size={14} className="mr-1" /> เข้าร่วม</>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {sg.members.map(m => (
                                                <span key={m.userId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {m.displayName || 'ไม่ระบุชื่อ'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Expenses Tab Component
// ─────────────────────────────────────────────────────────────────────────────

function ExpensesTab({
    expenses,
    members,
    subGroups,
    tripId,
    currentUserId,
    onUpdate
}: {
    expenses: Expense[]
    members: Member[]
    subGroups: SubGroup[]
    tripId: string
    currentUserId: number | null
    onUpdate: () => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [paidBy, setPaidBy] = useState<number | null>(currentUserId)
    const [splitTarget, setSplitTarget] = useState<'ALL' | 'GROUP'>('ALL')
    const [splitGroupId, setSplitGroupId] = useState<number | null>(null)
    const [slipFile, setSlipFile] = useState<File | null>(null)
    const [slipPreview, setSlipPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Calculate how many people will share based on current selection
    const getShareCount = () => {
        if (splitTarget === 'ALL') return members.length
        if (splitTarget === 'GROUP' && splitGroupId) {
            const group = subGroups.find(g => g.id === splitGroupId)
            return group?.members.length || 0
        }
        return 0
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!title.trim()) newErrors.title = 'กรุณาใส่รายการ'
        if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'กรุณาใส่จำนวนเงินที่ถูกต้อง'
        if (!paidBy) newErrors.paidBy = 'กรุณาเลือกคนจ่าย'
        if (splitTarget === 'GROUP' && !splitGroupId) newErrors.splitTarget = 'กรุณาเลือกกลุ่ม'
        if (getShareCount() === 0) newErrors.splitTarget = 'กลุ่มที่เลือกยังไม่มีสมาชิก'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleAddExpense = async () => {
        if (!validate()) return

        setIsUploading(true)
        try {
            // Upload slip if provided
            let slipUrl: string | undefined
            if (slipFile) {
                const formData = new FormData()
                formData.append('file', slipFile)
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })
                if (uploadRes.ok) {
                    const { url } = await uploadRes.json()
                    slipUrl = url
                }
            }

            const response = await fetch(`/api/trips/${tripId}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    amount: parseFloat(amount),
                    paidByUserId: paidBy,
                    splitType: 'EQUAL',
                    splitTarget,
                    splitGroupId: splitTarget === 'GROUP' ? splitGroupId : null,
                    slipUrl,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                setErrors({ submit: data.error || 'เกิดข้อผิดพลาด' })
                return
            }

            // Reset form
            setTitle('')
            setAmount('')
            setPaidBy(currentUserId)
            setSplitTarget('ALL')
            setSplitGroupId(null)
            setSlipFile(null)
            setSlipPreview(null)
            setIsAdding(false)
            setErrors({})
            onUpdate()
        } catch (error) {
            setErrors({ submit: 'เกิดข้อผิดพลาด' })
        } finally {
            setIsUploading(false)
        }
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

    return (
        <>
            {/* Summary & Add Button */}
            <div className="flex items-center justify-between bg-linear-to-r from-cyan-50 to-teal-50 dark:from-cyan-950/30 dark:to-teal-950/30 p-4 rounded-2xl border border-cyan-100 dark:border-cyan-900/50 mb-6">
                <div>
                    <div className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-1">รวมค่าใช้จ่ายทั้งหมด</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">฿{totalExpenses.toLocaleString()}</div>
                </div>
                <Button onClick={() => setIsAdding(true)} className="bg-linear-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-lg shadow-cyan-500/20 gap-2 rounded-full px-6">
                    <Plus size={18} /> เพิ่มรายจ่าย
                </Button>
            </div>

            {/* Add Expense Dialog */}
            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>เพิ่มรายจ่าย</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>รายการ *</Label>
                            <Input
                                value={title}
                                onChange={(e) => {
                                    setTitle(e.target.value)
                                    setErrors({ ...errors, title: '' })
                                }}
                                placeholder="เช่น อาหารกลางวัน, ค่าน้ำมัน"
                            />
                            {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>จำนวนเงิน (บาท) *</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value)
                                    setErrors({ ...errors, amount: '' })
                                }}
                                placeholder="0.00"
                            />
                            {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>ใครจ่าย? *</Label>
                            <div className="flex flex-wrap gap-2">
                                {members.map(m => (
                                    <Button
                                        key={m.userId}
                                        size="sm"
                                        variant={paidBy === m.userId ? 'default' : 'outline'}
                                        onClick={() => {
                                            setPaidBy(m.userId)
                                            setErrors({ ...errors, paidBy: '' })
                                        }}
                                    >
                                        {m.displayName || 'สมาชิก'}
                                    </Button>
                                ))}
                            </div>
                            {errors.paidBy && <p className="text-sm text-red-500">{errors.paidBy}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>หารกับใคร? *</Label>
                            <p className="text-xs text-gray-500">เลือก "ทุกคน" หรือกลุ่มใดกลุ่มหนึ่ง - ถ้ามีคนเข้าร่วมทีหลังจะถูกคำนวณอัตโนมัติ</p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={splitTarget === 'ALL' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setSplitTarget('ALL')
                                        setSplitGroupId(null)
                                        setErrors({ ...errors, splitTarget: '' })
                                    }}
                                >
                                    <Users size={14} className="mr-1" />
                                    ทุกคน ({members.length})
                                </Button>
                                {subGroups.map(sg => (
                                    <Button
                                        key={sg.id}
                                        type="button"
                                        size="sm"
                                        variant={splitTarget === 'GROUP' && splitGroupId === sg.id ? 'default' : 'outline'}
                                        onClick={() => {
                                            setSplitTarget('GROUP')
                                            setSplitGroupId(sg.id)
                                            setErrors({ ...errors, splitTarget: '' })
                                        }}
                                        disabled={sg.members.length === 0}
                                    >
                                        {sg.name} ({sg.members.length})
                                    </Button>
                                ))}
                            </div>
                            {errors.splitTarget && <p className="text-sm text-red-500">{errors.splitTarget}</p>}
                            {amount && getShareCount() > 0 && (
                                <p className="text-sm text-gray-500">
                                    หารคนละ ฿{(parseFloat(amount) / getShareCount()).toFixed(2)}
                                </p>
                            )}
                        </div>

                        {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

                        {/* Slip Upload */}
                        <div className="space-y-2">
                            <Label>แนบสลิป/ใบเสร็จ (ไม่บังคับ)</Label>
                            {slipPreview ? (
                                <div className="relative inline-block">
                                    <img src={slipPreview} alt="Slip preview" className="max-h-32 rounded border" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSlipFile(null)
                                            setSlipPreview(null)
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-sm text-gray-500">เลือกรูปสลิป</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                setSlipFile(file)
                                                setSlipPreview(URL.createObjectURL(file))
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>ยกเลิก</Button>
                            <Button onClick={handleAddExpense} className="bg-cyan-600" disabled={isUploading}>
                                {isUploading ? 'กำลังบันทึก...' : 'บันทึก'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Expenses List */}
            {expenses.length === 0 ? (

                <div className="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Receipt size={32} className="text-gray-400" />
                    </div>
                    <p className="font-medium">ยังไม่มีรายจ่าย</p>
                    <p className="text-sm mt-1">เพิ่มรายจ่ายแรกของคุณเลย!</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {expenses.map(expense => (
                        <Card key={expense.id} className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-transparent hover:border-l-cyan-500 group">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center shrink-0">
                                            <Receipt size={18} className="text-cyan-600 dark:text-cyan-400" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                                {expense.title}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{expense.paidByName}</span>
                                                <span>•</span>
                                                <span>หาร {expense.shares.length} คน</span>
                                            </div>
                                            {expense.slipUrl && (
                                                <div className="flex items-center gap-1 text-xs text-cyan-600 mt-1">
                                                    <ImageIcon size={12} />
                                                    <span>มีสลิป</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                            ฿{parseFloat(expense.amount).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full inline-block mt-1">
                                            คนละ ฿{(parseFloat(expense.amount) / expense.shares.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Balances Tab Component
// ─────────────────────────────────────────────────────────────────────────────

function BalancesTab({
    balances,
    currentUserId,
    tripId,
    onUpdate
}: {
    balances: Balance[]
    currentUserId: number | null
    tripId: string
    onUpdate: () => void
}) {
    const myDebts = balances.filter(b => b.fromUserId === currentUserId)
    const owedToMe = balances.filter(b => b.toUserId === currentUserId)

    return (
        <>
            {/* What I owe */}
            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
                            <Wallet size={16} />
                        </div>
                        คุณต้องจ่าย
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myDebts.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed text-gray-400">
                            <p>ไม่มียอดค้างจ่าย 🎉</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myDebts.map((debt, i) => (
                                <PaymentCard key={i} debt={debt} tripId={tripId} onPaid={onUpdate} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* What others owe me */}
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-green-600 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                            <Wallet size={16} />
                        </div>
                        รอรับเงิน
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {owedToMe.length === 0 ? (
                        <div className="py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed text-gray-400">
                            <p>ไม่มียอดที่รอรับ</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {owedToMe.map((b, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                            {b.fromUserName?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-gray-700 dark:text-gray-200">{b.fromUserName}</span>
                                    </div>
                                    <span className="font-bold text-green-600">+฿{b.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Card with QR Generation
// ─────────────────────────────────────────────────────────────────────────────

function PaymentCard({
    debt,
    tripId,
    onPaid
}: {
    debt: Balance
    tripId: string
    onPaid: () => void
}) {
    const [showQR, setShowQR] = useState(false)
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
    const [isPaying, setIsPaying] = useState(false)
    const [slipFile, setSlipFile] = useState<File | null>(null)
    const [slipPreview, setSlipPreview] = useState<string | null>(null)

    const generateQR = async () => {
        if (!debt.toPromptPayId) {
            alert('ผู้รับยังไม่ได้ตั้งค่า PromptPay')
            return
        }

        try {
            // Generate PromptPay payload with amount
            const payload = generatePayload(debt.toPromptPayId, { amount: debt.amount })
            const url = await QRCode.toDataURL(payload, { width: 280 })
            setQrDataUrl(url)
            setShowQR(true)
        } catch (error) {
            console.error('Failed to generate QR:', error)
            alert('ไม่สามารถสร้าง QR ได้')
        }
    }

    const handleMarkPaid = async () => {
        setIsPaying(true)
        try {
            // Upload slip if provided
            let slipUrl: string | undefined
            if (slipFile) {
                const formData = new FormData()
                formData.append('file', slipFile)
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                })
                if (uploadRes.ok) {
                    const { url } = await uploadRes.json()
                    slipUrl = url
                }
            }

            const response = await fetch(`/api/trips/${tripId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toUserId: debt.toUserId,
                    amount: debt.amount,
                    slipUrl
                }),
            })

            if (response.ok) {
                setShowQR(false)
                setSlipFile(null)
                setSlipPreview(null)
                onPaid()
            }
        } catch (error) {
            console.error('Failed to record payment:', error)
        } finally {
            setIsPaying(false)
        }
    }

    return (
        <>
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                    <div className="font-medium">{debt.toUserName}</div>
                    <div className="text-2xl font-bold text-red-600">฿{debt.amount.toLocaleString()}</div>
                </div>
                <Button onClick={generateQR} className="bg-cyan-600">
                    จ่ายเงิน <ChevronRight size={16} />
                </Button>
            </div>

            {/* QR Dialog */}
            <Dialog open={showQR} onOpenChange={setShowQR}>
                <DialogContent className="text-center">
                    <DialogHeader>
                        <DialogTitle>จ่ายให้ {debt.toUserName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="text-3xl font-bold">฿{debt.amount.toLocaleString()}</div>
                        {qrDataUrl && (
                            <img src={qrDataUrl} alt="Payment QR" className="mx-auto" />
                        )}
                        <p className="text-sm text-gray-500">
                            สแกน QR เพื่อจ่ายเงิน จำนวนเงินจะถูกกรอกให้อัตโนมัติ
                        </p>

                        {/* Slip Upload */}
                        <div className="space-y-2 text-left">
                            <Label className="text-sm">แนบสลิปการโอน (ไม่บังคับ)</Label>
                            {slipPreview ? (
                                <div className="relative inline-block">
                                    <img src={slipPreview} alt="Slip" className="max-h-24 rounded border" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSlipFile(null)
                                            setSlipPreview(null)
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-cyan-500 transition-colors">
                                    <Upload size={16} className="text-gray-400" />
                                    <span className="text-sm text-gray-500">เลือกรูปสลิป</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                setSlipFile(file)
                                                setSlipPreview(URL.createObjectURL(file))
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>

                        <Button onClick={handleMarkPaid} className="w-full" disabled={isPaying}>
                            {isPaying ? 'กำลังบันทึก...' : 'จ่ายแล้ว ✓'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments History Tab Component
// ─────────────────────────────────────────────────────────────────────────────

function PaymentsTab({ payments }: { payments: Payment[] }) {
    const [selectedSlip, setSelectedSlip] = useState<string | null>(null)

    if (payments.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-gray-500">
                    ยังไม่มีประวัติการชำระเงิน
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History size={20} className="text-cyan-600" />
                        ประวัติการชำระเงิน
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                    {payments.map(payment => (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:shadow-sm transition-shadow border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{payment.fromUserName}</span>
                                    <ArrowRight size={14} className="text-gray-400" />
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">{payment.toUserName}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-lg font-bold text-green-600">
                                        ฿{parseFloat(payment.amount).toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {new Date(payment.createdAt).toLocaleDateString('th-TH', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            </div>
                            {payment.slipUrl && (
                                <button
                                    onClick={() => setSelectedSlip(payment.slipUrl)}
                                    className="p-2 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-colors"
                                >
                                    <ImageIcon size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                </CardContent>
                {/* Slip Viewer Dialog */}
                <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>สลิปการโอนเงิน</DialogTitle>
                        </DialogHeader>
                        {selectedSlip && (
                            <img
                                src={selectedSlip}
                                alt="Payment slip"
                                className="w-full rounded-lg"
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </Card>
        </>
    )
}

