'use client'

import { Box, Text, VStack, HStack, Badge, Progress, Icon } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { FaRupeeSign, FaArrowRight, FaCheckCircle, FaClock } from 'react-icons/fa'

interface PaymentStream {
    id: string
    from: string
    to: string
    totalAmount: number
    amountPaid: number
    frequency: string
    nextPayment: string
    status: 'active' | 'paused' | 'completed'
}

const MotionBox = motion.create(Box)

const mockStreams: PaymentStream[] = [
    {
        id: '1',
        from: 'Your Wallet',
        to: 'Mahila Bachat Gat',
        totalAmount: 5000,
        amountPaid: 2500,
        frequency: 'Weekly ₹500',
        nextPayment: 'In 3 days',
        status: 'active'
    },
    {
        id: '2',
        from: 'Your Wallet',
        to: 'Ravi Kumar (Loan #42)',
        totalAmount: 3000,
        amountPaid: 1800,
        frequency: 'Weekly ₹300',
        nextPayment: 'Tomorrow',
        status: 'active'
    }
]

export default function PaymentStreaming() {
    const [streams, setStreams] = useState<PaymentStream[]>(mockStreams)
    const [activeFlow, setActiveFlow] = useState<string | null>(null)
    const [particles, setParticles] = useState<{ id: number; streamId: string }[]>([])

    // Simulate real-time payment flow
    useEffect(() => {
        const interval = setInterval(() => {
            const randomStream = streams[Math.floor(Math.random() * streams.length)]
            if (randomStream.status === 'active') {
                setActiveFlow(randomStream.id)
                setParticles(prev => [...prev, { id: Date.now(), streamId: randomStream.id }])

                setTimeout(() => setActiveFlow(null), 1500)
                setTimeout(() => {
                    setParticles(prev => prev.slice(-5)) // Keep last 5 particles
                }, 2000)
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [streams])

    return (
        <Box
            bg="linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
            borderRadius="2xl"
            p={5}
            position="relative"
            overflow="hidden"
        >
            {/* Animated background grid */}
            <Box
                position="absolute"
                inset={0}
                backgroundImage="radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)"
                backgroundSize="30px 30px"
            />

            {/* Header */}
            <HStack justify="space-between" mb={6} position="relative">
                <VStack align="start" spacing={0}>
                    <HStack>
                        <Text fontSize="xl" fontWeight="900" color="white">
                            Payment Streams
                        </Text>
                        <MotionBox
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <Badge colorScheme="purple" variant="solid">LIVE</Badge>
                        </MotionBox>
                    </HStack>
                    <Text fontSize="sm" color="purple.200">
                        Real-time programmable payments
                    </Text>
                </VStack>

                {/* Total streaming indicator */}
                <VStack align="end" spacing={0}>
                    <Text fontSize="2xl" fontWeight="bold" color="white">
                        ₹8,000
                    </Text>
                    <Text fontSize="xs" color="purple.300">
                        Total Streaming
                    </Text>
                </VStack>
            </HStack>

            {/* Stream Cards */}
            <VStack spacing={4} position="relative">
                {streams.map((stream, index) => (
                    <MotionBox
                        key={stream.id}
                        w="100%"
                        bg={activeFlow === stream.id ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255,255,255,0.05)'}
                        borderRadius="xl"
                        p={4}
                        border="1px solid"
                        borderColor={activeFlow === stream.id ? 'purple.400' : 'whiteAlpha.200'}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        position="relative"
                        overflow="hidden"
                    >
                        {/* Flow animation when active */}
                        <AnimatePresence>
                            {activeFlow === stream.id && (
                                <MotionBox
                                    position="absolute"
                                    top={0}
                                    left={0}
                                    h="100%"
                                    w="100%"
                                    bg="linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)"
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1 }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Stream content */}
                        <VStack align="stretch" spacing={3}>
                            {/* From → To with animated arrow */}
                            <HStack justify="space-between">
                                <HStack spacing={3}>
                                    <Box
                                        p={2}
                                        borderRadius="lg"
                                        bg="purple.500"
                                    >
                                        <Icon as={FaRupeeSign} color="white" />
                                    </Box>
                                    <VStack align="start" spacing={0}>
                                        <Text fontSize="sm" fontWeight="600" color="white">
                                            {stream.from}
                                        </Text>
                                        <HStack spacing={2}>
                                            <MotionBox
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                <Icon as={FaArrowRight} color="purple.400" boxSize={3} />
                                            </MotionBox>
                                            <Text fontSize="xs" color="purple.300">
                                                {stream.to}
                                            </Text>
                                        </HStack>
                                    </VStack>
                                </HStack>

                                <Badge
                                    colorScheme={stream.status === 'active' ? 'green' : 'gray'}
                                    variant="subtle"
                                >
                                    <HStack spacing={1}>
                                        <Icon as={stream.status === 'active' ? FaCheckCircle : FaClock} />
                                        <Text>{stream.status}</Text>
                                    </HStack>
                                </Badge>
                            </HStack>

                            {/* Progress bar */}
                            <Box>
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="purple.300">
                                        {stream.frequency}
                                    </Text>
                                    <Text fontSize="xs" color="white" fontWeight="600">
                                        ₹{stream.amountPaid.toLocaleString()} / ₹{stream.totalAmount.toLocaleString()}
                                    </Text>
                                </HStack>
                                <Box position="relative">
                                    <Progress
                                        value={(stream.amountPaid / stream.totalAmount) * 100}
                                        size="sm"
                                        borderRadius="full"
                                        bg="whiteAlpha.200"
                                        sx={{
                                            '& > div': {
                                                background: 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                                            }
                                        }}
                                    />
                                    {/* Animated pulse at progress end */}
                                    {stream.status === 'active' && (
                                        <MotionBox
                                            position="absolute"
                                            top="50%"
                                            left={`${(stream.amountPaid / stream.totalAmount) * 100}%`}
                                            transform="translate(-50%, -50%)"
                                            w={3}
                                            h={3}
                                            borderRadius="full"
                                            bg="purple.400"
                                            animate={{
                                                scale: [1, 1.5, 1],
                                                opacity: [1, 0.5, 1]
                                            }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        />
                                    )}
                                </Box>
                            </Box>

                            {/* Next payment */}
                            <HStack justify="space-between">
                                <HStack spacing={1}>
                                    <Icon as={FaClock} color="purple.400" boxSize={3} />
                                    <Text fontSize="xs" color="purple.300">
                                        Next: {stream.nextPayment}
                                    </Text>
                                </HStack>
                                <Text fontSize="xs" color="green.400" fontWeight="600">
                                    {Math.round((stream.amountPaid / stream.totalAmount) * 100)}% Complete
                                </Text>
                            </HStack>
                        </VStack>
                    </MotionBox>
                ))}
            </VStack>

            {/* Floating coins animation */}
            {particles.map(particle => (
                <MotionBox
                    key={particle.id}
                    position="absolute"
                    top="50%"
                    left="20%"
                    w={4}
                    h={4}
                    borderRadius="full"
                    bg="yellow.400"
                    boxShadow="0 0 10px rgba(250, 204, 21, 0.5)"
                    initial={{ x: 0, y: 0, opacity: 1 }}
                    animate={{ x: 200, y: -50, opacity: 0 }}
                    transition={{ duration: 1.5 }}
                >
                    <Text fontSize="8px" textAlign="center" lineHeight="16px">₹</Text>
                </MotionBox>
            ))}
        </Box>
    )
}
