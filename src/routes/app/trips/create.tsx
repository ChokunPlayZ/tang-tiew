import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

export const Route = createFileRoute('/app/trips/create')({
  component: CreateTripPage
})

function CreateTripPage() {
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const name = formData.get('name') as string

    try {
      const response = await fetch('/api/trips/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        throw new Error('Failed to create trip')
      }

      const trip = await response.json()
      await router.navigate({ to: `/app/trips/${trip.id}` as any })
    } catch (error) {
      console.error(error)
      alert("Failed to create trip")
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>สร้างทริปใหม่ (Create Trip)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">ชื่อทริป (Trip Name)</Label>
              <Input id="name" name="name" placeholder="ไปเที่ยวภูเขา ⛰️" required />
            </div>
            <Button type="submit" className="w-full bg-cyan-600">สร้างทริป (Create)</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
