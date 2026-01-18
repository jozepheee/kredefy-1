'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, SimpleGrid, Skeleton, Alert,
    Progress, Stat, StatLabel, StatNumber, StatHelpText,
    Table, Thead, Tbody, Tr, Th, Td, useToast, Icon
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiClock, FiDollarSign, FiCheck, FiCreditCard } from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { loansAPI, paymentsAPI, Loan } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'

const MotionCard = motion.create(Card)

export default function LoanDetailPage() {
    const params = useParams()
    const router = useRouter()
    const loanId = params?.id as string
    const toast = useToast()
    const { user } = useAuth()

    // Fetch loan details
    const {
        data: loan,
        isLoading: loanLoading,
        error: loanError,
        execute: fetchLoan
    } = useAPI<Loan>(() => loansAPI.getLoan(loanId))

    // Fetch repayments
    const {
        data: repayments,
        isLoading: repaymentsLoading,
        execute: fetchRepayments
    } = useAPI<any[]>(() => loansAPI.getRepayments(loanId))

    // Create payment checkout
    const payMutation = useMutation(
        (amount: number) => paymentsAPI.createCheckout(loanId, amount),
        {
            onSuccess: (data) => {
                // Redirect to Dodo payment page
                window.location.href = data.checkout_url
            },
            onError: (error) => {
                toast({
                    title: 'Payment failed',
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    useEffect(() => {
        if (loanId) {
            fetchLoan()
            fetchRepayments()
        }
    }, [loanId, fetchLoan, fetchRepayments])

    if (loanError) {
        return (
            <AppLayout>
                <Box p={4} bg="red.50" borderRadius="xl" border="1px solid" borderColor="red.200">
                    <HStack>
                        <Text color="red.500">⚠️</Text>
                        <Text color="red.700">Failed to load loan details.</Text>
                    </HStack>
                </Box>
            </AppLayout>
        )
    }

    const totalToRepay = loan ? loan.amount * (1 + loan.interest_rate) : 0
    const progressPercent = loan ? Math.round((loan.total_repaid / totalToRepay) * 100) : 0
    const remaining = totalToRepay - (loan?.total_repaid || 0)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green'
            case 'repaying':
            case 'disbursed': return 'blue'
            case 'voting': return 'purple'
            case 'approved': return 'teal'
            case 'rejected':
            case 'defaulted': return 'red'
            default: return 'gray'
        }
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Back Button */}
                <Button
                    variant="ghost"
                    leftIcon={<FiArrowLeft />}
                    mb={4}
                    onClick={() => router.push('/loans')}
                >
                    Back to Loans
                </Button>

                {loanLoading ? (
                    <VStack spacing={6}>
                        <Skeleton height="200px" borderRadius="2xl" w="100%" />
                        <Skeleton height="150px" borderRadius="2xl" w="100%" />
                    </VStack>
                ) : loan ? (
                    <>
                        {/* Loan Header */}
                        <Card
                            bg="linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                            borderRadius="2xl"
                            mb={6}
                        >
                            <CardBody p={8}>
                                <HStack justify="space-between" flexWrap="wrap" gap={4}>
                                    <VStack align="start" spacing={2}>
                                        <Badge
                                            bg="whiteAlpha.200"
                                            color="white"
                                            borderRadius="full"
                                            px={3}
                                            colorScheme={getStatusColor(loan.status)}
                                        >
                                            {loan.status.toUpperCase()}
                                        </Badge>
                                        <Heading color="white" size="2xl">
                                            ₹{loan.amount.toLocaleString()}
                                        </Heading>
                                        <Text color="whiteAlpha.800" fontSize="lg">
                                            {loan.purpose}
                                        </Text>
                                        <Text color="whiteAlpha.700" fontSize="sm">
                                            {loan.circle?.name || 'Circle'} • {loan.tenure_days} days
                                        </Text>
                                    </VStack>

                                    {loan.status === 'repaying' && (
                                        <VStack
                                            bg="whiteAlpha.200"
                                            p={4}
                                            borderRadius="xl"
                                            backdropFilter="blur(10px)"
                                            align="start"
                                        >
                                            <Text color="whiteAlpha.800" fontSize="sm">Next EMI</Text>
                                            <Text color="white" fontWeight="800" fontSize="2xl">
                                                ₹{loan.emi_amount.toLocaleString()}
                                            </Text>
                                            <Text color="whiteAlpha.800" fontSize="sm">
                                                Due: {loan.next_emi_date
                                                    ? new Date(loan.next_emi_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                                    : 'Soon'}
                                            </Text>
                                        </VStack>
                                    )}
                                </HStack>
                            </CardBody>
                        </Card>

                        {/* Stats */}
                        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={6}>
                            <Card borderRadius="2xl" bg="white">
                                <CardBody>
                                    <Stat>
                                        <StatLabel color="gray.500">Total Amount</StatLabel>
                                        <StatNumber color="gray.800">₹{loan.amount.toLocaleString()}</StatNumber>
                                        <StatHelpText color="gray.500">Principal</StatHelpText>
                                    </Stat>
                                </CardBody>
                            </Card>

                            <Card borderRadius="2xl" bg="white">
                                <CardBody>
                                    <Stat>
                                        <StatLabel color="gray.500">Total to Repay</StatLabel>
                                        <StatNumber color="purple.600">₹{Math.round(totalToRepay).toLocaleString()}</StatNumber>
                                        <StatHelpText color="gray.500">{(loan.interest_rate * 100).toFixed(0)}% interest</StatHelpText>
                                    </Stat>
                                </CardBody>
                            </Card>

                            <Card borderRadius="2xl" bg="white">
                                <CardBody>
                                    <Stat>
                                        <StatLabel color="gray.500">Already Paid</StatLabel>
                                        <StatNumber color="emerald.600">₹{loan.total_repaid.toLocaleString()}</StatNumber>
                                        <StatHelpText color="emerald.500">{progressPercent}% done</StatHelpText>
                                    </Stat>
                                </CardBody>
                            </Card>

                            <Card borderRadius="2xl" bg="white">
                                <CardBody>
                                    <Stat>
                                        <StatLabel color="gray.500">Remaining</StatLabel>
                                        <StatNumber color="orange.600">₹{Math.round(remaining).toLocaleString()}</StatNumber>
                                        <StatHelpText color="gray.500">
                                            {Math.ceil(remaining / loan.emi_amount)} EMIs left
                                        </StatHelpText>
                                    </Stat>
                                </CardBody>
                            </Card>
                        </SimpleGrid>

                        {/* Progress */}
                        <Card borderRadius="2xl" bg="white" mb={6}>
                            <CardBody>
                                <HStack justify="space-between" mb={4}>
                                    <Text fontWeight="700" color="gray.800">Repayment Progress</Text>
                                    <Text fontWeight="800" color="emerald.600">{progressPercent}%</Text>
                                </HStack>
                                <Progress
                                    value={progressPercent}
                                    colorScheme="emerald"
                                    borderRadius="full"
                                    h="16px"
                                    mb={4}
                                />
                                <SimpleGrid columns={4} gap={2}>
                                    {[25, 50, 75, 100].map((milestone) => (
                                        <VStack
                                            key={milestone}
                                            p={2}
                                            borderRadius="lg"
                                            bg={progressPercent >= milestone ? 'emerald.100' : 'gray.100'}
                                        >
                                            <Box
                                                w={6}
                                                h={6}
                                                borderRadius="full"
                                                bg={progressPercent >= milestone ? 'emerald.500' : 'gray.300'}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                            >
                                                {progressPercent >= milestone && <FiCheck color="white" size={14} />}
                                            </Box>
                                            <Text fontSize="xs" fontWeight="600" color={progressPercent >= milestone ? 'emerald.600' : 'gray.500'}>
                                                {milestone}%
                                            </Text>
                                        </VStack>
                                    ))}
                                </SimpleGrid>
                            </CardBody>
                        </Card>

                        {/* Pay Now Section */}
                        {loan.status === 'repaying' && loan.borrower_id === user?.id && (
                            <Card
                                borderRadius="2xl"
                                bg="linear-gradient(135deg, #f97316 0%, #fb923c 100%)"
                                mb={6}
                            >
                                <CardBody p={6}>
                                    <HStack justify="space-between" flexWrap="wrap" gap={4}>
                                        <VStack align="start" spacing={1}>
                                            <HStack>
                                                <Icon as={FiClock} color="white" />
                                                <Text color="whiteAlpha.900" fontWeight="600">
                                                    EMI Due: {loan.next_emi_date
                                                        ? new Date(loan.next_emi_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
                                                        : 'Soon'}
                                                </Text>
                                            </HStack>
                                            <Text color="white" fontSize="2xl" fontWeight="800">
                                                ₹{loan.emi_amount.toLocaleString()}
                                            </Text>
                                        </VStack>
                                        <Button
                                            size="lg"
                                            bg="white"
                                            color="orange.600"
                                            borderRadius="xl"
                                            leftIcon={<FiCreditCard />}
                                            onClick={() => payMutation.mutate(loan.emi_amount)}
                                            isLoading={payMutation.isLoading}
                                            _hover={{ bg: 'gray.100' }}
                                        >
                                            Pay with Dodo
                                        </Button>
                                    </HStack>
                                </CardBody>
                            </Card>
                        )}

                        {/* Voting Status for pending loans */}
                        {loan.status === 'voting' && (
                            <Card borderRadius="2xl" bg="white" mb={6}>
                                <CardBody>
                                    <HStack justify="space-between" mb={4}>
                                        <Text fontWeight="700" color="gray.800">Voting Status</Text>
                                        <Badge colorScheme="purple" borderRadius="full">Waiting for votes</Badge>
                                    </HStack>

                                    <SimpleGrid columns={3} gap={4}>
                                        <VStack p={4} bg="emerald.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="emerald.600">{loan.votes_for}</Text>
                                            <Text fontSize="sm" color="gray.600">✓ Approved</Text>
                                        </VStack>
                                        <VStack p={4} bg="red.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="red.600">{loan.votes_against}</Text>
                                            <Text fontSize="sm" color="gray.600">✗ Rejected</Text>
                                        </VStack>
                                        <VStack p={4} bg="gray.50" borderRadius="xl">
                                            <Text fontSize="2xl" fontWeight="800" color="gray.600">
                                                {loan.votes_total - loan.votes_for - loan.votes_against}
                                            </Text>
                                            <Text fontSize="sm" color="gray.600">⏳ Pending</Text>
                                        </VStack>
                                    </SimpleGrid>
                                </CardBody>
                            </Card>
                        )}

                        {/* Repayment History */}
                        <Card borderRadius="2xl" bg="white">
                            <CardBody>
                                <HStack mb={4}>
                                    <Text fontSize="xl">📜</Text>
                                    <Text fontWeight="700" color="gray.800">Repayment History</Text>
                                </HStack>

                                {repaymentsLoading ? (
                                    <VStack spacing={3}>
                                        {[1, 2, 3].map(i => (
                                            <Skeleton key={i} height="50px" borderRadius="xl" />
                                        ))}
                                    </VStack>
                                ) : repayments && repayments.length > 0 ? (
                                    <Table variant="simple">
                                        <Thead>
                                            <Tr>
                                                <Th>Date</Th>
                                                <Th>Amount</Th>
                                                <Th>Method</Th>
                                                <Th>Status</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {repayments.map((payment, i) => (
                                                <Tr key={i}>
                                                    <Td color="gray.600">
                                                        {new Date(payment.created_at).toLocaleDateString('en-IN')}
                                                    </Td>
                                                    <Td fontWeight="600">₹{payment.amount.toLocaleString()}</Td>
                                                    <Td>
                                                        <Badge colorScheme="blue" borderRadius="full">
                                                            {payment.method || 'Dodo'}
                                                        </Badge>
                                                    </Td>
                                                    <Td>
                                                        <Badge colorScheme="green" borderRadius="full">
                                                            ✓ Successful
                                                        </Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                ) : (
                                    <VStack py={6}>
                                        <Text fontSize="3xl">📋</Text>
                                        <Text color="gray.500">No repayments yet</Text>
                                    </VStack>
                                )}
                            </CardBody>
                        </Card>
                    </>
                ) : null}
            </Box>
        </AppLayout>
    )
}
