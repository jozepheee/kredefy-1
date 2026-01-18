'use client'

import { useState, useEffect } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, FormControl, FormLabel, Select, Slider,
    SliderTrack, SliderFilledTrack, SliderThumb, SliderMark,
    Textarea, Badge, SimpleGrid, useToast, Spinner, Alert, AlertIcon,
    Step, StepIndicator, StepStatus, StepTitle, StepDescription,
    StepSeparator, Stepper, useSteps, StepIcon, StepNumber, Skeleton
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiCheck, FiArrowRight, FiArrowLeft, FiShield } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { circlesAPI, loansAPI, Circle } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import RequestVouchPanel from '@/components/RequestVouchPanel'

const MotionBox = motion.create(Box)
const MotionCard = motion.create(Card)

const steps = [
    { title: 'Amount', description: 'How much do you need?' },
    { title: 'Purpose', description: 'Tell us why' },
    { title: 'Circle', description: 'Who will help?' },
    { title: 'Review', description: 'Confirm details' },
]

const purposeOptions = [
    { value: 'medical', label: 'Medical Emergency', icon: '🏥' },
    { value: 'education', label: 'Education / School', icon: '📚' },
    { value: 'business', label: 'Small Business', icon: '💼' },
    { value: 'bills', label: 'Bills & Utilities', icon: '💡' },
    { value: 'family', label: 'Family Event', icon: '👨‍👩‍👧' },
    { value: 'other', label: 'Other', icon: '📝' },
]

