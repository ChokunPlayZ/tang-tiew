import { Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTheme } from './ThemeProvider'
import {
    User,
    Settings,
    LogOut,
    ChevronDown,
    Map,
    Sun,
    Moon
} from 'lucide-react'

type UserInfo = {
    id: number
    displayName: string | null
    phoneNumber: string
}

export function AppNavbar() {
    const router = useRouter()
    const { theme, toggleTheme } = useTheme()
    const [user, setUser] = useState<UserInfo | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
        async function loadUser() {
            try {
                const response = await fetch('/api/auth/check', {
                    credentials: 'include',
                })
                if (response.ok) {
                    const data = await response.json()
                    if (data.authenticated) {
                        setUser(data.user)
                    }
                }
            } catch (error) {
                console.error('Failed to load user:', error)
            }
        }
        loadUser()
    }, [])

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            })
            router.navigate({ to: '/login' })
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    return (
        <header className="sticky top-0 z-40 bg-linear-to-r from-cyan-600 to-teal-600 text-white shadow-lg">
            <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo / Brand */}
                    <Link to="/app/trips" className="flex items-center gap-2 font-bold text-xl">
                        <Map size={24} />
                        <span>TangTiew</span>
                    </Link>

                    {/* Right Side: Theme Toggle + User Menu */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <User size={18} />
                                </div>
                                <span className="hidden sm:block max-w-[120px] truncate">
                                    {user?.displayName || 'ผู้ใช้'}
                                </span>
                                <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setIsMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                                        {/* User Info */}
                                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {user?.displayName || 'ไม่ระบุชื่อ'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {user?.phoneNumber}
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            <Link
                                                to="/app/settings"
                                                onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                            >
                                                <Settings size={18} />
                                                <span>ตั้งค่า</span>
                                            </Link>
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-gray-100 dark:border-gray-700 py-1">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2 w-full text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <LogOut size={18} />
                                                <span>ออกจากระบบ</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
