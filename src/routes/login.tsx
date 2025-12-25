import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card'

export const Route = createFileRoute('/login')({
    component: LoginPage,
    validateSearch: (search: Record<string, unknown>) => ({
        redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    }),
})

function LoginPage() {
    const router = useRouter()
    const { redirect } = useSearch({ from: '/login' })

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const phoneNumber = formData.get('phoneNumber') as string

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber }),
            })

            if (!response.ok) {
                throw new Error('Login failed')
            }

            router.invalidate()

            // If there's a redirect URL, go there; otherwise go to profile setup
            if (redirect) {
                await router.navigate({ to: redirect as any })
            } else {
                await router.navigate({ to: '/profile/setup' })
            }
        } catch (error) {
            console.error('Login failed', error)
            alert('Login failed. Please try again.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-cyan-600 to-teal-800 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <CardHeader className="space-y-3 text-center pb-8">
                    <div className="mx-auto w-16 h-16 bg-linear-to-br from-cyan-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg mb-2 rotate-3 hover:rotate-6 transition-transform">
                        <span className="text-3xl">🗺️</span>
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400">
                            TangMa
                        </CardTitle>
                        <CardDescription className="text-base mt-2">
                            หารค่าใช้จ่ายทริปเที่ยว แบบง่ายๆ
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-sm font-medium">เบอร์โทรศัพท์ (Phone Number)</Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                placeholder="081 234 5678"
                                required
                                className="text-lg py-6 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:ring-cyan-500 transition-all text-center tracking-wider"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full text-lg py-6 bg-linear-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
                        >
                            เข้าสู่ระบบ (Continue)
                        </Button>
                        <p className="text-xs text-center text-gray-400 mt-4">
                            ระบบจะสร้างบัญชีให้เมื่อเข้าสู่ระบบครั้งแรก
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