export default function LoanApplyPage() {
    const { activeStep, setActiveStep, goToNext, goToPrevious } = useSteps({
        index: 0,
        count: steps.length,
    })

    const [amount, setAmount] = useState(5000)
    const [purpose, setPurpose] = useState('')
    const [purposeNote, setPurposeNote] = useState('')
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null)
    const [tenure, setTenure] = useState(4) // weeks

    const toast = useToast()
    const router = useRouter()
    const { user, trustScore } = useAuth()

    // Fetch circles from API
    const {
        data: circles,
        isLoading: circlesLoading,
        error: circlesError,
        execute: fetchCircles
    } = useAPI<Circle[]>(circlesAPI.getMyCircles)

    // Apply loan mutation
    const applyMutation = useMutation(
        (data: { circle_id: string; amount: number; purpose: string; tenure_days: number }) =>
            loansAPI.applyLoan(data),
        {
            onSuccess: (loan) => {
                toast({
                    title: 'Loan Request Submitted! 🎉',
                    description: 'Your circle members will vote on this request',
                    status: 'success',
                    duration: 5000,
                })
                router.push('/loans')
            },
            onError: (error) => {
                toast({
                    title: 'Application Failed',
                    description: error.message,
                    status: 'error',
                    duration: 5000,
                })
            },
        }
    )

    // Load circles on mount
    useEffect(() => {
        fetchCircles()
    }, [fetchCircles])

    const selectedCircle = circles?.find(c => c.id === selectedCircleId)

    // Dynamic interest rate based on trust score
    // New users (score 0-40): 4%
    // Medium trust (40-70): 3%  
    // High trust (70-90): 2%
    // Excellent trust (90+): 1%
    const userTrustScore = trustScore?.score ?? user?.trust_score ?? 50
    const getInterestRate = (score: number): number => {
        if (score >= 90) return 0.01  // 1% for excellent
        if (score >= 70) return 0.02  // 2% for high trust
        if (score >= 40) return 0.03  // 3% for medium trust
        return 0.04                    // 4% for new users
    }
    const interestRate = getInterestRate(userTrustScore)
    const interestPercent = Math.round(interestRate * 100)

    const tenureDays = tenure * 7
    const totalRepay = Math.round(amount * (1 + interestRate))
    const weeklyEMI = Math.ceil(totalRepay / tenure)

    const handleSubmit = () => {
        if (!selectedCircleId || !purpose) {
            toast({ title: 'Please fill all fields', status: 'error', duration: 3000 })
            return
        }

        const fullPurpose = purposeNote
            ? `${purposeOptions.find(p => p.value === purpose)?.label}: ${purposeNote}`
            : purposeOptions.find(p => p.value === purpose)?.label || purpose

        applyMutation.mutate({
            circle_id: selectedCircleId,
            amount: amount,
            purpose: fullPurpose,
            tenure_days: tenureDays,
        })
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={8}>
                    <Badge colorScheme="teal" borderRadius="full" px={3} py={1}>
                        <HStack spacing={1}>
                            <FiShield size={14} />
                            <Text>Your trust score: {trustScore?.score ?? user?.trust_score ?? 0}</Text>
                        </HStack>
                    </Badge>
                    <Heading size="lg" color="gray.800">Apply for Loan</Heading>
                    <Text color="gray.500">Get help from your community</Text>
                </VStack>

                {/* Stepper */}
                <Stepper index={activeStep} colorScheme="teal" mb={8}>
                    {steps.map((step, index) => (
                        <Step key={index}>
                            <StepIndicator>
                                <StepStatus
                                    complete={<StepIcon />}
                                    incomplete={<StepNumber />}
                                    active={<StepNumber />}
                                />
                            </StepIndicator>
                            <Box flexShrink={0} display={{ base: 'none', md: 'block' }}>
                                <StepTitle>{step.title}</StepTitle>
                                <StepDescription>{step.description}</StepDescription>
                            </Box>
                            <StepSeparator />
                        </Step>
                    ))}
                </Stepper>

                {/* Step Content */}
                <MotionCard
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    bg="white"
                    borderRadius="2xl"
                    boxShadow="lg"
                    maxW="600px"
                    mx="auto"
                >
                    <CardBody p={8}>
                        {/* Step 1: Amount */}
                        {activeStep === 0 && (
                            <VStack spacing={6} align="stretch">
                                {/* Show vouch request panel if trust score is low */}
                                {(trustScore?.score ?? user?.trust_score ?? 0) < 60 && selectedCircle && (
                                    <RequestVouchPanel
                                        currentTrustScore={trustScore?.score ?? user?.trust_score ?? 0}
                                        requiredScore={60}
                                        circleMembers={selectedCircle.members || []}
                                    />
                                )}

                                <VStack spacing={1} align="center">
                                    <Text fontSize="sm" color="gray.500">You want to borrow</Text>
                                    <Text fontSize="5xl" fontWeight="800" color="emerald.600">
                                        ₹{amount.toLocaleString()}
                                    </Text>
                                </VStack>

                                <Box px={4} pt={6}>
                                    <Slider
                                        value={amount}
                                        min={1000}
                                        max={50000}
                                        step={500}
                                        onChange={setAmount}
                                        colorScheme="teal"
                                    >
                                        <SliderMark value={1000} mt={4} fontSize="xs" color="gray.500">
                                            ₹1K
                                        </SliderMark>
                                        <SliderMark value={25000} mt={4} fontSize="xs" color="gray.500">
                                            ₹25K
                                        </SliderMark>
                                        <SliderMark value={50000} mt={4} fontSize="xs" color="gray.500">
                                            ₹50K
                                        </SliderMark>
                                        <SliderTrack h="10px" borderRadius="full">
                                            <SliderFilledTrack />
                                        </SliderTrack>
                                        <SliderThumb boxSize={8} boxShadow="lg" />
                                    </Slider>
                                </Box>

                                <SimpleGrid columns={4} gap={2} pt={6}>
                                    {[2000, 5000, 10000, 20000].map((val) => (
                                        <Button
                                            key={val}
                                            size="sm"
                                            variant={amount === val ? 'solid' : 'outline'}
                                            colorScheme="teal"
                                            borderRadius="xl"
                                            onClick={() => setAmount(val)}
                                        >
                                            ₹{val / 1000}K
                                        </Button>
                                    ))}
                                </SimpleGrid>

                                {/* Tenure */}
                                <FormControl>
                                    <FormLabel fontWeight="600">Pay back in</FormLabel>
                                    <HStack spacing={2}>
                                        {[2, 4, 6, 8].map((weeks) => (
                                            <Button
                                                key={weeks}
                                                flex={1}
                                                size="md"
                                                variant={tenure === weeks ? 'solid' : 'outline'}
                                                colorScheme="teal"
                                                borderRadius="xl"
                                                onClick={() => setTenure(weeks)}
                                            >
                                                {weeks} weeks
                                            </Button>
                                        ))}
                                    </HStack>
                                </FormControl>

                                {/* EMI Preview */}
                                <HStack justify="space-between" p={4} bg="emerald.50" borderRadius="xl">
                                    <VStack align="start" spacing={0}>
                                        <Text fontSize="sm" color="gray.600">Weekly EMI</Text>
                                        <Text fontWeight="800" fontSize="xl" color="emerald.700">
                                            ₹{weeklyEMI.toLocaleString()}
                                        </Text>
                                    </VStack>
                                    <VStack align="center" spacing={0}>
                                        <Badge colorScheme={interestPercent <= 2 ? "green" : interestPercent <= 3 ? "yellow" : "orange"}
                                            borderRadius="full" px={3} py={1}>
                                            {interestPercent}% Interest
                                        </Badge>
                                        <Text fontSize="xs" color="gray.500">
                                            {userTrustScore >= 90 ? "🌟 Best rate!" :
                                                userTrustScore >= 70 ? "Great rate!" :
                                                    userTrustScore >= 40 ? "Good rate" :
                                                        "Build trust for lower rates"}
                                        </Text>
                                    </VStack>
                                    <VStack align="end" spacing={0}>
                                        <Text fontSize="sm" color="gray.600">Total Repay</Text>
                                        <Text fontWeight="600" color="gray.700">
                                            ₹{totalRepay.toLocaleString()}
                                        </Text>
                                    </VStack>
                                </HStack>
                            </VStack>
                        )}

                        {/* Step 2: Purpose */}
                        {activeStep === 1 && (
                            <VStack spacing={6} align="stretch">
                                <Text fontWeight="600" color="gray.700">
                                    Why do you need this loan?
                                </Text>
                                <SimpleGrid columns={2} gap={3}>
                                    {purposeOptions.map((opt) => (
                                        <Box
                                            key={opt.value}
                                            p={4}
                                            borderRadius="xl"
                                            border="2px solid"
                                            borderColor={purpose === opt.value ? 'emerald.400' : 'gray.200'}
                                            bg={purpose === opt.value ? 'emerald.50' : 'white'}
                                            cursor="pointer"
                                            onClick={() => setPurpose(opt.value)}
                                            _hover={{ borderColor: 'emerald.300' }}
                                            transition="all 0.2s"
                                        >
                                            <HStack>
                                                <Text fontSize="2xl">{opt.icon}</Text>
                                                <Text fontWeight="500" fontSize="sm">
                                                    {opt.label}
                                                </Text>
                                            </HStack>
                                        </Box>
                                    ))}
                                </SimpleGrid>

                                <FormControl>
                                    <FormLabel fontWeight="600">Tell us more (optional)</FormLabel>
                                    <Textarea
                                        placeholder="E.g., My father needs medicine urgently..."
                                        borderRadius="xl"
                                        value={purposeNote}
                                        onChange={(e) => setPurposeNote(e.target.value)}
                                    />
                                </FormControl>
                            </VStack>
                        )}

                        {/* Step 3: Choose Circle */}
                        {activeStep === 2 && (
                            <VStack spacing={6} align="stretch">
                                <Text fontWeight="600" color="gray.700">
                                    Which circle should help you?
                                </Text>

                                {circlesError && (
                                    <Alert status="error" borderRadius="xl">
                                        <AlertIcon />
                                        Failed to load circles
                                    </Alert>
                                )}

                                {circlesLoading ? (
                                    <VStack spacing={3}>
                                        {[1, 2, 3].map(i => (
                                            <Skeleton key={i} height="80px" borderRadius="xl" />
                                        ))}
                                    </VStack>
                                ) : circles && circles.length > 0 ? (
                                    <VStack spacing={3}>
                                        {circles.map((circle) => (
                                            <Box
                                                key={circle.id}
                                                p={4}
                                                w="full"
                                                borderRadius="xl"
                                                border="2px solid"
                                                borderColor={selectedCircleId === circle.id ? 'emerald.400' : 'gray.200'}
                                                bg={selectedCircleId === circle.id ? 'emerald.50' : 'white'}
                                                cursor="pointer"
                                                onClick={() => setSelectedCircleId(circle.id)}
                                                _hover={{ borderColor: 'emerald.300' }}
                                                transition="all 0.2s"
                                            >
                                                <HStack justify="space-between">
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="600">{circle.name}</Text>
                                                        <Text fontSize="sm" color="gray.500">
                                                            {circle.member_count} members
                                                        </Text>
                                                    </VStack>
                                                    <VStack align="end" spacing={0}>
                                                        <Text fontSize="sm" color="gray.500">Pool size</Text>
                                                        <Text fontWeight="700" color="emerald.600">
                                                            ₹{(circle.total_pool ?? circle.emergency_fund_balance ?? 0).toLocaleString()}
                                                        </Text>
                                                    </VStack>
                                                </HStack>
                                            </Box>
                                        ))}
                                    </VStack>
                                ) : (
                                    <Alert status="warning" borderRadius="xl">
                                        <AlertIcon />
                                        You need to join a circle first to apply for a loan
                                    </Alert>
                                )}
                            </VStack>
                        )}

                        {/* Step 4: Review */}
                        {activeStep === 3 && (
                            <VStack spacing={6} align="stretch">
                                <Text fontWeight="600" color="gray.700" fontSize="lg">
                                    Review your loan request
                                </Text>

                                <VStack align="stretch" spacing={4} p={4} bg="gray.50" borderRadius="xl">
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Amount</Text>
                                        <Text fontWeight="700">₹{amount.toLocaleString()}</Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Purpose</Text>
                                        <Text fontWeight="600">
                                            {purposeOptions.find(p => p.value === purpose)?.icon}{' '}
                                            {purposeOptions.find(p => p.value === purpose)?.label || 'Not specified'}
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Circle</Text>
                                        <Text fontWeight="600">
                                            {selectedCircle?.name || 'Not selected'}
                                        </Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Tenure</Text>
                                        <Text fontWeight="600">{tenure} weeks ({tenureDays} days)</Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.600">Weekly EMI</Text>
                                        <Text fontWeight="700" color="emerald.600">₹{weeklyEMI.toLocaleString()}</Text>
                                    </HStack>
                                    <HStack justify="space-between" borderTop="1px solid" borderColor="gray.200" pt={4}>
                                        <Text fontWeight="600">Total Repay</Text>
                                        <Text fontWeight="800" fontSize="xl" color="gray.800">
                                            ₹{totalRepay.toLocaleString()}
                                        </Text>
                                    </HStack>
                                </VStack>

                                <HStack p={4} bg="blue.50" borderRadius="xl" border="1px solid" borderColor="blue.200">
                                    <Text fontSize="xl">ℹ️</Text>
                                    <Text fontSize="sm" color="blue.700">
                                        Your circle members will vote on this request.
                                        You'll be notified once approved!
                                    </Text>
                                </HStack>
                            </VStack>
                        )}

                        {/* Navigation Buttons */}
                        <HStack justify="space-between" mt={8}>
                            <Button
                                variant="ghost"
                                leftIcon={<FiArrowLeft />}
                                onClick={goToPrevious}
                                isDisabled={activeStep === 0}
                            >
                                Back
                            </Button>

                            {activeStep < 3 ? (
                                <Button
                                    bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                    color="white"
                                    rightIcon={<FiArrowRight />}
                                    borderRadius="xl"
                                    onClick={goToNext}
                                    isDisabled={
                                        (activeStep === 1 && !purpose) ||
                                        (activeStep === 2 && !selectedCircleId)
                                    }
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                    color="white"
                                    rightIcon={applyMutation.isLoading ? <Spinner size="sm" /> : <FiCheck />}
                                    borderRadius="xl"
                                    size="lg"
                                    onClick={handleSubmit}
                                    isLoading={applyMutation.isLoading}
                                    loadingText="Submitting..."
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    Submit Request
                                </Button>
                            )}
                        </HStack>
                    </CardBody>
                </MotionCard>
            </Box>
        </AppLayout>
    )
}
