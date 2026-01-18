'use client'

import { Box, VStack, HStack, Text, Badge, Icon, Progress, Tooltip } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FaTrophy, FaMedal, FaFire, FaChartLine } from 'react-icons/fa'
import { useEffect, useState } from 'react'

interface CircleRanking {
    circle_id: string
    name: string
    score: number
    rank: number
    repaymentRate?: number
    activeBondCount?: number
}

const MotionBox = motion.create(Box)

export default function CircleLeaderboard() {
    const [leaderboard, setLeaderboard] = useState<CircleRanking[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // In production, fetch from API: GET /api/v1/gamification/leaderboard
        // For demo, use mock data that looks realistic
        const mockLeaderboard: CircleRanking[] = [
            { circle_id: '1', name: 'Mahila Bachat Gat', score: 950, rank: 1, repaymentRate: 98, activeBondCount: 12 },
            { circle_id: '2', name: 'Kisan Sahayata', score: 820, rank: 2, repaymentRate: 92, activeBondCount: 8 },
            { circle_id: '3', name: 'Youth Finance Club', score: 780, rank: 3, repaymentRate: 89, activeBondCount: 6 },
            { circle_id: '4', name: 'Teachers Trust', score: 650, rank: 4, repaymentRate: 85, activeBondCount: 5 },
            { circle_id: '5', name: 'Daily Workers Union', score: 520, rank: 5, repaymentRate: 78, activeBondCount: 4 },
        ]

        setTimeout(() => {
            setLeaderboard(mockLeaderboard)
            setLoading(false)
        }, 500)
    }, [])

    const getRankIcon = (rank: number) => {
        if (rank === 1) return { icon: FaTrophy, color: 'yellow.400', bg: 'yellow.50' }
        if (rank === 2) return { icon: FaMedal, color: 'gray.400', bg: 'gray.50' }
        if (rank === 3) return { icon: FaMedal, color: 'orange.400', bg: 'orange.50' }
        return { icon: FaChartLine, color: 'teal.400', bg: 'teal.50' }
    }

    return (
        <Box bg="white" borderRadius="2xl" p={5} boxShadow="lg" border="1px solid" borderColor="gray.100">
            <HStack justify="space-between" mb={4}>
                <HStack>
                    <Icon as={FaFire} color="orange.500" boxSize={5} />
                    <Text fontWeight="bold" fontSize="lg" color="gray.800">Circle Wars</Text>
                    <Badge colorScheme="green" fontSize="xs">LIVE</Badge>
                </HStack>
                <Tooltip label="Top circle gets 0% interest next week!">
                    <Badge colorScheme="purple" variant="outline" cursor="help">🏆 Weekly Contest</Badge>
                </Tooltip>
            </HStack>

            <VStack spacing={3} align="stretch">
                {loading ? (
                    <Text color="gray.400" textAlign="center" py={4}>Loading rankings...</Text>
                ) : (
                    leaderboard.map((circle, i) => {
                        const rankStyle = getRankIcon(circle.rank)
                        return (
                            <MotionBox
                                key={circle.circle_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                p={3}
                                bg={circle.rank === 1 ? 'yellow.50' : 'gray.50'}
                                borderRadius="xl"
                                border="1px solid"
                                borderColor={circle.rank === 1 ? 'yellow.200' : 'gray.100'}
                                _hover={{ transform: 'translateX(4px)', borderColor: 'teal.300' }}
                                style={{ transition: 'all 0.2s' }}
                            >
                                <HStack justify="space-between">
                                    <HStack spacing={3}>
                                        <Box
                                            p={2}
                                            borderRadius="lg"
                                            bg={rankStyle.bg}
                                            color={rankStyle.color}
                                        >
                                            <Icon as={rankStyle.icon} boxSize={4} />
                                        </Box>
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="600" color="gray.800" fontSize="sm">
                                                {circle.name}
                                            </Text>
                                            <HStack spacing={2}>
                                                <Text fontSize="xs" color="gray.500">
                                                    {circle.repaymentRate}% repaid
                                                </Text>
                                                <Text fontSize="xs" color="gray.400">•</Text>
                                                <Text fontSize="xs" color="gray.500">
                                                    {circle.activeBondCount} active bonds
                                                </Text>
                                            </HStack>
                                        </VStack>
                                    </HStack>
                                    <VStack align="end" spacing={0}>
                                        <Text fontWeight="bold" color="teal.600" fontSize="lg">
                                            {circle.score}
                                        </Text>
                                        <Text fontSize="xs" color="gray.400">points</Text>
                                    </VStack>
                                </HStack>
                                {circle.rank === 1 && (
                                    <Progress
                                        value={100}
                                        size="xs"
                                        colorScheme="yellow"
                                        mt={2}
                                        borderRadius="full"
                                    />
                                )}
                            </MotionBox>
                        )
                    })
                )}
            </VStack>

            <Box mt={4} p={3} bg="teal.50" borderRadius="lg" textAlign="center">
                <Text fontSize="xs" color="teal.700" fontWeight="500">
                    🔥 Your circle: <strong>Mahila Bachat Gat</strong> is #1! Keep the streak!
                </Text>
            </Box>
        </Box>
    )
}
