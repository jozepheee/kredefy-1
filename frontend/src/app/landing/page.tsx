'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box, Container, Heading, Text, VStack, HStack, Button,
    SimpleGrid, Flex, Icon, Badge
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiArrowRight, FiUsers, FiDollarSign, FiHeart, FiShield } from 'react-icons/fi'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'

const MotionBox = motion.create(Box)
const MotionFlex = motion.create(Flex)

export default function LandingPage() {
    const router = useRouter()
    const { t, language, setLanguage, languageOptions } = useLanguage()
    const { user, isLoading } = useAuth()

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && user) {
            router.push('/')
        }
    }, [user, isLoading, router])

    const handleGetStarted = () => {
        // Check if user has seen onboarding
        const hasSeenOnboarding = localStorage.getItem('kredefy_onboarding_done')
        if (hasSeenOnboarding) {
            router.push('/auth')
        } else {
            router.push('/onboarding')
        }
    }

    return (
        <Box minH="100vh" bg="white" overflow="hidden">
            {/* Language Selector */}
            <Flex
                position="absolute"
                top={4}
                right={4}
                zIndex={100}
                gap={2}
            >
                {languageOptions.map((opt) => (
                    <Button
                        key={opt.value}
                        size="sm"
                        variant={language === opt.value ? 'solid' : 'ghost'}
                        colorScheme={language === opt.value ? 'teal' : 'gray'}
                        onClick={() => setLanguage(opt.value)}
                        borderRadius="full"
                        fontWeight={600}
                    >
                        {opt.nativeLabel}
                    </Button>
                ))}
            </Flex>

            {/* Hero Section */}
            <Box
                bg="linear-gradient(135deg, #0d9488 0%, #10b981 50%, #34d399 100%)"
                minH="70vh"
                position="relative"
                overflow="hidden"
            >
                {/* Decorative Pattern */}
                <Box
                    position="absolute"
                    top={0}
                    right={0}
                    bottom={0}
                    left={0}
                    opacity={0.1}
                    bgImage="radial-gradient(circle at 20% 80%, white 1px, transparent 1px)"
                    bgSize="60px 60px"
                />

                <Container maxW="6xl" pt={{ base: 20, md: 32 }} pb={20} position="relative">
                    <VStack spacing={8} textAlign="center">
                        {/* Logo */}
                        <MotionBox
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <HStack spacing={3} mb={4}>
                                <Box
                                    w="60px"
                                    h="60px"
                                    borderRadius="2xl"
                                    bg="white"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    boxShadow="0 8px 32px rgba(0,0,0,0.1)"
                                >
                                    <Text fontSize="3xl" fontWeight="900" color="teal.600">K</Text>
                                </Box>
                                <Text fontSize="3xl" fontWeight="800" color="white">
                                    {t('app.name')}
                                </Text>
                            </HStack>
                        </MotionBox>

                        {/* Headline */}
                        <MotionBox
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <Heading
                                color="white"
                                fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
                                fontWeight="800"
                                lineHeight="1.2"
                                maxW="800px"
                            >
                                {t('landing.hero.title')}{' '}
                                <Text as="span" color="yellow.300">
                                    {t('landing.hero.titleHighlight')}
                                </Text>
                            </Heading>
                        </MotionBox>

                        {/* Subtitle */}
                        <MotionBox
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.5 }}
                        >
                            <Text
                                color="whiteAlpha.900"
                                fontSize={{ base: 'lg', md: 'xl' }}
                                maxW="600px"
                                lineHeight="1.6"
                            >
                                {t('landing.hero.subtitle')}
                            </Text>
                        </MotionBox>

                        {/* CTA Button */}
                        <MotionBox
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.3 }}
                        >
                            <Button
                                size="lg"
                                bg="white"
                                color="teal.700"
                                px={10}
                                py={7}
                                fontSize="lg"
                                fontWeight="700"
                                borderRadius="full"
                                rightIcon={<FiArrowRight />}
                                onClick={handleGetStarted}
                                _hover={{
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                                }}
                                boxShadow="0 8px 32px rgba(0,0,0,0.15)"
                            >
                                {t('landing.cta')}
                            </Button>
                        </MotionBox>
                    </VStack>
                </Container>

                {/* Wave Decoration */}
                <Box
                    position="absolute"
                    bottom={-1}
                    left={0}
                    right={0}
                    h="100px"
                    bg="white"
                    borderTopRadius="50% 100%"
                />
            </Box>

            {/* Features Section */}
            <Container maxW="6xl" py={16}>
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={8} mb={16}>
                    {[
                        {
                            icon: FiDollarSign,
                            key: 'noBank',
                            color: 'blue',
                            emoji: '🏦'
                        },
                        {
                            icon: FiUsers,
                            key: 'trustCircle',
                            color: 'purple',
                            emoji: '👥'
                        },
                        {
                            icon: FiHeart,
                            key: 'helpOthers',
                            color: 'pink',
                            emoji: '💚'
                        },
                    ].map((feature, i) => (
                        <MotionBox
                            key={feature.key}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + i * 0.15, duration: 0.4 }}
                        >
                            <VStack
                                p={8}
                                bg="gray.50"
                                borderRadius="3xl"
                                spacing={4}
                                textAlign="center"
                                h="full"
                                _hover={{
                                    bg: 'gray.100',
                                    transform: 'translateY(-4px)',
                                }}
                                transition="all 0.3s"
                                cursor="default"
                            >
                                <Box
                                    fontSize="4xl"
                                    p={4}
                                    bg={`${feature.color}.100`}
                                    borderRadius="2xl"
                                >
                                    {feature.emoji}
                                </Box>
                                <Heading size="md" color="gray.800">
                                    {t(`landing.features.${feature.key}.title`)}
                                </Heading>
                                <Text color="gray.600" fontSize="sm">
                                    {t(`landing.features.${feature.key}.desc`)}
                                </Text>
                            </VStack>
                        </MotionBox>
                    ))}
                </SimpleGrid>

                {/* Value Props Section */}
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                >
                    <Flex
                        justify="center"
                        gap={{ base: 4, md: 12 }}
                        flexWrap="wrap"
                        py={8}
                        borderTop="1px solid"
                        borderColor="gray.100"
                    >
                        {[
                            { key: 'phoneOnly', icon: '📱' },
                            { key: 'fastLoan', icon: '⚡' },
                            { key: 'noHidden', icon: '✨' },
                        ].map((item) => (
                            <HStack key={item.key} spacing={4}>
                                <Text fontSize="xl">{item.icon}</Text>
                                <Text fontWeight="700" color="gray.700" fontSize={{ base: 'sm', md: 'md' }}>
                                    {t(`landing.valueProps.${item.key}`)}
                                </Text>
                            </HStack>
                        ))}
                    </Flex>
                </MotionBox>
            </Container>

            {/* Footer */}
            <Box py={8} textAlign="center" borderTop="1px solid" borderColor="gray.100">
                <Text color="gray.500" fontSize="sm" fontWeight="500">
                    {t('landing.footer')}
                </Text>
            </Box>
        </Box>
    )
}
