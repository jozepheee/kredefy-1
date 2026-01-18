'use client'

import { useEffect } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Badge, Icon, SimpleGrid, CircularProgress,
    CircularProgressLabel, Progress, Tooltip, Skeleton, Alert, AlertIcon
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiTrendingUp } from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { trustScoreAPI, TrustScore } from '@/lib/api'
import { useAPI } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)
const MotionBox = motion.create(Box)

export default function AchievementsPage() {
    const { user, trustScore: cachedTrustScore } = useAuth()
    const { t, language } = useLanguage()

    // Fetch fresh trust score from API
    const {
        data: trustScoreData,
        isLoading,
        error,
        execute: fetchTrustScore
    } = useAPI<TrustScore>(trustScoreAPI.getBharosaMeter)

    // Load on mount
    useEffect(() => {
        fetchTrustScore()
    }, [fetchTrustScore])

    const trustScore = trustScoreData || cachedTrustScore
    const score = trustScore?.score ?? user?.trust_score ?? 0

    const getTrustColor = (score: number) => {
        if (score >= 80) return 'emerald'
        if (score >= 60) return 'blue'
        if (score >= 40) return 'orange'
        return 'red'
    }

    const getTrustLabel = (score: number) => {
        if (score >= 80) return t('achievements.labels.excellent')
        if (score >= 60) return t('achievements.labels.good')
        if (score >= 40) return t('achievements.labels.building')
        return t('achievements.labels.starting')
    }

    // Score factors from API
    const scoreFactors = trustScore?.factors ? [
        {
            name: t('achievements.factors.repayment'),
            value: trustScore.factors.repayment_history,
            icon: '💰',
            weight: '30%',
            impact: `+${Math.round(trustScore.factors.repayment_history * 0.3)}`
        },
        {
            name: t('achievements.factors.vouches'),
            value: trustScore.factors.vouch_strength,
            icon: '💚',
            weight: '25%',
            impact: `+${Math.round(trustScore.factors.vouch_strength * 0.25)}`
        },
        {
            name: t('achievements.factors.circles'),
            value: trustScore.factors.circle_standing,
            icon: '👥',
            weight: '20%',
            impact: `+${Math.round(trustScore.factors.circle_standing * 0.2)}`
        },
        {
            name: t('achievements.factors.age'),
            value: trustScore.factors.account_age,
            icon: '📅',
            weight: '15%',
            impact: `+${Math.round(trustScore.factors.account_age * 0.15)}`
        },
        {
            name: t('achievements.factors.diary'),
            value: trustScore.factors.financial_diary,
            icon: '📒',
            weight: '10%',
            impact: `+${Math.round(trustScore.factors.financial_diary * 0.1)}`
        },
    ] : []

    // Calculate score change from history
    const scoreHistory = trustScore?.history || []
    const scoreChange = scoreHistory.length > 1
        ? scoreHistory[scoreHistory.length - 1].score - scoreHistory[scoreHistory.length - 2].score
        : 0

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={6}>
                    <Heading size="lg" color="gray.800">{t('achievements.title')}</Heading>
                    <Text color="gray.500">
                        {t('achievements.subtitle')}
                    </Text>
                </VStack>

                {error && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        {t('achievements.error') ?? 'Failed to load trust score data. Please refresh.'}
                    </Alert>
                )}

                <SimpleGrid columns={{ base: 1, lg: 3 }} gap={6}>
                    {/* Main Trust Score */}
                    <Card borderRadius="2xl" bg="white" boxShadow="lg" gridColumn={{ lg: 'span 1' }}>
                        <CardBody>
                            <VStack spacing={6}>
                                <Text fontWeight="700" color="gray.700">{t('achievements.bharosaMeter')}</Text>

                                {isLoading ? (
                                    <Skeleton height="180px" width="180px" borderRadius="full" />
                                ) : (
                                    <MotionBox
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="bharosa-pulse"
                                    >
                                        <CircularProgress
                                            value={score}
                                            size="180px"
                                            thickness="10px"
                                            color={`${getTrustColor(score)}.400`}
                                            trackColor="gray.100"
                                            capIsRound
                                        >
                                            <CircularProgressLabel>
                                                <VStack spacing={0}>
                                                    <Text fontSize="4xl" fontWeight="800" color="gray.800">
                                                        {score}
                                                    </Text>
                                                    <Badge
                                                        colorScheme={getTrustColor(score)}
                                                        borderRadius="full"
                                                        fontSize="xs"
                                                    >
                                                        {getTrustLabel(score)}
                                                    </Badge>
                                                </VStack>
                                            </CircularProgressLabel>
                                        </CircularProgress>
                                    </MotionBox>
                                )}

                                {scoreChange !== 0 && (
                                    <HStack
                                        p={3}
                                        bg={scoreChange > 0 ? 'emerald.50' : 'red.50'}
                                        borderRadius="xl"
                                        w="full"
                                        justify="center"
                                    >
                                        <Icon
                                            as={FiTrendingUp}
                                            color={scoreChange > 0 ? 'emerald.600' : 'red.600'}
                                            transform={scoreChange < 0 ? 'rotate(180deg)' : undefined}
                                        />
                                        <Text fontWeight="600" color={scoreChange > 0 ? 'emerald.700' : 'red.700'}>
                                            {scoreChange > 0 ? '+' : ''}{scoreChange} {t('achievements.pointsThisMonth')}
                                        </Text>
                                    </HStack>
                                )}

                                {/* Mini Graph - from real history */}
                                {scoreHistory.length > 0 && (
                                    <VStack align="stretch" w="full" spacing={2}>
                                        <Text fontSize="sm" fontWeight="600" color="gray.600">
                                            {t('achievements.growth')}
                                        </Text>
                                        <HStack justify="space-between" align="end" h="60px">
                                            {scoreHistory.slice(-4).map((item, i) => (
                                                <VStack key={i} spacing={1}>
                                                    <MotionBox
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${item.score * 0.7}px` }}
                                                        transition={{ delay: i * 0.1 }}
                                                        w="24px"
                                                        bg={i === scoreHistory.slice(-4).length - 1 ? 'emerald.400' : 'gray.200'}
                                                        borderRadius="md"
                                                    />
                                                    <Text fontSize="xs" color="gray.500">
                                                        {new Date(item.date).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN', { month: 'short' })}
                                                    </Text>
                                                </VStack>
                                            ))}
                                        </HStack>
                                    </VStack>
                                )}
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Score Breakdown - from real API */}
                    <Card borderRadius="2xl" bg="white" boxShadow="sm" gridColumn={{ lg: 'span 2' }}>
                        <CardBody>
                            <HStack justify="space-between" mb={6}>
                                <HStack>
                                    <Text fontSize="xl">📊</Text>
                                    <Text fontWeight="700" color="gray.800">{t('achievements.howCalculated')}</Text>
                                </HStack>
                                <Tooltip label="Your trust score is calculated based on these factors" hasArrow>
                                    <Badge colorScheme="blue" borderRadius="full">
                                        {t('achievements.learnMore')}
                                    </Badge>
                                </Tooltip>
                            </HStack>

                            {isLoading ? (
                                <VStack spacing={4} align="stretch">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Skeleton key={i} height="60px" borderRadius="xl" />
                                    ))}
                                </VStack>
                            ) : scoreFactors.length > 0 ? (
                                <VStack align="stretch" spacing={4}>
                                    {scoreFactors.map((factor, i) => (
                                        <MotionBox
                                            key={factor.name}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                        >
                                            <HStack justify="space-between" mb={2}>
                                                <HStack>
                                                    <Text fontSize="xl">{factor.icon}</Text>
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="600" fontSize="sm">{factor.name}</Text>
                                                        <Text fontSize="xs" color="gray.500">{t('achievements.weight')}: {factor.weight}</Text>
                                                    </VStack>
                                                </HStack>
                                                <HStack>
                                                    <Text fontWeight="700" color="gray.800">{factor.value}%</Text>
                                                    <Badge
                                                        colorScheme="emerald"
                                                        borderRadius="full"
                                                        fontSize="xs"
                                                    >
                                                        {factor.impact}
                                                    </Badge>
                                                </HStack>
                                            </HStack>
                                            <Progress
                                                value={factor.value}
                                                colorScheme={
                                                    factor.value >= 80 ? 'emerald' :
                                                        factor.value >= 60 ? 'blue' :
                                                            factor.value >= 40 ? 'orange' : 'red'
                                                }
                                                borderRadius="full"
                                                h="8px"
                                            />
                                        </MotionBox>
                                    ))}
                                </VStack>
                            ) : (
                                <VStack py={8}>
                                    <Text color="gray.500">{t('achievements.noBreakdown')}</Text>
                                </VStack>
                            )}

                            {/* Tips - from real API */}
                            {trustScore?.tips && trustScore.tips.length > 0 && (
                                <Box
                                    mt={6}
                                    p={4}
                                    bg="blue.50"
                                    borderRadius="xl"
                                    border="1px solid"
                                    borderColor="blue.200"
                                >
                                    <HStack>
                                        <Text fontSize="xl">💡</Text>
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="600" color="blue.800">{t('achievements.tipTitle')}</Text>
                                            <Text fontSize="sm" color="blue.700">
                                                {trustScore.tips[0]}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                </Box>
                            )}
                        </CardBody>
                    </Card>
                </SimpleGrid>
            </Box>
        </AppLayout>
    )
}
