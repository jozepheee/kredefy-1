'use client'

import { useEffect, useState } from 'react'
import {
    Box, Container, Heading, Text, SimpleGrid, Card, CardBody,
    Stat, StatLabel, StatNumber, StatHelpText, HStack, VStack, Badge,
    Button, Icon, CircularProgress, CircularProgressLabel, Flex,
    Skeleton, SkeletonCircle, Alert, AlertIcon, Tooltip
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
    FiTrendingUp, FiUsers, FiDollarSign, FiHeart,
    FiArrowRight, FiShield, FiRefreshCw
} from 'react-icons/fi'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/context/AuthContext'
import GamificationStats from '@/components/GamificationStats'
import TrustGraph from '@/components/TrustGraph'
import PaymentStreaming from '@/components/PaymentStreaming'
import RiskRadar from '@/components/RiskRadar'
import NearbyUsers from '@/components/NearbyUsers'
import { circlesAPI, loansAPI, vouchesAPI, Circle, Loan, Vouch } from '@/lib/api'
import { useAPI } from '@/hooks/useAPI'
import { useLanguage } from '@/context/LanguageContext'

const MotionBox = motion.create(Box)
const MotionCard = motion.create(Card)

export default function HomePage() {
    const { user, trustScore, saathiBalance, isLoading: authLoading, refreshUser, refreshTrustScore } = useAuth()
    const { t } = useLanguage()

    // Fetch circles
    const {
        data: circles,
        isLoading: circlesLoading,
        error: circlesError,
        execute: fetchCircles
    } = useAPI<Circle[]>(circlesAPI.getMyCircles)

    // Fetch loans
    const {
        data: loans,
        isLoading: loansLoading,
        execute: fetchLoans
    } = useAPI<Loan[]>(loansAPI.getMyLoans)

    // Fetch vouches received
    const {
        data: vouchesReceived,
        isLoading: vouchesLoading,
        execute: fetchVouches
    } = useAPI<Vouch[]>(vouchesAPI.getReceived)

    // Fetch vouches given
    const {
        data: vouchesGiven,
        execute: fetchVouchesGiven
    } = useAPI<Vouch[]>(vouchesAPI.getGiven)

    // Load data on mount
    useEffect(() => {
        if (user) {
            fetchCircles()
            fetchLoans()
            fetchVouches()
            fetchVouchesGiven()
        }
    }, [user, fetchCircles, fetchLoans, fetchVouches, fetchVouchesGiven])

    const handleRefresh = async () => {
        await Promise.all([
            refreshUser(),
            refreshTrustScore(),
            fetchCircles(),
            fetchLoans(),
        ])
    }

    // Computed values from real data
    const activeLoans = loans?.filter(l => ['repaying', 'disbursed'].includes(l.status)) || []
    const totalActiveAmount = activeLoans.reduce((sum, l) => sum + l.amount, 0)
    const circleCount = circles?.length || 0
    const totalMembers = circles?.reduce((sum, c) => sum + c.member_count, 0) || 0
    const vouchReceivedCount = vouchesReceived?.length || 0
    const vouchGivenCount = vouchesGiven?.length || 0

    const quickActions = [
        {
            title: t('dashboard.actions.getLoan'),
            subtitle: t('dashboard.actions.getLoanDesc'),
            icon: '💰',
            color: 'emerald',
            href: '/loans/apply'
        },
        {
            title: t('dashboard.actions.helpFriend'),
            subtitle: t('dashboard.actions.helpFriendDesc'),
            icon: '💚',
            color: 'pink',
            href: '/vouch'
        },
        {
            title: t('dashboard.actions.emergency'),
            subtitle: t('dashboard.actions.emergencyDesc'),
            icon: '🚨',
            color: 'orange',
            href: '/emergency'
        },
    ]

    const getTrustLabel = (score: number) => {
        if (score >= 80) return t('achievements.labels.excellent')
        if (score >= 60) return t('achievements.labels.good')
        if (score >= 40) return t('achievements.labels.building')
        return t('achievements.labels.starting')
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return t('dashboard.greeting.morning')
        if (hour < 18) return t('dashboard.greeting.afternoon')
        return t('dashboard.greeting.evening')
    }

    if (authLoading) {
        return (
            <AppLayout>
                <Box p={6}>
                    <VStack spacing={4}>
                        <Skeleton height="200px" width="100%" borderRadius="3xl" />
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} w="100%">
                            <Skeleton height="120px" borderRadius="2xl" />
                            <Skeleton height="120px" borderRadius="2xl" />
                            <Skeleton height="120px" borderRadius="2xl" />
                        </SimpleGrid>
                    </VStack>
                </Box>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <Box minH="100vh" bg="transparent" pb={16}>
                {/* Hero Section with Trust Score */}
                <Box
                    bg="linear-gradient(135deg, #0d9488 0%, #10b981 50%, #34d399 100%)"
                    py={{ base: 10, md: 14 }}
                    px={6}
                    borderRadius="3xl"
                    mb={-6}
                    position="relative"
                    overflow="hidden"
                >
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

                    <Container maxW="6xl" position="relative">
                        <HStack justify="flex-end" mb={4}>
                            <Button
                                size="sm"
                                variant="ghost"
                                color="whiteAlpha.800"
                                leftIcon={<FiRefreshCw />}
                                onClick={handleRefresh}
                                isLoading={circlesLoading || loansLoading}
                            >
                                {t('common.refresh')}
                            </Button>
                        </HStack>

                        <Flex
                            direction={{ base: 'column', lg: 'row' }}
                            justify="space-between"
                            align="center"
                            gap={8}
                        >
                            <MotionBox
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                flex={1}
                            >
                                <Badge
                                    bg="whiteAlpha.200"
                                    color="white"
                                    px={3}
                                    py={1}
                                    borderRadius="full"
                                    mb={4}
                                    fontSize="sm"
                                >
                                    🌟 {getGreeting()}!
                                </Badge>
                                <Heading color="white" size="2xl" fontWeight="800" mb={2}>
                                    {t('dashboard.hello')}, {user?.full_name || t('common.loading').split('.')[0]}! 👋
                                </Heading>
                                <Text color="whiteAlpha.900" fontSize="lg" maxW="400px">
                                    {t('dashboard.trustMessage')}
                                </Text>

                                {/* SAATHI Balance - from real API */}
                                <HStack mt={6} spacing={4}>
                                    <Tooltip label="Your digital currency for trust and rewards. Use these to vouch for friends!" placement="bottom">
                                        <HStack
                                            bg="whiteAlpha.200"
                                            px={4}
                                            py={2}
                                            borderRadius="full"
                                            backdropFilter="blur(10px)"
                                            cursor="help"
                                        >
                                            <Text fontSize="2xl">🪙</Text>
                                            <VStack align="start" spacing={0}>
                                                <Text color="white" fontWeight="800" fontSize="xl">
                                                    {saathiBalance?.available ?? user?.saathi_balance ?? 0}
                                                </Text>
                                                <Text color="whiteAlpha.800" fontSize="xs">{t('dashboard.saathiTokens')}</Text>
                                            </VStack>
                                        </HStack>
                                    </Tooltip>
                                    {saathiBalance && saathiBalance.staked > 0 && (
                                        <Tooltip label="Tokens currently locked as collateral for vouches you have given">
                                            <Badge bg="whiteAlpha.200" color="white" borderRadius="full" cursor="help">
                                                {saathiBalance.staked} {t('dashboard.circles.staked')}
                                            </Badge>
                                        </Tooltip>
                                    )}
                                </HStack>
                            </MotionBox>

                            {/* Bharosa Meter & Gamification Stats */}
                            <MotionBox
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                flex={1}
                                maxW={{ base: '100%', lg: '400px' }}
                            >
                                <GamificationStats
                                    streak={(user as any)?.metadata?.streak_days || 0}
                                    badges={(user as any)?.metadata?.badges || []}
                                    xp={(user as any)?.metadata?.xp || 250}
                                    level="Trust Cadet"
                                />

                                <VStack
                                    mt={4}
                                    bg="whiteAlpha.200"
                                    backdropFilter="blur(20px)"
                                    borderRadius="3xl"
                                    p={6}
                                    spacing={3}
                                    className="bharosa-pulse"
                                >
                                    <Text color="whiteAlpha.800" fontWeight="600" fontSize="sm">
                                        {t('dashboard.bharosaMeter')}
                                    </Text>
                                    <Tooltip label="Your reputation score in the community. Higher score = better loans!" placement="left">
                                        <Box position="relative" cursor="help">
                                            <CircularProgress
                                                value={trustScore?.score ?? user?.trust_score ?? 0}
                                                size="120px"
                                                thickness="10px"
                                                color="white"
                                                trackColor="whiteAlpha.300"
                                                capIsRound
                                            >
                                                <CircularProgressLabel>
                                                    <VStack spacing={0}>
                                                        <Text color="white" fontSize="3xl" fontWeight="800">
                                                            {trustScore?.score ?? user?.trust_score ?? 0}
                                                        </Text>
                                                        <Text color="whiteAlpha.800" fontSize="xs">
                                                            {getTrustLabel(trustScore?.score ?? user?.trust_score ?? 0)}
                                                        </Text>
                                                    </VStack>
                                                </CircularProgressLabel>
                                            </CircularProgress>
                                        </Box>
                                    </Tooltip>
                                </VStack>
                            </MotionBox>
                        </Flex>
                    </Container>
                </Box>

                <Container maxW="6xl" mt={10}>
                    {circlesError && (
                        <Alert status="error" borderRadius="xl" mb={6}>
                            <AlertIcon />
                            {t('dashboard.circles.error')}
                        </Alert>
                    )}

                    {/* Quick Actions */}
                    <Text fontSize="lg" fontWeight="700" color="gray.800" mb={4}>
                        {t('dashboard.whatToDo')}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={5} mb={10}>
                        {quickActions.map((action, i) => (
                            <Link key={action.title} href={action.href}>
                                <MotionCard
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    whileHover={{ scale: 1.03, y: -5 }}
                                    bg="white"
                                    borderRadius="2xl"
                                    boxShadow="lg"
                                    cursor="pointer"
                                    overflow="hidden"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    position="relative"
                                >
                                    <Box
                                        position="absolute"
                                        top={0}
                                        right={0}
                                        w="80px"
                                        h="80px"
                                        bg={`${action.color}.500`}
                                        opacity={0.1}
                                        borderBottomLeftRadius="full"
                                    />
                                    <CardBody py={6}>
                                        <HStack justify="space-between" mb={3}>
                                            <Box
                                                fontSize="3xl"
                                                p={3}
                                                bgGradient={`linear(to-br, ${action.color}.400, ${action.color}.600)`}
                                                color="white"
                                                borderRadius="xl"
                                                boxShadow={`0 10px 15px -3px var(--chakra-colors-${action.color}-200)`}
                                            >
                                                {action.icon}
                                            </Box>
                                            <Icon as={FiArrowRight} color="gray.300" boxSize={5} />
                                        </HStack>
                                        <VStack align="start" spacing={1}>
                                            <Text fontWeight="800" fontSize="lg" color="gray.800">{action.title}</Text>
                                            <Text fontSize="sm" color="gray.500" lineHeight="tall">{action.subtitle}</Text>
                                        </VStack>
                                    </CardBody>
                                </MotionCard>
                            </Link>
                        ))}
                    </SimpleGrid>

                    {/* Stats Row - from real API */}
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={10}>
                        <StatCard
                            label={t('dashboard.stats.activeLoans')}
                            value={totalActiveAmount > 0 ? `₹${totalActiveAmount.toLocaleString()}` : '₹0'}
                            subtext={`${activeLoans.length} ${t('loans.title').toLowerCase()}`}
                            color="blue"
                            icon={FiDollarSign}
                            isLoading={loansLoading}
                        />
                        <StatCard
                            label={t('dashboard.stats.myCircles')}
                            value={circleCount.toString()}
                            subtext={`${totalMembers} ${t('common.members').toLowerCase()}`}
                            color="purple"
                            icon={FiUsers}
                            isLoading={circlesLoading}
                        />
                        <StatCard
                            label={t('dashboard.stats.peopleTrustMe')}
                            value={vouchReceivedCount.toString()}
                            subtext={t('dashboard.stats.vouched')}
                            color="pink"
                            icon={FiHeart}
                            isLoading={vouchesLoading}
                        />
                        <StatCard
                            label={t('dashboard.stats.iVouchFor')}
                            value={vouchGivenCount.toString()}
                            subtext={t('dashboard.stats.karma')}
                            color="orange"
                            icon={FiShield}
                            isLoading={vouchesLoading}
                        />
                    </SimpleGrid>

                    {/* ===== MINDBLOWING VISUALIZATIONS ===== */}
                    <Text fontSize="lg" fontWeight="700" color="gray.800" mb={4}>
                        🚀 Advanced Analytics
                    </Text>
                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={10}>
                        <TrustGraph userId={user?.id} />
                        <PaymentStreaming />
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={10}>
                        <RiskRadar userId={user?.id} loanAmount={5000} />
                        <NearbyUsers />
                    </SimpleGrid>

                    {/* My Circles Preview - from real API */}
                    <Card borderRadius="2xl" boxShadow="sm" bg="white">
                        <CardBody>
                            <HStack justify="space-between" mb={4}>
                                <HStack>
                                    <Text fontSize="xl">👥</Text>
                                    <Text fontWeight="700" color="gray.800">{t('dashboard.circles.title')}</Text>
                                </HStack>
                                <Link href="/circles">
                                    <Button size="sm" variant="ghost" colorScheme="teal" rightIcon={<FiArrowRight />}>
                                        {t('dashboard.circles.viewAll')}
                                    </Button>
                                </Link>
                            </HStack>

                            {circlesLoading ? (
                                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                                    {[1, 2, 3].map(i => (
                                        <Skeleton key={i} height="100px" borderRadius="xl" />
                                    ))}
                                </SimpleGrid>
                            ) : circles && circles.length > 0 ? (
                                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                                    {circles.slice(0, 3).map((circle) => (
                                        <CircleCard
                                            key={circle.id}
                                            name={circle.name}
                                            members={circle.member_count}
                                            poolAmount={circle.total_pool}
                                            role={circle.my_role}
                                            t={t}
                                        />
                                    ))}
                                </SimpleGrid>
                            ) : (
                                <VStack py={8} spacing={4}>
                                    <Text fontSize="3xl">👥</Text>
                                    <Text color="gray.500">{t('dashboard.circles.empty')}</Text>
                                    <Link href="/circles">
                                        <Button colorScheme="teal" borderRadius="xl">
                                            {t('dashboard.circles.create')}
                                        </Button>
                                    </Link>
                                </VStack>
                            )}
                        </CardBody>
                    </Card>

                    {/* Spotlight Card */}
                    <Card
                        mt={8}
                        borderRadius="2xl"
                        overflow="hidden"
                        bg="purple.900"
                        color="white"
                    >
                        <CardBody p={6}>
                            <HStack justify="space-between" align="center" flexWrap="wrap" gap={6}>
                                <VStack align="start" spacing={1} flex={1}>
                                    <Badge colorScheme="purple" variant="solid" mb={2}>NEW FEATURE</Badge>
                                    <Heading size="md">Community Emergency Fund 🚨</Heading>
                                    <Text color="purple.100" fontSize="sm">
                                        Need urgent help? If your Trust Score is 60+, you can now access emergency funds instantly without any voting.
                                    </Text>
                                </VStack>
                                <Link href="/emergency">
                                    <Button colorScheme="purple" bg="white" color="purple.900" _hover={{ bg: 'purple.50' }} borderRadius="xl">
                                        Check Eligibility
                                    </Button>
                                </Link>
                            </HStack>
                        </CardBody>
                    </Card>
                </Container>
            </Box>
        </AppLayout >
    )
}

