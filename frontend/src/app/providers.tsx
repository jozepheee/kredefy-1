'use client'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'

const theme = extendTheme({
    colors: {
        brand: {
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
        },
        emerald: {
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#10b981',
            600: '#059669',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
        },
        trust: {
            low: '#ef4444',
            medium: '#f59e0b',
            high: '#10b981',
            excellent: '#059669',
        },
        saathi: {
            gold: '#fbbf24',
            glow: '#fef3c7',
        },
    },
    fonts: {
        heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    components: {
        Button: {
            baseStyle: {
                fontWeight: '600',
                borderRadius: 'xl',
            },
            variants: {
                primary: {
                    bg: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                    color: 'white',
                    _hover: {
                        bg: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)',
                    },
                },
            },
        },
        Card: {
            baseStyle: {
                container: {
                    borderRadius: '2xl',
                    boxShadow: 'lg',
                    bg: 'white',
                },
            },
        },
        Input: {
            defaultProps: {
                focusBorderColor: 'emerald.500',
            },
        },
    },
    styles: {
        global: {
            body: {
                bg: 'gray.50',
            },
        },
    },
})

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ChakraProvider theme={theme}>
            <LanguageProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </LanguageProvider>
        </ChakraProvider>
    )
}

