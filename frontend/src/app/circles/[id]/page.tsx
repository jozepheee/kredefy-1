'use client'

import { useEffect, useState, use } from 'react'
import {
    Box, Heading, Text, SimpleGrid, Card, CardBody,
    HStack, VStack, Badge, Button, Avatar, Icon,
    useToast, Skeleton, Alert, AlertIcon, Progress,
    Tabs, TabList, TabPanels, Tab, TabPanel,
    Divider, Tag, TagLabel, Stat, StatLabel, StatNumber,
    StatHelpText, IconButton, Tooltip
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import {
    FiUsers, FiTrendingUp, FiShield, FiCalendar,
    FiCheckCircle, FiXCircle, FiInfo, FiArrowLeft, FiMoreVertical,
    FiExternalLink, FiDollarSign
} from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { circlesAPI, loansAPI, Circle, CircleMember, Loan } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionBox = motion.create(Box)
const MotionCard = motion.create(Card)

export default function CircleDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: circleId } = use(params)
    const router = useRouter()
    const toast = useToast()
    const { user } = useAuth()
    const { t, language } = useLanguage()

    // Fetch Circle Data
    const {
        data: circle,
        isLoading: isCircleLoading,
        error: circleError,
        execute: fetchCircle
    } = useAPI<Circle>(() => circlesAPI.getCircle(circleId))

    // Fetch Members
    const {
        data: members,
        isLoading: isMembersLoading,
        execute: fetchMembers
    } = useAPI<CircleMember[]>(() => circlesAPI.getMembers(circleId))

    // Create Vote Mutation
    const voteMutation = useMutation(
        ({ loanId, approve }: { loanId: string; approve: boolean }) =>
            loansAPI.voteLoan(loanId, approve),
        {
            onSuccess: () => {
                toast({ title: t('circleDetails.voted'), status: 'success' })
                fetchCircle() // Refresh to see updated vote counts
            },
            onError: (err) => {
                toast({ title: t('common.error'), description: err.message, status: 'error' })
            }
        }
    )

    useEffect(() => {
        fetchCircle()
        fetchMembers()
    }, [circleId, fetchCircle, fetchMembers])

    if (isCircleLoading) return (
        <AppLayout>
            <VStack spacing={6} align="stretch" p={4}>
                <Skeleton height="200px" borderRadius="2xl" />
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                    <Skeleton height="100px" borderRadius="xl" />
                    <Skeleton height="100px" borderRadius="xl" />
                    <Skeleton height="100px" borderRadius="xl" />
                </SimpleGrid>
                <Skeleton height="400px" borderRadius="2xl" />
            </VStack>
        </AppLayout>
    )

    if (circleError || !circle) return (
        <AppLayout>
            <Alert status="error" borderRadius="xl">
                <AlertIcon />
                {t('common.error')}
            </Alert>
            <Button mt={4} onClick={() => router.back()}>{t('common.back')}</Button>
        </AppLayout>
    )

    const averageTrust = members
        ? Math.round(members.reduce((acc, m) => acc + m.trust_score, 0) / members.length)
        : 0

    const getHealthLabel = (trust: number) => {
        if (trust >= 800) return t('circleDetails.health.excellent')
        if (trust >= 600) return t('circleDetails.health.good')
        if (trust >= 400) return t('circleDetails.health.fair')
        return t('circleDetails.health.poor')
    }

    const getHealthColor = (trust: number) => {
        if (trust >= 800) return 'green'
        if (trust >= 600) return 'blue'
        if (trust >= 400) return 'orange'
        return 'red'
    }

    return (
        <AppLayout>
            <Box pb={16}>
                {/* Header Navigation */}
                <HStack mb={6} justify="space-between">
                    <Button
                        leftIcon={<FiArrowLeft />}
                        variant="ghost"
                        onClick={() => router.back()}
                        borderRadius="xl"
                    >
                        {t('common.back')}
                    </Button>
                    <HStack>
                        <Tooltip label={t('circleDetails.leaveCircle')}>
                            <IconButton
                                aria-label="More"
                                icon={<FiMoreVertical />}
                                variant="outline"
                                borderRadius="xl"
                            />
                        </Tooltip>
                        <Button
                            bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                            color="white"
                            borderRadius="xl"
                            leftIcon={<FiDollarSign />}
                            _hover={{ transform: 'translateY(-2px)' }}
                            onClick={() => router.push(`/loans/apply?circleId=${circleId}`)}
                        >
                            {t('circles.requestLoan')}
                        </Button>
                    </HStack>
                </HStack>

                <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
                    {/* Left Column: Stats & Info */}
                    <VStack align="stretch" spacing={6}>
                        {/* Circle Identity Card */}
                        <MotionCard
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            borderRadius="2xl"
                            bg="white"
                            overflow="hidden"
                            boxShadow="xl"
                        >
                            <Box h="120px" bg="teal.500" position="relative">
                                <Box
                                    position="absolute"
                                    bottom="-40px"
                                    left="24px"
                                    p={1}
                                    bg="white"
                                    borderRadius="2xl"
                                    boxShadow="lg"
                                >
                                    <Avatar size="2xl" name={circle.name} borderRadius="xl" />
                                </Box>
                            </Box>
                            <CardBody pt="50px" pb={6}>
                                <VStack align="start" spacing={2} mb={4}>
                                    <Heading size="md">{circle.name}</Heading>
                                    <Badge colorScheme="teal" borderRadius="full" px={3}>
                                        {circle.my_role === 'admin' ? t('circleDetails.memberInfo.admin') : circle.my_role}
                                    </Badge>
                                </VStack>
                                <Divider mb={4} />
                                <VStack align="stretch" spacing={3}>
                                    <HStack justify="space-between">
                                        <Text color="gray.500" fontSize="sm">{t('circles.inviteCode')}</Text>
                                        <Tag colorScheme="gray" variant="outline" borderRadius="full">
                                            <TagLabel fontWeight="800" letterSpacing="1px">{circle.invite_code}</TagLabel>
                                        </Tag>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.500" fontSize="sm">{t('circles.members')}</Text>
                                        <Text fontWeight="700">{circle.member_count}</Text>
                                    </HStack>
                                    <HStack justify="space-between">
                                        <Text color="gray.500" fontSize="sm">{t('circles.poolSize')}</Text>
                                        <Text fontWeight="800" color="emerald.600">₹{circle.total_pool.toLocaleString()}</Text>
                                    </HStack>
                                </VStack>
                            </CardBody>
                        </MotionCard>

                        {/* Health Meter */}
                        <Card borderRadius="2xl" p={6} boxShadow="md">
                            <VStack align="stretch" spacing={4}>
                                <HStack justify="space-between">
                                    <HStack>
                                        <Icon as={FiShield} color="blue.500" />
                                        <Text fontWeight="700">{t('circleDetails.poolHealth')}</Text>
                                    </HStack>
                                    <Badge colorScheme={getHealthColor(averageTrust)} borderRadius="full">
                                        {getHealthLabel(averageTrust)}
                                    </Badge>
                                </HStack>
                                <Progress value={averageTrust / 10} colorScheme={getHealthColor(averageTrust)} borderRadius="full" h="10px" />
                                <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.500">{t('circleDetails.health.avgTrust')}: {averageTrust}</Text>
                                    <HStack spacing={1}>
                                        <Icon as={FiTrendingUp} color="green.500" boxSize={3} />
                                        <Text fontSize="xs" color="green.500">+2%</Text>
                                    </HStack>
                                </HStack>
                            </VStack>
                        </Card>

                        {isMembersLoading ? <Skeleton height="200px" /> : averageTrust < 500 && (
                            <Alert status="warning" borderRadius="xl">
                                <AlertIcon />
                                <Box>
                                    <Text fontSize="sm" fontWeight="800">{t('circleDetails.lowTrustWarning')}</Text>
                                </Box>
                            </Alert>
                        )}
                    </VStack>

                    {/* Right Column: Main Content Tabs */}
                    <Box gridColumn={{ base: "span 1", lg: "span 2" }}>
                        <Tabs variant="soft-rounded" colorScheme="teal" isLazy>
                            <TabList bg="white" p={2} borderRadius="2xl" boxShadow="sm" mb={6}>
                                <Tab borderRadius="xl" flex={1} py={3}>
                                    <HStack>
                                        <Icon as={FiUsers} />
                                        <Text>{t('circleDetails.tabs.members')}</Text>
                                    </HStack>
                                </Tab>
                                <Tab borderRadius="xl" flex={1} py={3}>
                                    <HStack>
                                        <Icon as={FiShield} />
                                        <Text>{t('circleDetails.tabs.active')}</Text>
                                    </HStack>
                                </Tab>
                                <Tab borderRadius="xl" flex={1} py={3}>
                                    <HStack>
                                        <Icon as={FiCalendar} />
                                        <Text>{t('circleDetails.tabs.history')}</Text>
                                    </HStack>
                                </Tab>
                            </TabList>

                            <TabPanels>
                                {/* Members Tab */}
                                <TabPanel p={0}>
                                    <VStack spacing={4} align="stretch">
                                        {isMembersLoading ? (
                                            [1, 2, 3].map(i => <Skeleton key={i} height="80px" borderRadius="xl" />)
                                        ) : members?.map((m) => (
                                            <MotionBox
                                                key={m.id}
                                                whileHover={{ x: 4 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Card borderRadius="xl" boxShadow="sm">
                                                    <CardBody p={4}>
                                                        <HStack justify="space-between">
                                                            <HStack spacing={4}>
                                                                <Avatar name={m.full_name} size="md" bg="teal.100" color="teal.800" />
                                                                <VStack align="start" spacing={0}>
                                                                    <HStack>
                                                                        <Text fontWeight="700">{m.full_name}</Text>
                                                                        {m.role === 'admin' && <Badge size="xs" colorScheme="purple">{t('circleDetails.memberInfo.admin')}</Badge>}
                                                                    </HStack>
                                                                    <Text fontSize="xs" color="gray.500">{t('circleDetails.memberInfo.joined')} {new Date(m.joined_at).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN')}</Text>
                                                                </VStack>
                                                            </HStack>
                                                            <VStack align="end" spacing={0}>
                                                                <Tag size="sm" colorScheme={m.trust_score > 70 ? 'green' : 'orange'} borderRadius="full">
                                                                    <TagLabel>{m.trust_score}</TagLabel>
                                                                </Tag>
                                                                <Text fontSize="xx-small" color="gray.400" mt={1}>BHAROSA</Text>
                                                            </VStack>
                                                        </HStack>
                                                    </CardBody>
                                                </Card>
                                            </MotionBox>
                                        ))}
                                    </VStack>
                                </TabPanel>

                                {/* Active Decisions Tab */}
                                <TabPanel p={0}>
                                    <VStack spacing={6} align="stretch">
                                        <Alert status="info" borderRadius="xl" variant="subtle">
                                            <AlertIcon />
                                            {t('circleDetails.votingStatus.pending')}
                                        </Alert>

                                        {/* High-Fidelity Placeholder for a decision in progress */}
                                        <MotionCard
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            borderRadius="2xl"
                                            border="1px solid"
                                            borderColor="blue.100"
                                            bg="blue.50"
                                        >
                                            <CardBody>
                                                <VStack align="stretch" spacing={4}>
                                                    <HStack justify="space-between">
                                                        <HStack>
                                                            <Avatar size="sm" name="Dummy Member" />
                                                            <Text fontWeight="800">{t('circleDetails.votingStatus.newLoan')}</Text>
                                                        </HStack>
                                                        <Tag colorScheme="blue" borderRadius="full">{t('circleDetails.voting')}</Tag>
                                                    </HStack>

                                                    <Box p={4} bg="white" borderRadius="xl">
                                                        <SimpleGrid columns={2} spacing={4}>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="xs" color="gray.500">{t('circleDetails.votingStatus.amountRequested')}</Text>
                                                                <Text fontWeight="900" fontSize="lg">₹5,000</Text>
                                                            </VStack>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontSize="xs" color="gray.500">{t('circleDetails.votingStatus.purpose')}</Text>
                                                                <Text fontWeight="700">Small Business Setup</Text>
                                                            </VStack>
                                                        </SimpleGrid>
                                                    </Box>

                                                    <VStack align="stretch" spacing={2}>
                                                        <HStack justify="space-between" fontSize="sm">
                                                            <Text fontWeight="600">{t('circleDetails.votingStatus.consensus')}</Text>
                                                            <Text color="gray.500">2 / 5 {t('circleDetails.votingStatus.voted')}</Text>
                                                        </HStack>
                                                        <Progress value={40} colorScheme="blue" borderRadius="full" h="6px" />
                                                    </VStack>

                                                    <HStack spacing={4}>
                                                        <Button
                                                            flex={1}
                                                            leftIcon={<FiCheckCircle />}
                                                            colorScheme="green"
                                                            borderRadius="xl"
                                                            isLoading={voteMutation.isLoading}
                                                            onClick={() => voteMutation.mutate({ loanId: 'demo', approve: true })}
                                                        >
                                                            {t('circleDetails.approve')}
                                                        </Button>
                                                        <Button
                                                            flex={1}
                                                            leftIcon={<FiXCircle />}
                                                            variant="outline"
                                                            colorScheme="red"
                                                            borderRadius="xl"
                                                            isLoading={voteMutation.isLoading}
                                                            onClick={() => voteMutation.mutate({ loanId: 'demo', approve: false })}
                                                        >
                                                            {t('circleDetails.reject')}
                                                        </Button>
                                                    </HStack>
                                                </VStack>
                                            </CardBody>
                                        </MotionCard>
                                    </VStack>
                                </TabPanel>

                                {/* History Tab */}
                                <TabPanel p={0}>
                                    <VStack spacing={4} align="stretch">
                                        {[1, 2].map(i => (
                                            <HStack key={i} p={4} bg="gray.50" borderRadius="xl" spacing={4}>
                                                <Box p={2} bg="gray.200" borderRadius="lg">
                                                    <FiCheckCircle color="gray.500" />
                                                </Box>
                                                <VStack align="start" spacing={0}>
                                                    <Text fontWeight="700">Loan Repaid Successfully</Text>
                                                    <Text fontSize="xs" color="gray.500">Member: John Doe • ₹2,000 • 2 days ago</Text>
                                                </VStack>
                                                <Divider flex={1} orientation="horizontal" visibility="hidden" />
                                                <Icon as={FiExternalLink} color="gray.400" />
                                            </HStack>
                                        ))}
                                    </VStack>
                                </TabPanel>
                            </TabPanels>
                        </Tabs>
                    </Box>
                </SimpleGrid>
            </Box>
        </AppLayout>
    )
}