// Stat Card Component
function StatCard({ label, value, subtext, color, icon, isLoading }: {
    label: string
    value: string
    subtext: string
    color: string
    icon: React.ElementType
    isLoading?: boolean
}) {
    return (
        <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            bg="white"
            borderRadius="2xl"
            boxShadow="sm"
            _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
            style={{ transition: 'all 0.2s' }}
        >
            <CardBody>
                <HStack spacing={3} mb={2}>
                    <Box p={2} borderRadius="lg" bg={`${color}.100`} color={`${color}.600`}>
                        <Icon as={icon} boxSize={4} />
                    </Box>
                </HStack>
                {isLoading ? (
                    <Skeleton height="32px" width="60%" mb={1} />
                ) : (
                    <Text fontSize="2xl" fontWeight="800" color="gray.800">{value}</Text>
                )}
                <Text fontSize="xs" color="gray.500">{label}</Text>
                <Text fontSize="xs" color={`${color}.500`} fontWeight="500" mt={1}>
                    {subtext}
                </Text>
            </CardBody>
        </MotionCard>
    )
}

// Circle Card Component
function CircleCard({ name, members, poolAmount, role, t }: {
    name: string
    members: number
    poolAmount: number
    role: 'admin' | 'member'
    t: any
}) {
    return (
        <Box
            p={4}
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.100"
            _hover={{ borderColor: 'teal.200', bg: 'teal.50' }}
            transition="all 0.2s"
            cursor="pointer"
        >
            <HStack mb={3} justify="space-between">
                <Text fontWeight="600" color="gray.800">{name}</Text>
                <Badge
                    colorScheme={role === 'admin' ? 'purple' : 'gray'}
                    borderRadius="full"
                    fontSize="xs"
                >
                    {role}
                </Badge>
            </HStack>
            <HStack justify="space-between">
                <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="gray.500">{t('common.members')}</Text>
                    <Text fontWeight="700" color="gray.700">{members}</Text>
                </VStack>
                <VStack align="end" spacing={0}>
                    <Text fontSize="xs" color="gray.500">{t('dashboard.circles.pool')}</Text>
                    <Text fontWeight="700" color="emerald.600">₹{poolAmount.toLocaleString()}</Text>
                </VStack>
            </HStack>
        </Box>
    )
}
