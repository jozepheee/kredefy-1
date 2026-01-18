'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, SimpleGrid, Alert, AlertIcon, Spinner,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb, SliderMark,
    useToast, Skeleton, Icon, Progress
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiAlertCircle, FiCheck, FiShield, FiClock } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { emergencyAPI } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)
const MotionBox = motion.create(Box)

export default function EmergencyPage() {
    const [amount, setAmount] = useState(2000)
    const [reason, setReason] = useState('')
    const toast = useToast()
    const router = useRouter()
    const { t } = useLanguage()
    const { user, trustScore } = useAuth()

    // Check eligibility from API
    const {
        data: eligibility,
        isLoading: eligibilityLoading,
        error: eligibilityError,
        execute: checkEligibility
    } = useAPI<{ eligible: boolean; max_amount: number; reason?: string }>(
        emergencyAPI.checkEligibility
    )

    // Request emergency mutation
    const requestMutation = useMutation(
        (data: { amount: number; reason: string }) => emergencyAPI.requestEmergency(data),
        {
            onSuccess: (response) => {
                toast({
                    title: 'Emergency Request Submitted! 🚨',
                    description: 'We are processing your request. Money will be sent within 2 hours.',
                    status: 'success',
                    duration: 6000,
                })
                router.push('/loans')
            },
            onError: (error) => {
                toast({
                    title: 'Request Failed',
                    description: error.message,
                    status: 'error',
                    duration: 5000,
                })
            },
        }
    )

    // Load eligibility on mount
    useEffect(() => {
        checkEligibility()
    }, [checkEligibility])

    const handleRequest = () => {
        if (!reason) {
            toast({ title: t('emergency.request.reason'), status: 'error', duration: 3000 })
            return
        }
        requestMutation.mutate({ amount, reason })
    }

    const maxAmount = eligibility?.max_amount ?? 5000
    const isEligible = eligibility?.eligible ?? false
    const score = trustScore?.score ?? user?.trust_score ?? 0

    const reasons = [
        { value: 'medical', label: t('emergency.reasons.medical'), icon: '🏥' },
        { value: 'accident', label: t('emergency.reasons.accident'), icon: '🚗' },
        { value: 'disaster', label: t('emergency.reasons.disaster'), icon: '🌊' },
        { value: 'death', label: t('emergency.reasons.death'), icon: '🙏' },
    ]

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={6}>
                    <Badge colorScheme="orange" borderRadius="full" px={3} py={1} fontSize="sm">
                        <HStack spacing={1}>
                            <FiAlertCircle size={14} />
                            <Text>{t('emergency.tag')}</Text>
                        </HStack>
                    </Badge>
                    <Heading size="lg" color="gray.800">{t('emergency.title')}</Heading>
                    <Text color="gray.500">
                        {t('emergency.subtitle')}
                    </Text>
                </VStack>

                {/* Info Banner */}
                <Card
                    bg="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                    borderRadius="2xl"
                    mb={6}
                    border="1px solid"
                    borderColor="orange.200"
                >
                    <CardBody>
                        <HStack spacing={4}>
                            <Text fontSize="3xl">🚨</Text>
                            <VStack align="start" spacing={1}>
                                <Text fontWeight="700" color="gray.800">
                                    {t('emergency.howItWorks.title')}
                                </Text>
                                <Text fontSize="sm" color="gray.700">
                                    {t('emergency.howItWorks.desc')}
                                </Text>
                            </VStack>
                        </HStack>
                    </CardBody>
                </Card>

                {eligibilityError && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        Failed to check eligibility. Please refresh.
                    </Alert>
                )}

                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                    {/* Eligibility Card */}
                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        borderRadius="2xl"
                        bg="white"
                        boxShadow="lg"
                    >
                        <CardBody p={6}>
                            <VStack spacing={6} align="stretch">
                                <HStack justify="space-between">
                                    <Text fontWeight="700" color="gray.800">{t('emergency.eligibility')}</Text>
                                    {eligibilityLoading ? (
                                        <Skeleton height="24px" width="80px" borderRadius="full" />
                                    ) : isEligible ? (
                                        <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                                            <HStack spacing={1}>
                                                <FiCheck size={12} />
                                                <Text>{t('emergency.eligible')}</Text>
                                            </HStack>
                                        </Badge>
                                    ) : (
                                        <Badge colorScheme="red" borderRadius="full" px={3} py={1}>
                                            {t('emergency.notEligible')}
                                        </Badge>
                                    )}
                                </HStack>

                                {/* Trust Score Check */}
                                <Box
                                    p={4}
                                    borderRadius="xl"
                                    bg={score >= 60 ? 'emerald.50' : 'red.50'}
                                    border="1px solid"
                                    borderColor={score >= 60 ? 'emerald.200' : 'red.200'}
                                >
                                    <HStack justify="space-between" mb={2}>
                                        <HStack>
                                            <Icon as={FiShield} color={score >= 60 ? 'emerald.600' : 'red.600'} />
                                            <Text fontWeight="600">{t('emergency.trustScore')}</Text>
                                        </HStack>
                                        <Text fontWeight="700" color={score >= 60 ? 'emerald.700' : 'red.700'}>
                                            {score}/100
                                        </Text>
                                    </HStack>
                                    <Progress
                                        value={score}
                                        colorScheme={score >= 60 ? 'emerald' : 'red'}
                                        borderRadius="full"
                                        h="8px"
                                    />
                                    <Text fontSize="xs" color="gray.600" mt={2}>
                                        {score >= 60
                                            ? t('emergency.trustCheck.pass')
                                            : t('emergency.trustCheck.fail')}
                                    </Text>
                                </Box>

                                {/* Max Amount */}
                                <Box p={4} borderRadius="xl" bg="gray.50">
                                    <HStack justify="space-between">
                                        <Text color="gray.600">{t('emergency.maxAmount')}</Text>
                                        {eligibilityLoading ? (
                                            <Skeleton height="28px" width="80px" />
                                        ) : (
                                            <Text fontWeight="800" fontSize="xl" color="orange.600">
                                                ₹{maxAmount.toLocaleString()}
                                            </Text>
                                        )}
                                    </HStack>
                                </Box>

                                {/* Processing Time */}
                                <HStack p={4} borderRadius="xl" bg="blue.50" spacing={4}>
                                    <Icon as={FiClock} color="blue.600" boxSize={6} />
                                    <VStack align="start" spacing={0}>
                                        <Text fontWeight="600" color="blue.800">{t('emergency.processing.title')}</Text>
                                        <Text fontSize="sm" color="blue.700">
                                            {t('emergency.processing.desc')}
                                        </Text>
                                    </VStack>
                                </HStack>

                                {!isEligible && eligibility?.reason && (
                                    <Alert status="warning" borderRadius="xl">
                                        <AlertIcon />
                                        <Text fontSize="sm">{eligibility.reason}</Text>
                                    </Alert>
                                )}
                            </VStack>
                        </CardBody>
                    </MotionCard>

                    {/* Request Form */}
                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        borderRadius="2xl"
                        bg="white"
                        boxShadow="lg"
                        opacity={isEligible ? 1 : 0.6}
                        pointerEvents={isEligible ? 'auto' : 'none'}
                    >
                        <CardBody p={6}>
                            <VStack spacing={6} align="stretch">
                                <Text fontWeight="700" color="gray.800">{t('emergency.request.title')}</Text>

                                {/* Amount Slider */}
                                <Box>
                                    <HStack justify="space-between" mb={2}>
                                        <Text fontSize="sm" color="gray.500">{t('emergency.request.amount')}</Text>
                                        <Text fontWeight="800" fontSize="2xl" color="orange.600">
                                            ₹{amount.toLocaleString()}
                                        </Text>
                                    </HStack>
                                    <Slider
                                        value={amount}
                                        min={500}
                                        max={maxAmount}
                                        step={500}
                                        onChange={setAmount}
                                        colorScheme="orange"
                                        isDisabled={!isEligible}
                                    >
                                        <SliderMark value={500} mt={4} fontSize="xs" color="gray.500">
                                            ₹500
                                        </SliderMark>
                                        <SliderMark value={maxAmount} mt={4} fontSize="xs" color="gray.500" ml={-8}>
                                            ₹{(maxAmount / 1000)}K
                                        </SliderMark>
                                        <SliderTrack h="10px" borderRadius="full">
                                            <SliderFilledTrack />
                                        </SliderTrack>
                                        <SliderThumb boxSize={8} boxShadow="lg" />
                                    </Slider>
                                </Box>

                                {/* Reason Selection */}
                                <Box>
                                    <Text fontSize="sm" color="gray.500" mb={3}>{t('emergency.request.reason')}</Text>
                                    <SimpleGrid columns={2} gap={2}>
                                        {reasons.map((r) => (
                                            <Box
                                                key={r.value}
                                                p={4}
                                                borderRadius="xl"
                                                border="2px solid"
                                                borderColor={reason === r.value ? 'orange.400' : 'gray.200'}
                                                bg={reason === r.value ? 'orange.50' : 'white'}
                                                cursor="pointer"
                                                onClick={() => setReason(r.value)}
                                                _hover={{ borderColor: 'orange.300' }}
                                                transition="all 0.2s"
                                            >
                                                <HStack>
                                                    <Text fontSize="2xl">{r.icon}</Text>
                                                    <Text fontWeight="500" fontSize="sm">{r.label}</Text>
                                                </HStack>
                                            </Box>
                                        ))}
                                    </SimpleGrid>
                                </Box>

                                {/* Submit Button */}
                                <Button
                                    w="full"
                                    size="lg"
                                    bg="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
                                    color="white"
                                    borderRadius="xl"
                                    leftIcon={requestMutation.isLoading ? <Spinner size="sm" /> : <FiAlertCircle />}
                                    onClick={handleRequest}
                                    isLoading={requestMutation.isLoading}
                                    loadingText="Submitting..."
                                    isDisabled={!isEligible || !reason}
                                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                                >
                                    {t('emergency.request.button')} ₹{amount.toLocaleString()} {t('emergency.request.now')}
                                </Button>

                                <Text fontSize="xs" color="gray.400" textAlign="center">
                                    {t('emergency.request.warning')}
                                </Text>
                            </VStack>
                        </CardBody>
                    </MotionCard>
                </SimpleGrid>
            </Box>
        </AppLayout>
    )
}
