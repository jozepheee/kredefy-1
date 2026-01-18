'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, SimpleGrid, Avatar, Skeleton, Alert, AlertIcon,
    Icon, Progress, Stat, StatLabel, StatNumber, StatHelpText,
    CircularProgress, CircularProgressLabel, Divider
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
    FiSettings, FiAward, FiShield, FiStar, FiUsers, FiDollarSign,
    FiHeart, FiBook
} from 'react-icons/fi'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import {
    circlesAPI, loansAPI, vouchesAPI, trustScoreAPI, saathiAPI,
    Circle, Loan, Vouch, TrustScore, SaathiBalance
} from '@/lib/api'
import { useAPI } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'

const MotionCard = motion.create(Card)

export default function ProfilePage() {
    const { user, trustScore: cachedTrustScore, saathiBalance: cachedBalance } = useAuth()

    // Fetch all profile data
    const { data: trustScore, isLoading: tsLoading, execute: fetchTrustScore } =
        useAPI<TrustScore>(trustScoreAPI.getBharosaMeter)

    const { data: balance, isLoading: balLoading, execute: fetchBalance } =
        useAPI<SaathiBalance>(saathiAPI.getBalance)

    const { data: circles, isLoading: circlesLoading, execute: fetchCircles } =
        useAPI<Circle[]>(circlesAPI.getMyCircles)

    const { data: loans, isLoading: loansLoading, execute: fetchLoans } =
        useAPI<Loan[]>(loansAPI.getMyLoans)

    const { data: vouchesGiven, isLoading: vgLoading, execute: fetchVouchesGiven } =
        useAPI<Vouch[]>(vouchesAPI.getGiven)

    const { data: vouchesReceived, isLoading: vrLoading, execute: fetchVouchesReceived } =
        useAPI<Vouch[]>(vouchesAPI.getReceived)

    useEffect(() => {
        fetchTrustScore()
        fetchBalance()
        fetchCircles()
        fetchLoans()
        fetchVouchesGiven()
        fetchVouchesReceived()
    }, [fetchTrustScore, fetchBalance, fetchCircles, fetchLoans, fetchVouchesGiven, fetchVouchesReceived])

    const ts = trustScore || cachedTrustScore
    const bal = balance || cachedBalance
    const score = ts?.score ?? user?.trust_score ?? 0

    const completedLoans = loans?.filter(l => l.status === 'completed') || []
    const activeLoans = loans?.filter(l => ['repaying', 'disbursed'].includes(l.status)) || []
    const totalBorrowed = loans?.reduce((sum, l) => sum + l.amount, 0) || 0
    const totalStaked = vouchesGiven?.reduce((sum, v) => sum + v.saathi_staked, 0) || 0

    const getTrustColor = (score: number) => {
        if (score >= 80) return 'emerald'
        if (score >= 60) return 'blue'
        if (score >= 40) return 'orange'
        return 'red'
    }

    const getTrustLabel = (score: number) => {
        if (score >= 80) return 'Excellent'
        if (score >= 60) return 'Good'
        if (score >= 40) return 'Building'
        return 'Starting'
    }

    const isLoading = tsLoading || balLoading || circlesLoading || loansLoading

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Profile Header */}
                <Card
                    bg="linear-gradient(135deg, #0d9488 0%, #10b981 50%, #34d399 100%)"
                    borderRadius="2xl"
                    mb={6}
                    overflow="hidden"
                    position="relative"
                >
                    <Box
                        position="absolute"
                        top={0}
                        right={0}
                        bottom={0}
                        left={0}
                        opacity={0.1}
                        bgImage="radial-gradient(circle at 30% 70%, white 1px, transparent 1px)"
                        bgSize="50px 50px"
                    />
                    <CardBody p={8} position="relative">
                        <HStack justify="space-between" flexWrap="wrap" gap={6}>
                            <HStack spacing={6}>
                                <Avatar
                                    size="2xl"
                                    name={user?.full_name || 'User'}
                                    bg="whiteAlpha.300"
                                    border="4px solid"
                                    borderColor="whiteAlpha.400"
                                />
                                <VStack align="start" spacing={2}>
                                    <Heading color="white" size="xl">
                                        {user?.full_name || 'User'}
                                    </Heading>
                                    <Text color="whiteAlpha.800">
                                        {user?.phone}
                                    </Text>
                                    <HStack spacing={3}>
                                        <Badge
                                            bg="whiteAlpha.200"
                                            color="white"
                                            borderRadius="full"
                                            px={3}
                                            py={1}
                                        >
                                            🪙 {bal?.balance ?? user?.saathi_balance ?? 0} SAATHI
                                        </Badge>
                                        <Badge
                                            colorScheme={getTrustColor(score)}
                                            borderRadius="full"
                                            px={3}
                                            py={1}
                                        >
                                            {getTrustLabel(score)} • {score}
                                        </Badge>
                                    </HStack>
                                </VStack>
                            </HStack>

                            {/* Trust Score Ring */}
                            <VStack>
                                <CircularProgress
                                    value={score}
                                    size="120px"
                                    thickness="10px"
                                    color="white"
                                    trackColor="whiteAlpha.300"
                                    capIsRound
                                >
                                    <CircularProgressLabel>
                                        <VStack spacing={0}>
                                            <Text color="white" fontSize="2xl" fontWeight="800">{score}</Text>
                                            <Text color="whiteAlpha.800" fontSize="xs">Trust</Text>
                                        </VStack>
                                    </CircularProgressLabel>
                                </CircularProgress>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>

                {/* Quick Stats */}
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
                    <StatCard
                        icon={FiUsers}
                        label="Circles"
                        value={circles?.length || 0}
                        color="purple"
                        isLoading={circlesLoading}
                    />
                    <StatCard
                        icon={FiDollarSign}
                        label="Total Borrowed"
                        value={`₹${totalBorrowed.toLocaleString()}`}
                        color="blue"
                        isLoading={loansLoading}
                    />
                    <StatCard
                        icon={FiHeart}
                        label="People Trust Me"
                        value={vouchesReceived?.length || 0}
                        color="pink"
                        isLoading={vrLoading}
                    />
                    <StatCard
                        icon={FiShield}
                        label="I Vouch For"
                        value={vouchesGiven?.length || 0}
                        subtext={`${totalStaked} staked`}
                        color="orange"
                        isLoading={vgLoading}
                    />
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                    {/* Loan Summary */}
                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <HStack justify="space-between" mb={4}>
                                <HStack>
                                    <Text fontSize="xl">💰</Text>
                                    <Text fontWeight="700" color="gray.800">Loan Summary</Text>
                                </HStack>
                                <Link href="/loans">
                                    <Button size="sm" variant="ghost" colorScheme="teal">
                                        View All
                                    </Button>
                                </Link>
                            </HStack>

                            {loansLoading ? (
                                <Skeleton height="100px" borderRadius="xl" />
                            ) : (
                                <VStack spacing={4} align="stretch">
                                    <SimpleGrid columns={3} gap={4}>
                                        <VStack p={3} bg="emerald.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="emerald.600">
                                                {completedLoans.length}
                                            </Text>
                                            <Text fontSize="xs" color="gray.600">Completed</Text>
                                        </VStack>
                                        <VStack p={3} bg="blue.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="blue.600">
                                                {activeLoans.length}
                                            </Text>
                                            <Text fontSize="xs" color="gray.600">Active</Text>
                                        </VStack>
                                        <VStack p={3} bg="gray.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="gray.600">
                                                {loans?.length || 0}
                                            </Text>
                                            <Text fontSize="xs" color="gray.600">Total</Text>
                                        </VStack>
                                    </SimpleGrid>

                                    {completedLoans.length > 0 && (
                                        <HStack p={3} bg="emerald.50" borderRadius="xl" justify="center">
                                            <Icon as={FiAward} color="emerald.600" />
                                            <Text color="emerald.700" fontWeight="600" fontSize="sm">
                                                100% on-time repayment! 🎉
                                            </Text>
                                        </HStack>
                                    )}
                                </VStack>
                            )}
                        </CardBody>
                    </Card>

                    {/* Trust Score Breakdown */}
                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <HStack justify="space-between" mb={4}>
                                <HStack>
                                    <Text fontSize="xl">📊</Text>
                                    <Text fontWeight="700" color="gray.800">Trust Factors</Text>
                                </HStack>
                                <Link href="/achievements">
                                    <Button size="sm" variant="ghost" colorScheme="teal">
                                        Details
                                    </Button>
                                </Link>
                            </HStack>

                            {tsLoading ? (
                                <Skeleton height="150px" borderRadius="xl" />
                            ) : ts?.factors ? (
                                <VStack spacing={3} align="stretch">
                                    <FactorBar
                                        label="Repayment History"
                                        value={ts.factors.repayment_history}
                                        icon="💰"
                                    />
                                    <FactorBar
                                        label="Vouch Strength"
                                        value={ts.factors.vouch_strength}
                                        icon="💚"
                                    />
                                    <FactorBar
                                        label="Circle Standing"
                                        value={ts.factors.circle_standing}
                                        icon="👥"
                                    />
                                    <FactorBar
                                        label="Account Age"
                                        value={ts.factors.account_age}
                                        icon="📅"
                                    />
                                    <FactorBar
                                        label="Financial Diary"
                                        value={ts.factors.financial_diary}
                                        icon="📒"
                                    />
                                </VStack>
                            ) : (
                                <VStack py={4}>
                                    <Text color="gray.500">No trust data available</Text>
                                </VStack>
                            )}
                        </CardBody>
                    </Card>

                    {/* My Circles */}
                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <HStack justify="space-between" mb={4}>
                                <HStack>
                                    <Text fontSize="xl">👥</Text>
                                    <Text fontWeight="700" color="gray.800">My Circles</Text>
                                </HStack>
                                <Link href="/circles">
                                    <Button size="sm" variant="ghost" colorScheme="teal">
                                        View All
                                    </Button>
                                </Link>
                            </HStack>

                            {circlesLoading ? (
                                <Skeleton height="100px" borderRadius="xl" />
                            ) : circles && circles.length > 0 ? (
                                <VStack spacing={3} align="stretch">
                                    {circles.slice(0, 3).map((circle) => (
                                        <HStack
                                            key={circle.id}
                                            p={3}
                                            bg="gray.50"
                                            borderRadius="xl"
                                            justify="space-between"
                                        >
                                            <VStack align="start" spacing={0}>
                                                <Text fontWeight="600">{circle.name}</Text>
                                                <Text fontSize="xs" color="gray.500">
                                                    {circle.member_count} members
                                                </Text>
                                            </VStack>
                                            <Badge
                                                colorScheme={circle.my_role === 'admin' ? 'purple' : 'gray'}
                                                borderRadius="full"
                                            >
                                                {circle.my_role}
                                            </Badge>
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <VStack py={4}>
                                    <Text color="gray.500">No circles yet</Text>
                                </VStack>
                            )}
                        </CardBody>
                    </Card>

                    {/* Quick Actions */}
                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <HStack mb={4}>
                                <Text fontSize="xl">⚡</Text>
                                <Text fontWeight="700" color="gray.800">Quick Actions</Text>
                            </HStack>

                            <SimpleGrid columns={2} gap={3}>
                                <Link href="/loans/apply">
                                    <Button
                                        w="full"
                                        h="auto"
                                        py={4}
                                        flexDirection="column"
                                        variant="outline"
                                        colorScheme="teal"
                                        borderRadius="xl"
                                    >
                                        <Text fontSize="2xl" mb={1}>💰</Text>
                                        <Text fontSize="sm">Get Loan</Text>
                                    </Button>
                                </Link>
                                <Link href="/vouch">
                                    <Button
                                        w="full"
                                        h="auto"
                                        py={4}
                                        flexDirection="column"
                                        variant="outline"
                                        colorScheme="pink"
                                        borderRadius="xl"
                                    >
                                        <Text fontSize="2xl" mb={1}>💚</Text>
                                        <Text fontSize="sm">Vouch</Text>
                                    </Button>
                                </Link>
                                <Link href="/diary">
                                    <Button
                                        w="full"
                                        h="auto"
                                        py={4}
                                        flexDirection="column"
                                        variant="outline"
                                        colorScheme="blue"
                                        borderRadius="xl"
                                    >
                                        <Text fontSize="2xl" mb={1}>📒</Text>
                                        <Text fontSize="sm">Diary</Text>
                                    </Button>
                                </Link>
                                <Link href="/settings">
                                    <Button
                                        w="full"
                                        h="auto"
                                        py={4}
                                        flexDirection="column"
                                        variant="outline"
                                        colorScheme="gray"
                                        borderRadius="xl"
                                    >
                                        <Icon as={FiSettings} boxSize={6} mb={1} />
                                        <Text fontSize="sm">Settings</Text>
                                    </Button>
                                </Link>
                            </SimpleGrid>
                        </CardBody>
                    </Card>
                </SimpleGrid>
            </Box>
        </AppLayout>
    )
}

// Stat Card Component
function StatCard({ icon, label, value, subtext, color, isLoading }: {
    icon: React.ElementType
    label: string
    value: string | number
    subtext?: string
    color: string
    isLoading?: boolean
}) {
    return (
        <Card borderRadius="2xl" bg="white">
            <CardBody>
                <HStack spacing={3} mb={2}>
                    <Box p={2} borderRadius="lg" bg={`${color}.100`} color={`${color}.600`}>
                        <Icon as={icon} boxSize={4} />
                    </Box>
                </HStack>
                {isLoading ? (
                    <Skeleton height="32px" width="60%" />
                ) : (
                    <Text fontSize="2xl" fontWeight="800" color="gray.800">{value}</Text>
                )}
                <Text fontSize="xs" color="gray.500">{label}</Text>
                {subtext && <Text fontSize="xs" color={`${color}.500`}>{subtext}</Text>}
            </CardBody>
        </Card>
    )
}

// Factor Bar Component
function FactorBar({ label, value, icon }: { label: string; value: number; icon: string }) {
    return (
        <Box>
            <HStack justify="space-between" mb={1}>
                <HStack>
                    <Text>{icon}</Text>
                    <Text fontSize="sm" fontWeight="500">{label}</Text>
                </HStack>
                <Text fontSize="sm" fontWeight="700">{value}%</Text>
            </HStack>
            <Progress
                value={value}
                colorScheme={value >= 80 ? 'emerald' : value >= 60 ? 'blue' : value >= 40 ? 'orange' : 'red'}
                borderRadius="full"
                h="6px"
            />
        </Box>
    )
}
