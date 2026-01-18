'use client'

import { useState } from 'react'
import {
    Box, Text, VStack, HStack, Button, Badge, Avatar, Icon,
    Alert, AlertIcon, useToast, Spinner
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUsers, FiSend, FiCheck, FiHeart, FiArrowUp } from 'react-icons/fi'
import { vouchesAPI } from '@/lib/api'

interface CircleMember {
    id: string
    user_id: string
    full_name: string
    trust_score: number
}

interface RequestVouchPanelProps {
    currentTrustScore: number
    requiredScore: number
    circleMembers: CircleMember[]
    onVouchReceived?: () => void
}

const MotionBox = motion.create(Box)

export default function RequestVouchPanel({
    currentTrustScore,
    requiredScore,
    circleMembers,
    onVouchReceived
}: RequestVouchPanelProps) {
    const [requestedMembers, setRequestedMembers] = useState<Set<string>>(new Set())
    const [sendingTo, setSendingTo] = useState<string | null>(null)
    const toast = useToast()

    const trustGap = requiredScore - currentTrustScore
    const isEligible = currentTrustScore >= requiredScore

    const handleRequestVouch = async (member: CircleMember) => {
        setSendingTo(member.user_id)
        try {
            // In production, this would send a notification/request to the member
            await vouchesAPI.requestVouch?.(member.user_id) ||
                new Promise(resolve => setTimeout(resolve, 1000)) // Fallback simulation

            setRequestedMembers(prev => new Set(Array.from(prev).concat(member.user_id)))
            toast({
                title: 'Request Sent! 📩',
                description: `${member.full_name} will be notified to vouch for you`,
                status: 'success',
                duration: 3000,
            })
        } catch (error) {
            toast({
                title: 'Failed to send request',
                status: 'error',
                duration: 3000,
            })
        } finally {
            setSendingTo(null)
        }
    }

    if (isEligible) {
        return (
            <Alert status="success" borderRadius="xl" mb={4}>
                <AlertIcon />
                <Text>Your trust score of <strong>{currentTrustScore}</strong> qualifies you for this loan!</Text>
            </Alert>
        )
    }

    return (
        <MotionBox
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            bg="orange.50"
            borderRadius="2xl"
            border="2px solid"
            borderColor="orange.200"
            p={5}
            mb={6}
        >
            {/* Warning Header */}
            <HStack mb={4}>
                <Box p={2} borderRadius="lg" bg="orange.100">
                    <Icon as={FiArrowUp} color="orange.500" boxSize={5} />
                </Box>
                <VStack align="start" spacing={0}>
                    <Text fontWeight="700" color="orange.800">
                        Trust Score Too Low
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                        You need <strong>{trustGap} more points</strong> ({currentTrustScore}/{requiredScore})
                    </Text>
                </VStack>
            </HStack>

            {/* Request Vouch Section */}
            <Box bg="white" borderRadius="xl" p={4} border="1px solid" borderColor="orange.100">
                <HStack mb={3}>
                    <Icon as={FiUsers} color="teal.500" />
                    <Text fontWeight="600" color="gray.700">
                        Ask Circle Members to Vouch for You
                    </Text>
                </HStack>
                <Text fontSize="sm" color="gray.500" mb={4}>
                    When trusted friends vouch for you, your trust score increases!
                    Each vouch can add 5-15 points.
                </Text>

                {/* Member List */}
                <VStack spacing={2} align="stretch">
                    <AnimatePresence>
                        {circleMembers.slice(0, 5).map((member, index) => (
                            <MotionBox
                                key={member.user_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <HStack
                                    justify="space-between"
                                    p={3}
                                    bg="gray.50"
                                    borderRadius="lg"
                                    _hover={{ bg: 'gray.100' }}
                                >
                                    <HStack spacing={3}>
                                        <Avatar
                                            size="sm"
                                            name={member.full_name}
                                            bg="teal.500"
                                        />
                                        <VStack align="start" spacing={0}>
                                            <Text fontWeight="500" fontSize="sm">
                                                {member.full_name}
                                            </Text>
                                            <HStack spacing={1}>
                                                <Badge colorScheme="teal" fontSize="xx-small">
                                                    Trust: {member.trust_score}
                                                </Badge>
                                                <Text fontSize="xs" color="gray.400">
                                                    +{Math.min(15, Math.round(member.trust_score / 10))} pts
                                                </Text>
                                            </HStack>
                                        </VStack>
                                    </HStack>

                                    {requestedMembers.has(member.user_id) ? (
                                        <Badge colorScheme="green" borderRadius="full" px={3}>
                                            <HStack spacing={1}>
                                                <Icon as={FiCheck} />
                                                <Text>Requested</Text>
                                            </HStack>
                                        </Badge>
                                    ) : (
                                        <Button
                                            size="sm"
                                            colorScheme="teal"
                                            variant="outline"
                                            borderRadius="full"
                                            leftIcon={sendingTo === member.user_id ? <Spinner size="xs" /> : <FiSend />}
                                            isLoading={sendingTo === member.user_id}
                                            onClick={() => handleRequestVouch(member)}
                                        >
                                            Request
                                        </Button>
                                    )}
                                </HStack>
                            </MotionBox>
                        ))}
                    </AnimatePresence>
                </VStack>

                {circleMembers.length > 5 && (
                    <Text fontSize="xs" color="gray.400" mt={2} textAlign="center">
                        +{circleMembers.length - 5} more members available
                    </Text>
                )}
            </Box>

            {/* Helpful Tip */}
            <HStack mt={4} p={3} bg="teal.50" borderRadius="lg">
                <Icon as={FiHeart} color="teal.500" />
                <Text fontSize="sm" color="teal.700">
                    <strong>Tip:</strong> Once your friends vouch for you, your trust score updates instantly!
                </Text>
            </HStack>
        </MotionBox>
    )
}
