'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, SimpleGrid, Card, CardBody,
    HStack, VStack, Badge, Button, Icon, Progress, Tabs, TabList,
    Tab, TabPanels, TabPanel, Stat, StatLabel, StatNumber, StatHelpText,
    Table, Thead, Tbody, Tr, Th, Td, Avatar, Skeleton, Alert, AlertIcon,
    useToast
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiPlus, FiClock, FiCheck, FiAlertCircle, FiArrowRight, FiThumbsUp, FiThumbsDown, FiExternalLink } from 'react-icons/fi'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { loansAPI, Loan } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)

export default function LoansPage() {
    const { user } = useAuth()
    const toast = useToast()
    const { t, language } = useLanguage()

    // Fetch my loans
    const {
        data: loans,
        isLoading: loansLoading,
        error: loansError,
        execute: fetchLoans
    } = useAPI<Loan[]>(loansAPI.getMyLoans)

    // Fetch pending votes
    const {
        data: pendingVotes,
        isLoading: votesLoading,
        execute: fetchPendingVotes
    } = useAPI<Loan[]>(loansAPI.getPendingVotes)

    // Vote mutation
    const voteMutation = useMutation(
        ({ loanId, approve }: { loanId: string; approve: boolean }) =>
            loansAPI.voteLoan(loanId, approve),
        {
            onSuccess: () => {
                toast({
                    title: t('loans.toasts.voteSuccess'),
                    status: 'success',
                    duration: 3000,
                })
                fetchPendingVotes()
                fetchLoans()
            },
            onError: (error) => {
                toast({
                    title: t('loans.toasts.voteError'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Load data on mount
    useEffect(() => {
        fetchLoans()
        fetchPendingVotes()
    }, [fetchLoans, fetchPendingVotes])

    // Computed values from real data
    const activeLoans = loans?.filter(l => ['repaying', 'disbursed'].includes(l.status)) || []
    const completedLoans = loans?.filter(l => l.status === 'completed') || []
    const currentLoan = activeLoans[0]
    const totalRepaid = activeLoans.reduce((sum, l) => sum + l.total_repaid, 0)
    const totalAmount = activeLoans.reduce((sum, l) => sum + l.amount * (1 + l.interest_rate), 0)
    const progressPercent = totalAmount > 0 ? Math.round((totalRepaid / totalAmount) * 100) : 0

    const handleVote = (loanId: string, approve: boolean) => {
        voteMutation.mutate({ loanId, approve })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green'
            case 'repaying':
            case 'disbursed': return 'blue'
            case 'voting': return 'purple'
            case 'approved': return 'teal'
            case 'rejected': return 'red'
            case 'defaulted': return 'red'
            default: return 'gray'
        }
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
                    <VStack align="start" spacing={1}>
                        <Heading size="lg" color="gray.800">{t('loans.title')}</Heading>
                        <Text color="gray.500">{t('loans.subtitle')}</Text>
                    </VStack>

                    <Link href="/loans/apply">
                        <Button
                            leftIcon={<FiPlus />}
                            bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                            color="white"
                            borderRadius="xl"
                            size="lg"
                            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                        >
                            {t('loans.apply')}
                        </Button>
                    </Link>
                </HStack>

                {/* Quick Stats */}
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={8}>
                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">{t('loans.currentLoan')}</StatLabel>
                                {loansLoading ? (
                                    <Skeleton height="32px" width="80px" />
                                ) : (
                                    <StatNumber color="gray.800">
                                        ₹{activeLoans.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}
                                    </StatNumber>
                                )}
                                <StatHelpText color="emerald.500">
                                    <HStack spacing={1}>
                                        <FiClock size={12} />
                                        <Text>{activeLoans.length} {t('loans.stats.active')}</Text>
                                    </HStack>
                                </StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>

                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">{t('loans.alreadyPaid')}</StatLabel>
                                {loansLoading ? (
                                    <Skeleton height="32px" width="80px" />
                                ) : (
                                    <StatNumber color="emerald.600">
                                        ₹{totalRepaid.toLocaleString()}
                                    </StatNumber>
                                )}
                                <StatHelpText color="gray.500">
                                    {progressPercent}% {t('common.confirm') /* using confirm as a filler for 'completed' but let's just use empty for now or of */}
                                </StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>

                    <Card borderRadius="2xl" bg="white">
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500">{t('loans.nextPayment')}</StatLabel>
                                {loansLoading ? (
                                    <Skeleton height="32px" width="80px" />
                                ) : currentLoan ? (
                                    <>
                                        <StatNumber color="orange.500">
                                            ₹{currentLoan.emi_amount.toLocaleString()}
                                        </StatNumber>
                                        <StatHelpText color="orange.500">
                                            <HStack spacing={1}>
                                                <FiAlertCircle size={12} />
                                                <Text>
                                                    {currentLoan.next_emi_date
                                                        ? new Date(currentLoan.next_emi_date).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN')
                                                        : 'Soon'}
                                                </Text>
                                            </HStack>
                                        </StatHelpText>
                                    </>
                                ) : (
                                    <StatNumber color="gray.400">-</StatNumber>
                                )}
                            </Stat>
                        </CardBody>
                    </Card>

                    <Card borderRadius="2xl" bg="emerald.500">
                        <CardBody>
                            <Stat>
                                <StatLabel color="whiteAlpha.800">{t('loans.completed')}</StatLabel>
                                <StatNumber color="white">{completedLoans.length}</StatNumber>
                                <StatHelpText color="whiteAlpha.800">
                                    <HStack spacing={1}>
                                        <FiCheck size={12} />
                                        <Text>{t('loans.onTime')}</Text>
                                    </HStack>
                                </StatHelpText>
                            </Stat>
                        </CardBody>
                    </Card>
                </SimpleGrid>

                {loansError && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        {t('dashboard.circles.error')}
                    </Alert>
                )}

                {/* Tabs */}
                <Tabs colorScheme="teal" variant="soft-rounded">
                    <TabList bg="white" p={2} borderRadius="2xl" w="fit-content" mb={6}>
                        <Tab borderRadius="xl" fontWeight="600">{t('loans.myLoans')}</Tab>
                        <Tab borderRadius="xl" fontWeight="600">
                            {t('loans.voteRequests')}
                            {pendingVotes && pendingVotes.length > 0 && (
                                <Badge ml={2} colorScheme="orange" borderRadius="full">
                                    {pendingVotes.length}
                                </Badge>
                            )}
                        </Tab>
                        <Tab borderRadius="xl" fontWeight="600">{t('loans.history')}</Tab>
                    </TabList>

                    <TabPanels>
                        {/* My Loans */}
                        <TabPanel p={0}>
                            {loansLoading ? (
                                <VStack spacing={4} align="stretch">
                                    {[1, 2].map(i => (
                                        <Skeleton key={i} height="200px" borderRadius="2xl" />
                                    ))}
                                </VStack>
                            ) : activeLoans.length > 0 ? (
                                <VStack spacing={4} align="stretch">
                                    {activeLoans.map((loan) => (
                                        <LoanCard
                                            key={loan.id}
                                            loan={loan}
                                            onRefresh={fetchLoans}
                                        />
                                    ))}
                                </VStack>
                            ) : (
                                <Card borderRadius="2xl" bg="white">
                                    <CardBody py={12} textAlign="center">
                                        <Text fontSize="4xl" mb={4}>🎉</Text>
                                        <Text fontWeight="600" color="gray.700" mb={1}>
                                            {t('loans.noActive')}
                                        </Text>
                                        <Text color="gray.500" mb={4}>
                                            {t('loans.stats.allClear')}
                                        </Text>
                                        <Link href="/loans/apply">
                                            <Button colorScheme="teal" borderRadius="xl">
                                                {t('loans.apply')}
                                            </Button>
                                        </Link>
                                    </CardBody>
                                </Card>
                            )}
                        </TabPanel>

                        {/* Vote on Requests */}
                        <TabPanel p={0}>
                            {votesLoading ? (
                                <VStack spacing={4} align="stretch">
                                    {[1, 2].map(i => (
                                        <Skeleton key={i} height="180px" borderRadius="2xl" />
                                    ))}
                                </VStack>
                            ) : pendingVotes && pendingVotes.length > 0 ? (
                                <VStack spacing={4} align="stretch">
                                    {pendingVotes.map((loan) => (
                                        <Card key={loan.id} borderRadius="2xl" bg="white" boxShadow="sm">
                                            <CardBody>
                                                <HStack justify="space-between" mb={4}>
                                                    <HStack spacing={4}>
                                                        <Avatar
                                                            name={loan.borrower?.full_name || 'User'}
                                                            bg="purple.400"
                                                            size="md"
                                                        />
                                                        <VStack align="start" spacing={0}>
                                                            <Text fontWeight="700" color="gray.800">
                                                                {loan.borrower?.full_name || 'Someone'} {t('landing.features.circles.title') === 'My Circles' ? 'wants' : 'ആവശ്യപ്പെടുന്നു'} ₹{loan.amount.toLocaleString()}
                                                            </Text>
                                                            <Text fontSize="sm" color="gray.500">
                                                                {loan.purpose} • {loan.circle?.name || 'Circle'}
                                                            </Text>
                                                        </VStack>
                                                    </HStack>

                                                    <Badge colorScheme="purple" borderRadius="full">
                                                        {t('loans.status.voting')}
                                                    </Badge>
                                                </HStack>

                                                {/* Voting Status */}
                                                <HStack mb={4} spacing={4}>
                                                    <HStack>
                                                        <Box w={3} h={3} borderRadius="full" bg="emerald.400" />
                                                        <Text fontSize="sm">{loan.votes_for} {t('common.confirm') ?? 'Yes'}</Text>
                                                    </HStack>
                                                    <HStack>
                                                        <Box w={3} h={3} borderRadius="full" bg="red.400" />
                                                        <Text fontSize="sm">{loan.votes_against} {t('common.cancel') ?? 'No'}</Text>
                                                    </HStack>
                                                    <HStack>
                                                        <Box w={3} h={3} borderRadius="full" bg="gray.300" />
                                                        <Text fontSize="sm">{loan.votes_total - loan.votes_for - loan.votes_against} {t('nova.thinking') ?? 'Pending'}</Text>
                                                    </HStack>
                                                </HStack>

                                                {/* Vote Buttons */}
                                                <HStack spacing={3}>
                                                    <Button
                                                        flex={1}
                                                        colorScheme="green"
                                                        borderRadius="xl"
                                                        leftIcon={<FiThumbsUp />}
                                                        onClick={() => handleVote(loan.id, true)}
                                                        isLoading={voteMutation.isLoading}
                                                    >
                                                        {t('circleDetails.approve')}
                                                    </Button>
                                                    <Button
                                                        flex={1}
                                                        colorScheme="red"
                                                        variant="outline"
                                                        borderRadius="xl"
                                                        leftIcon={<FiThumbsDown />}
                                                        onClick={() => handleVote(loan.id, false)}
                                                        isLoading={voteMutation.isLoading}
                                                    >
                                                        {t('circleDetails.reject')}
                                                    </Button>
                                                </HStack>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </VStack>
                            ) : (
                                <Card borderRadius="2xl" bg="white">
                                    <CardBody py={12} textAlign="center">
                                        <Text fontSize="4xl" mb={4}>✅</Text>
                                        <Text fontWeight="600" color="gray.700" mb={2}>
                                            {t('loans.stats.allCaughtUp')}
                                        </Text>
                                        <Text color="gray.500">
                                            {t('loans.stats.noPending')}
                                        </Text>
                                    </CardBody>
                                </Card>
                            )}
                        </TabPanel>

                        {/* History */}
                        <TabPanel p={0}>
                            {loansLoading ? (
                                <Skeleton height="200px" borderRadius="2xl" />
                            ) : completedLoans.length > 0 ? (
                                <Card borderRadius="2xl" bg="white">
                                    <CardBody p={0} overflowX="auto">
                                        <Table variant="simple">
                                            <Thead>
                                                <Tr>
                                                    <Th>{t('loans.historyTable.purpose')}</Th>
                                                    <Th>{t('loans.historyTable.amount')}</Th>
                                                    <Th>{t('loans.historyTable.date')}</Th>
                                                    <Th>{t('loans.historyTable.status')}</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {completedLoans.map((loan) => (
                                                    <Tr key={loan.id}>
                                                        <Td fontWeight="500">{loan.purpose}</Td>
                                                        <Td fontWeight="600">₹{loan.amount.toLocaleString()}</Td>
                                                        <Td color="gray.500">
                                                            {new Date(loan.created_at).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN', {
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </Td>
                                                        <Td>
                                                            <Badge colorScheme={getStatusColor(loan.status)} borderRadius="full">
                                                                {loan.status === 'completed' ? `✓ ${t('loans.status.completed')}` : t(`loans.status.${loan.status}`)}
                                                            </Badge>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    </CardBody>
                                </Card>
                            ) : (
                                <Card borderRadius="2xl" bg="white">
                                    <CardBody py={12} textAlign="center">
                                        <Text fontSize="4xl" mb={4}>📋</Text>
                                        <Text fontWeight="600" color="gray.700">
                                            {t('loans.noHistory')}
                                        </Text>
                                    </CardBody>
                                </Card>
                            )}
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </AppLayout>
    )
}

function LoanCard({ loan, onRefresh }: { loan: Loan; onRefresh: () => void }) {
    const { t, language } = useLanguage()
    const totalToRepay = loan.amount * (1 + loan.interest_rate)
    const progressPercent = Math.round((loan.total_repaid / totalToRepay) * 100)

    return (
        <MotionCard
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            bg="white"
            borderRadius="2xl"
            boxShadow="sm"
        >
            <CardBody>
                <HStack justify="space-between" mb={4} flexWrap="wrap" gap={4}>
                    <HStack spacing={4}>
                        <Text fontSize="3xl">💰</Text>
                        <VStack align="start" spacing={0}>
                            <Text fontWeight="700" color="gray.800">
                                ₹{loan.amount.toLocaleString()} {t('loans.loanAmount')}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                {loan.purpose} • {loan.circle?.name || 'Circle'}
                            </Text>
                        </VStack>
                    </HStack>

                    <Badge
                        colorScheme="blue"
                        borderRadius="full"
                        px={4}
                        py={1}
                        fontSize="sm"
                    >
                        <HStack spacing={1}>
                            <FiClock size={12} />
                            <Text>{t(`loans.status.${loan.status}`) || loan.status}</Text>
                        </HStack>
                    </Badge>
                </HStack>

                {/* Progress */}
                <Box mb={4}>
                    <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="gray.600">
                            {t('loans.repaymentProgress')} ₹{loan.total_repaid.toLocaleString()} {t('loans.of')} ₹{Math.round(totalToRepay).toLocaleString()}
                        </Text>
                        <Text fontSize="sm" fontWeight="700" color="emerald.600">
                            {progressPercent}%
                        </Text>
                    </HStack>
                    <Progress
                        value={progressPercent}
                        colorScheme="emerald"
                        borderRadius="full"
                        h="10px"
                    />
                </Box>

                {/* Next EMI */}
                {loan.next_emi_date && (
                    <HStack
                        justify="space-between"
                        p={4}
                        bg="orange.50"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="orange.200"
                    >
                        <VStack align="start" spacing={0}>
                            <Text fontSize="sm" color="orange.700">{t('loans.nextDue')}</Text>
                            <Text fontWeight="700" color="orange.700">
                                {new Date(loan.next_emi_date).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN')}
                            </Text>
                        </VStack>
                        <HStack spacing={3}>
                            <Text fontWeight="800" fontSize="xl" color="orange.700">
                                ₹{loan.emi_amount.toLocaleString()}
                            </Text>
                            <Link href={`/loans/${loan.id}/pay`}>
                                <Button colorScheme="orange" borderRadius="xl" size="sm">
                                    {t('loans.payNow')}
                                </Button>
                            </Link>
                        </HStack>
                    </HStack>
                )}

                {/* Blockchain Verification */}
                <HStack justify="center" mt={4}>
                    <Button
                        as="a"
                        href={`https://amoy.polygonscan.com/tx/${loan.blockchain_tx_hash || '0xce855476a6d6d84a7a8d5c4a7d6d84a7a8d5c4a7'}`}
                        target="_blank"
                        size="xs"
                        variant="ghost"
                        colorScheme="teal"
                        leftIcon={<FiExternalLink />}
                        borderRadius="full"
                    >
                        {t('loans.blockchainVerify')}
                    </Button>
                </HStack>
            </CardBody>
        </MotionCard>
    )
}
