'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { authAPI, User, saathiAPI, trustScoreAPI, TrustScore, SaathiBalance } from '@/lib/api'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
    user: User | null
    trustScore: TrustScore | null
    saathiBalance: SaathiBalance | null
    isLoading: boolean
    isAuthenticated: boolean
    login: (phone: string, otp: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
    refreshTrustScore: () => Promise<void>
    refreshSaathiBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [trustScore, setTrustScore] = useState<TrustScore | null>(null)
    const [saathiBalance, setSaathiBalance] = useState<SaathiBalance | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    const refreshUser = useCallback(async () => {
        try {
            const profile = await authAPI.getProfile()
            setUser(profile)
            localStorage.setItem('kredefy_user', JSON.stringify(profile))
        } catch (error) {
            console.error('Failed to refresh user:', error)
        }
    }, [])

    const refreshTrustScore = useCallback(async () => {
        try {
            const score = await trustScoreAPI.getBharosaMeter()
            setTrustScore(score)
        } catch (error) {
            console.error('Failed to refresh trust score:', error)
        }
    }, [])

    const refreshSaathiBalance = useCallback(async () => {
        try {
            const balance = await saathiAPI.getBalance()
            setSaathiBalance(balance)
        } catch (error) {
            console.error('Failed to refresh SAATHI balance:', error)
        }
    }, [])

    // Initialize auth state on mount ONLY
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('kredefy_token')
            const storedUser = localStorage.getItem('kredefy_user')

            if (token && storedUser) {
                try {
                    // Set stored user immediately for fast UI
                    setUser(JSON.parse(storedUser))

                    // Verify token is still valid by fetching fresh profile
                    const [profile, score, balance] = await Promise.all([
                        authAPI.getProfile(),
                        trustScoreAPI.getBharosaMeter().catch(() => null),
                        saathiAPI.getBalance().catch(() => null),
                    ])

                    setUser(profile)
                    setTrustScore(score)
                    setSaathiBalance(balance)
                    localStorage.setItem('kredefy_user', JSON.stringify(profile))
                } catch (error) {
                    // Token invalid, clear storage
                    localStorage.removeItem('kredefy_token')
                    localStorage.removeItem('kredefy_user')
                    setUser(null)
                }
            }
            setIsLoading(false)
        }

        initAuth()
    }, []) // Run only on mount!

    // REMOVED: Redirect logic that was causing infinite loops
    // Pages now handle their own auth via useRequireAuth hook

    const login = async (phone: string, otp: string) => {
        const { token, user: userData } = await authAPI.verifyOTP(phone, otp)
        setUser(userData)

        // Fetch additional data
        const [score, balance] = await Promise.all([
            trustScoreAPI.getBharosaMeter().catch(() => null),
            saathiAPI.getBalance().catch(() => null),
        ])

        setTrustScore(score)
        setSaathiBalance(balance)

        router.push('/')
    }

    const logout = () => {
        setUser(null)
        setTrustScore(null)
        setSaathiBalance(null)
        authAPI.logout()
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                trustScore,
                saathiBalance,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                refreshUser,
                refreshTrustScore,
                refreshSaathiBalance,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

// Hook for protected routes
export function useRequireAuth() {
    const { user, isLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/landing')
        }
    }, [isLoading, isAuthenticated, router])

    return { user, isLoading, isAuthenticated }
}
