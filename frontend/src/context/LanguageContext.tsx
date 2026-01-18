'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// Import translations
import en from '@/locales/en.json'
import hi from '@/locales/hi.json'
import ml from '@/locales/ml.json'

const translations: Record<string, any> = { en, hi, ml }

export type Language = 'en' | 'hi' | 'ml'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
    languageOptions: { value: Language; label: string; nativeLabel: string }[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const languageOptions: { value: Language; label: string; nativeLabel: string }[] = [
    { value: 'en', label: 'English', nativeLabel: 'English' },
    { value: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
    { value: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
]

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>('en')

    // Load language from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('kredefy_language') as Language
        if (stored && translations[stored]) {
            setLanguageState(stored)
        }
    }, [])

    // Save to localStorage and sync with backend when changed
    const setLanguage = useCallback(async (lang: Language) => {
        setLanguageState(lang)
        localStorage.setItem('kredefy_language', lang)

        // Sync with backend if user is logged in
        try {
            const { authAPI } = await import('@/lib/api')
            if (authAPI.isAuthenticated()) {
                await authAPI.updateProfile({ language: lang })
                console.log(`Language synced with backend: ${lang}`)
            }
        } catch (error) {
            console.error('Failed to sync language with backend:', error)
        }
    }, [])

    // Translation function with nested key support (e.g., "landing.hero.title")
    const t = useCallback((key: string): string => {
        const keys = key.split('.')
        let value: any = translations[language]

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                // Fallback to English
                value = translations['en']
                for (const k2 of keys) {
                    if (value && typeof value === 'object' && k2 in value) {
                        value = value[k2]
                    } else {
                        return key // Return key if not found
                    }
                }
                break
            }
        }

        return typeof value === 'string' ? value : key
    }, [language])



    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, languageOptions }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider')
    }
    return context
}

// Convenience export
export { languageOptions }
