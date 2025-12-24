import { createFileRoute, useRouter } from '@tanstack/react-router'
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
})

function LoginPage() {
    const router = useRouter()

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
            await router.navigate({ to: '/profile/setup' })
        } catch (error) {
            console.error('Login failed', error)
            alert('Login failed. Please try again.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md shadow-xl border-0">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        เข้าสู่ระบบ / Login
                    </CardTitle>
                    <CardDescription className="text-center">
                        ใช้เบอร์โทรศัพท์เพื่อเข้าใช้งาน
                        <br />
                        Enter your phone number to continue
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">เบอร์โทรศัพท์ (Phone Number)</Label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                placeholder="0812345678"
                                required
                                className="text-lg py-6"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full text-lg py-6 bg-cyan-600 hover:bg-cyan-700"
                        >
                            เข้าสู่ระบบ (Continue)
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
