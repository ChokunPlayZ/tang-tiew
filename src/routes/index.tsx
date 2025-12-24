import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.authenticated) {
            router.navigate({ to: '/app/trips' })
            return
          }
        }

        router.navigate({ to: '/login' })
      } catch (error) {
        console.error('Auth check failed:', error)
        router.navigate({ to: '/login' })
      } finally {
        setChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">กำลังตรวจสอบ...</div>
      </div>
    )
  }

  return null
}
