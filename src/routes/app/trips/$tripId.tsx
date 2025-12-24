import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { ArrowLeft, Plus, Users, Receipt, Wallet, ChevronRight, Check } from 'lucide-react'
import generatePayload from 'promptpay-qr'
import QRCode from 'qrcode'

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

    useEffect(() => {
        loadTripData()
    }, [tripId])

    useEffect(() => {
        if (activeTab === 'expenses') loadExpenses()
        if (activeTab === 'balances') loadBalances()
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
            <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
                <div className="max-w-2xl mx-auto p-4 flex items-center gap-4">
                    <Link to="/app/trips">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft size={20} />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">{trip.name}</h1>
                        <p className="text-sm text-gray-500">รหัส: {trip.code}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="members" className="gap-2">
                            <Users size={16} /> สมาชิก
                        </TabsTrigger>
                        <TabsTrigger value="expenses" className="gap-2">
                            <Receipt size={16} /> รายจ่าย
                        </TabsTrigger>
                        <TabsTrigger value="balances" className="gap-2">
                            <Wallet size={16} /> สรุป
                        </TabsTrigger>
                    </TabsList>

                    {/* Members Tab */}
                    <TabsContent value="members" className="space-y-4 mt-4">
                        <MembersTab
                            members={members}
                            subGroups={subGroups}
                            currentUserId={currentUserId}
                            tripId={tripId}
                            onUpdate={loadTripData}
                        />
                    </TabsContent>

                    {/* Expenses Tab */}
                    <TabsContent value="expenses" className="space-y-4 mt-4">
                        <ExpensesTab
                            expenses={expenses}
                            members={members}
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
    onUpdate
}: {
    members: Member[]
    subGroups: SubGroup[]
    currentUserId: number | null
    tripId: string
    onUpdate: () => void
}) {
    const [newGroupName, setNewGroupName] = useState('')
    const [groupError, setGroupError] = useState('')
    const [isAddingGroup, setIsAddingGroup] = useState(false)

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

    return (
        <>
            {/* Members List */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">สมาชิก ({members.length} คน)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {members.map(member => (
                        <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div className="font-medium">
                                {member.displayName || 'ไม่ระบุชื่อ'}
                            </div>
                            {member.userId === currentUserId && (
                                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">คุณ</span>
                            )}
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
    tripId,
    currentUserId,
    onUpdate
}: {
    expenses: Expense[]
    members: Member[]
    tripId: string
    currentUserId: number | null
    onUpdate: () => void
}) {
    const [isAdding, setIsAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [paidBy, setPaidBy] = useState<number | null>(currentUserId)
    const [splitWith, setSplitWith] = useState<number[]>(members.map(m => m.userId))
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (!title.trim()) newErrors.title = 'กรุณาใส่รายการ'
        if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'กรุณาใส่จำนวนเงินที่ถูกต้อง'
        if (!paidBy) newErrors.paidBy = 'กรุณาเลือกคนจ่าย'
        if (splitWith.length === 0) newErrors.splitWith = 'กรุณาเลือกคนที่จะหาร'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleAddExpense = async () => {
        if (!validate()) return

        try {
            const response = await fetch(`/api/trips/${tripId}/expenses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    amount: parseFloat(amount),
                    paidByUserId: paidBy,
                    splitType: 'EQUAL',
                    splitWith: splitWith.map(userId => ({ userId }))
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
            setSplitWith(members.map(m => m.userId))
            setIsAdding(false)
            setErrors({})
            onUpdate()
        } catch (error) {
            setErrors({ submit: 'เกิดข้อผิดพลาด' })
        }
    }

    const toggleSplitWith = (userId: number) => {
        if (splitWith.includes(userId)) {
            setSplitWith(splitWith.filter(id => id !== userId))
        } else {
            setSplitWith([...splitWith, userId])
        }
        setErrors({ ...errors, splitWith: '' })
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

    return (
        <>
            {/* Summary & Add Button */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-gray-500">รวมทั้งหมด</div>
                    <div className="text-2xl font-bold">฿{totalExpenses.toLocaleString()}</div>
                </div>
                <Button onClick={() => setIsAdding(true)} className="bg-cyan-600 gap-2">
                    <Plus size={16} /> เพิ่มรายจ่าย
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
                            <div className="flex flex-wrap gap-2">
                                {members.map(m => (
                                    <Button
                                        key={m.userId}
                                        size="sm"
                                        variant={splitWith.includes(m.userId) ? 'default' : 'outline'}
                                        onClick={() => toggleSplitWith(m.userId)}
                                    >
                                        {splitWith.includes(m.userId) && <Check size={14} className="mr-1" />}
                                        {m.displayName || 'สมาชิก'}
                                    </Button>
                                ))}
                            </div>
                            {errors.splitWith && <p className="text-sm text-red-500">{errors.splitWith}</p>}
                            {splitWith.length > 0 && amount && (
                                <p className="text-sm text-gray-500">
                                    หารคนละ ฿{(parseFloat(amount) / splitWith.length).toFixed(2)}
                                </p>
                            )}
                        </div>

                        {errors.submit && <p className="text-sm text-red-500">{errors.submit}</p>}

                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" onClick={() => setIsAdding(false)}>ยกเลิก</Button>
                            <Button onClick={handleAddExpense} className="bg-cyan-600">บันทึก</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Expenses List */}
            {expenses.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-gray-500">
                        <Receipt size={40} className="mx-auto mb-2 opacity-50" />
                        <p>ยังไม่มีรายจ่าย</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {expenses.map(expense => (
                        <Card key={expense.id}>
                            <CardContent className="py-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{expense.title}</div>
                                        <div className="text-sm text-gray-500">
                                            จ่ายโดย {expense.paidByName} • หาร {expense.shares.length} คน
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">฿{parseFloat(expense.amount).toLocaleString()}</div>
                                        <div className="text-xs text-gray-500">
                                            คนละ ฿{(parseFloat(expense.amount) / expense.shares.length).toFixed(2)}
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
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-red-600">คุณต้องจ่าย</CardTitle>
                </CardHeader>
                <CardContent>
                    {myDebts.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">ไม่มียอดค้างจ่าย 🎉</p>
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
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-green-600">รอรับเงิน</CardTitle>
                </CardHeader>
                <CardContent>
                    {owedToMe.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">ไม่มียอดที่รอรับ</p>
                    ) : (
                        <div className="space-y-2">
                            {owedToMe.map((b, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <span>{b.fromUserName}</span>
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

    const generateQR = async () => {
        if (!debt.toPromptPayId) return

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
            const response = await fetch(`/api/trips/${tripId}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toUserId: debt.toUserId,
                    amount: debt.amount
                }),
            })

            if (response.ok) {
                setShowQR(false)
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
                        <Button onClick={handleMarkPaid} className="w-full" disabled={isPaying}>
                            {isPaying ? 'กำลังบันทึก...' : 'จ่ายแล้ว ✓'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
