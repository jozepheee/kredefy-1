'use client'

import { Box, Text, VStack, HStack, Badge, Icon, CircularProgress, CircularProgressLabel } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaBrain, FaUsers, FaHistory } from 'react-icons/fa'

interface RiskFactor {
    name: string
    score: number
    weight: number
    status: 'good' | 'warning' | 'danger'
    icon: any
}

interface RiskRadarProps {
    userId?: string
    loanAmount?: number
}

const MotionBox = motion.create(Box)

export default function RiskRadar({ userId, loanAmount = 5000 }: RiskRadarProps) {
    const riskFactors: RiskFactor[] = [
        { name: 'Trust Score', score: 78, weight: 30, status: 'good', icon: FaShieldAlt },
        { name: 'Circle Backing', score: 85, weight: 25, status: 'good', icon: FaUsers },
        { name: 'Repayment History', score: 92, weight: 20, status: 'good', icon: FaHistory },
        { name: 'AI Assessment', score: 71, weight: 15, status: 'warning', icon: FaBrain },
        { name: 'Fraud Detection', score: 98, weight: 10, status: 'good', icon: FaCheckCircle },
    ]

    const overallScore = Math.round(
        riskFactors.reduce((acc, f) => acc + (f.score * f.weight / 100), 0)
    )

    const getScoreColor = (score: number) => {
        if (score >= 80) return '#10b981'
        if (score >= 60) return '#f59e0b'
        return '#ef4444'
    }

    const getStatusColor = (status: string) => {
        if (status === 'good') return 'green'
        if (status === 'warning') return 'yellow'
        return 'red'
    }

    // SVG Radar Chart
    const radarPoints = riskFactors.map((factor, i) => {
        const angle = (i / riskFactors.length) * 2 * Math.PI - Math.PI / 2
        const radius = (factor.score / 100) * 80
        return {
            x: 100 + radius * Math.cos(angle),
            y: 100 + radius * Math.sin(angle),
            labelX: 100 + 95 * Math.cos(angle),
            labelY: 100 + 95 * Math.sin(angle),
            name: factor.name,
            score: factor.score
        }
    })

    const pathD = radarPoints.map((p, i) =>
        `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z'

    return (
        <Box
            bg="linear-gradient(135deg, #0c4a6e 0%, #164e63 100%)"
            borderRadius="2xl"
            p={5}
            position="relative"
            overflow="hidden"
        >
            {/* Scanning effect */}
            <MotionBox
                position="absolute"
                top={0}
                left={0}
                w="100%"
                h="4px"
                bg="linear-gradient(90deg, transparent, cyan, transparent)"
                animate={{ y: [0, 300, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Header */}
            <HStack justify="space-between" mb={4}>
                <VStack align="start" spacing={0}>
                    <HStack>
                        <Icon as={FaShieldAlt} color="cyan.400" />
                        <Text fontSize="lg" fontWeight="800" color="white">
                            AI Risk Radar
                        </Text>
                    </HStack>
                    <Text fontSize="xs" color="cyan.200">
                        Multi-factor assessment for ₹{loanAmount.toLocaleString()}
                    </Text>
                </VStack>

                {/* Overall Score */}
                <CircularProgress
                    value={overallScore}
                    color={getScoreColor(overallScore)}
                    trackColor="whiteAlpha.200"
                    size="70px"
                    thickness="8px"
                >
                    <CircularProgressLabel>
                        <Text fontSize="lg" fontWeight="bold" color="white">
                            {overallScore}
                        </Text>
                    </CircularProgressLabel>
                </CircularProgress>
            </HStack>

            {/* Radar Chart */}
            <Box position="relative" h="220px" display="flex" justifyContent="center">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    {/* Background circles */}
                    {[20, 40, 60, 80].map(r => (
                        <circle
                            key={r}
                            cx="100"
                            cy="100"
                            r={r}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Axis lines */}
                    {riskFactors.map((_, i) => {
                        const angle = (i / riskFactors.length) * 2 * Math.PI - Math.PI / 2
                        return (
                            <line
                                key={i}
                                x1="100"
                                y1="100"
                                x2={100 + 80 * Math.cos(angle)}
                                y2={100 + 80 * Math.sin(angle)}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                            />
                        )
                    })}

                    {/* Data polygon */}
                    <motion.path
                        d={pathD}
                        fill="rgba(6, 182, 212, 0.3)"
                        stroke="#06b6d4"
                        strokeWidth="2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, type: "spring" }}
                        style={{ transformOrigin: 'center' }}
                    />

                    {/* Data points */}
                    {radarPoints.map((point, i) => (
                        <motion.g key={i}>
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r="6"
                                fill={getScoreColor(point.score)}
                                stroke="white"
                                strokeWidth="2"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                            />
                            <motion.circle
                                cx={point.x}
                                cy={point.y}
                                r="12"
                                fill="none"
                                stroke={getScoreColor(point.score)}
                                strokeWidth="1"
                                opacity="0.5"
                                animate={{ r: [12, 18, 12], opacity: [0.5, 0, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                            />
                        </motion.g>
                    ))}
                </svg>
            </Box>

            {/* Factor breakdown */}
            <VStack spacing={2} mt={2}>
                {riskFactors.map((factor, i) => (
                    <MotionBox
                        key={factor.name}
                        w="100%"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.1 }}
                    >
                        <HStack justify="space-between">
                            <HStack spacing={2}>
                                <Icon as={factor.icon} color="cyan.400" boxSize={3} />
                                <Text fontSize="xs" color="white">{factor.name}</Text>
                            </HStack>
                            <HStack spacing={2}>
                                <Badge
                                    colorScheme={getStatusColor(factor.status)}
                                    variant="subtle"
                                    fontSize="xx-small"
                                >
                                    {factor.score}%
                                </Badge>
                                <Text fontSize="xx-small" color="gray.400">
                                    ×{factor.weight}%
                                </Text>
                            </HStack>
                        </HStack>
                    </MotionBox>
                ))}
            </VStack>

            {/* AI Recommendation */}
            <MotionBox
                mt={4}
                p={3}
                bg="rgba(6, 182, 212, 0.2)"
                borderRadius="lg"
                border="1px solid"
                borderColor="cyan.500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <HStack spacing={2}>
                    <Icon as={FaBrain} color="cyan.400" />
                    <Text fontSize="xs" color="white" fontWeight="600">
                        AI Recommendation:
                    </Text>
                    <Badge colorScheme="green" variant="solid">APPROVE</Badge>
                </HStack>
                <Text fontSize="xs" color="cyan.200" mt={1}>
                    Strong trust network and clean history. Low risk profile.
                </Text>
            </MotionBox>
        </Box>
    )
}
