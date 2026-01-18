'use client'

import { Box, Spinner, Center, Text, VStack } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import NovaMascot from '@/components/NovaMascot'
import FeatureGuide from '@/components/FeatureGuide'
import { useAuth } from '@/context/AuthContext'

interface AppLayoutProps {
    children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
    const pathname = usePathname()
    const { isLoading, isAuthenticated } = useAuth()

    // Public pages don't use the app layout
    const publicPaths = ['/auth', '/landing', '/onboarding']
    if (publicPaths.some(path => pathname?.startsWith(path))) {
        return <>{children}</>
    }

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <Center h="100vh" bg="gray.50">
                <VStack spacing={4}>
                    <Spinner size="xl" color="teal.500" thickness="4px" />
                    <Text color="gray.500" fontWeight="500">Loading Kredefy...</Text>
                </VStack>
            </Center>
        )
    }

    // If not authenticated and not loading, redirect to landing
    if (!isAuthenticated) {
        // Use client-side redirect
        if (typeof window !== 'undefined') {
            window.location.href = '/landing'
        }
        return (
            <Center h="100vh" bg="gray.50">
                <VStack spacing={4}>
                    <Spinner size="xl" color="teal.500" thickness="4px" />
                    <Text color="gray.500" fontWeight="500">Redirecting to login...</Text>
                </VStack>
            </Center>
        )
    }

    return (
        <Box minH="100vh" bg="gray.50">
            {/* Sidebar */}
            <Sidebar />

            {/* Top Bar */}
            <TopBar />

            {/* Main Content Area */}
            <Box
                ml={{ base: 0, md: '70px', lg: '260px' }}
                pt="70px"
                minH="100vh"
                transition="margin-left 0.3s ease"
            >
                <Box p={6}>
                    {children}
                </Box>
            </Box>

            {/* Nova AI Mascot - floating */}
            <NovaMascot />

            {/* Interactive Feature Guide */}
            <FeatureGuide />
        </Box>
    )
}
