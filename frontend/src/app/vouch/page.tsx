'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Avatar, Badge, SimpleGrid, Icon, Skeleton,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody,
    ModalCloseButton, useDisclosure, FormControl, FormLabel,
    Slider, SliderTrack, SliderFilledTrack, SliderThumb, useToast,
    Alert, AlertIcon
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiHeart, FiPlus, FiShield, FiStar, FiCheck } from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { vouchesAPI, circlesAPI, Vouch, Circle, CircleMember } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)

export default function VouchPage() {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null)
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null)
    const [vouchLevel, setVouchLevel] = useState<string>('basic')
    const [stakeAmount, setStakeAmount] = useState(30)
    const toast = useToast()
    const { t, language } = useLanguage()
    const { user, saathiBalance } = useAuth()

    // Fetch vouches given from API
    const {
        data: vouchesGiven,
        isLoading: givenLoading,
        error: givenError,
        execute: fetchGiven
    } = useAPI<Vouch[]>(vouchesAPI.getGiven)

    // Fetch vouches received from API
    const {
        data: vouchesReceived,
        isLoading: receivedLoading,
        execute: fetchReceived
    } = useAPI<Vouch[]>(vouchesAPI.getReceived)

    // Fetch circles for member selection
    const {
        data: circles,
        isLoading: circlesLoading,
        execute: fetchCircles
    } = useAPI<Circle[]>(circlesAPI.getMyCircles)

    // Fetch circle members when a circle is selected
    const {
        data: circleMembers,
        isLoading: membersLoading,
        execute: fetchMembers
    } = useAPI<CircleMember[]>((circleId: string) => circlesAPI.getMembers(circleId))

    // Create vouch mutation
    const createVouchMutation = useMutation(
        (data: { vouchee_id: string; circle_id: string; vouch_level: string; saathi_required: number }) =>
            vouchesAPI.createVouch(data),
        {
            onSuccess: (vouch) => {
                toast({
                    title: t('vouch.toasts.createSuccess'),
                    description: `${t('vouch.given.staked')} ${stakeAmount} SAATHI ${t('common.for') ?? 'for'} ${selectedMember?.full_name || 'your friend'}`,
                    status: 'success',
                    duration: 4000,
                })
                onClose()
                setSelectedMember(null)
                setSelectedCircleId(null)
                fetchGiven()
            },
            onError: (error) => {
                toast({
                    title: t('vouch.toasts.createError'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Revoke vouch mutation
    const revokeMutation = useMutation(
        (vouchId: string) => vouchesAPI.revokeVouch(vouchId),
        {
            onSuccess: () => {
                toast({
                    title: t('vouch.toasts.revokeSuccess'),
                    status: 'info',
                    duration: 3000,
                })
                fetchGiven()
            },
            onError: (error) => {
                toast({
                    title: t('vouch.toasts.revokeError'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Load data on mount
    useEffect(() => {
        fetchGiven()
        fetchReceived()
        fetchCircles()
    }, [fetchGiven, fetchReceived, fetchCircles])

    // Load members when circle is selected
    useEffect(() => {
        if (selectedCircleId) {
            fetchMembers(selectedCircleId)
        }
    }, [selectedCircleId, fetchMembers])

    const handleCreateVouch = () => {
        if (!selectedMember || !selectedCircleId) {
            toast({ title: t('vouch.toasts.selectPerson'), status: 'error', duration: 3000 })
            return
        }
        createVouchMutation.mutate({
            vouchee_id: selectedMember.user_id,
            circle_id: selectedCircleId,
            vouch_level: vouchLevel,
            saathi_required: stakeAmount,
        })
    }

    const vouchLevels = [
        { name: 'basic', label: t('vouch.levels.basic'), min: 10, max: 50, impact: 5, color: 'gray' },
        { name: 'strong', label: t('vouch.levels.strong'), min: 50, max: 200, impact: 10, color: 'blue' },
        { name: 'maximum', label: t('vouch.levels.maximum'), min: 200, max: 500, impact: 20, color: 'purple' },
    ]

    const selectedLevel = vouchLevels.find(l => l.name === vouchLevel)!
    const totalStaked = vouchesGiven?.reduce((sum, v) => sum + v.saathi_staked, 0) || 0

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'maximum': return 'purple'
            case 'strong': return 'blue'
            default: return 'gray'
        }
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header Section */}
                <Box
                    bg="linear-gradient(135deg, #1A365D 0%, #2D3748 100%)"
                    borderRadius="3xl"
                    p={8}
                    mb={8}
                    position="relative"
                    overflow="hidden"
                    boxShadow="xl"
                >
                    <Box
                        position="absolute"
                        top="-50%"
                        right="-20%"
                        w="500px"
                        h="500px"
                        bg="teal.500"
                        filter="blur(150px)"
                        opacity={0.3}
                        borderRadius="full"
                    />
                    <HStack justify="space-between" align="start" position="relative" zIndex={1} flexWrap="wrap" gap={4}>
                        <VStack align="start" spacing={2} color="white">
                            <Heading size="xl">{t('vouch.title')}</Heading>
                            <Text fontSize="lg" opacity={0.9} maxW="600px">
                                {t('vouch.subtitle')}
                            </Text>
                        </VStack>
                        <Button
                            leftIcon={<FiPlus />}
                            bg="white"
                            color="gray.800"
                            size="lg"
                            borderRadius="xl"
                            _hover={{ bg: "gray.100", transform: "translateY(-2px)" }}
                            onClick={onOpen}
                            boxShadow="lg"
                        >
                            {t('vouch.given.button')}
                        </Button>
                    </HStack>
                </Box>

                {givenError && (
                    <Alert status="error" borderRadius="xl" mb={6} variant="solid" bg="red.500">
                        <AlertIcon color="white" />
                        <Text color="white">{t('vouch.errors.load')}</Text>
                    </Alert>
                )}

                {/* Stats Section with Glassmorphism */}
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={6} mb={8}>
                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        bg="rgba(255, 255, 255, 0.8)"
                        backdropFilter="blur(12px)"
                        borderRadius="2xl"
                        border="1px solid rgba(255,255,255,0.3)"
                        boxShadow="lg"
                    >
                        <CardBody>
                            <VStack align="start" spacing={1}>
                                <HStack color="pink.500" mb={1}>
                                    <Icon as={FiHeart} boxSize={5} />
                                    <Text fontSize="sm" fontWeight="600">{t('vouch.stats.iVouchFor')}</Text>
                                </HStack>
                                {givenLoading ? (
                                    <Skeleton height="36px" width="60px" />
                                ) : (
                                    <Text fontSize="3xl" fontWeight="800" bgGradient="linear(to-r, pink.500, purple.500)" bgClip="text">
                                        {vouchesGiven?.length || 0}
                                    </Text>
                                )}
                            </VStack>
                        </CardBody>
                    </MotionCard>

                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        bg="rgba(255, 255, 255, 0.8)"
                        backdropFilter="blur(12px)"
                        borderRadius="2xl"
                        border="1px solid rgba(255,255,255,0.3)"
                        boxShadow="lg"
                    >
                        <CardBody>
                            <VStack align="start" spacing={1}>
                                <HStack color="blue.500" mb={1}>
                                    <Icon as={FiShield} boxSize={5} />
                                    <Text fontSize="sm" fontWeight="600">{t('vouch.stats.vouchForMe')}</Text>
                                </HStack>
                                {receivedLoading ? (
                                    <Skeleton height="36px" width="60px" />
                                ) : (
                                    <Text fontSize="3xl" fontWeight="800" bgGradient="linear(to-r, blue.500, cyan.500)" bgClip="text">
                                        {vouchesReceived?.length || 0}
                                    </Text>
                                )}
                            </VStack>
                        </CardBody>
                    </MotionCard>

                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        bg="rgba(255, 255, 255, 0.8)"
                        backdropFilter="blur(12px)"
                        borderRadius="2xl"
                        border="1px solid rgba(255,255,255,0.3)"
                        boxShadow="lg"
                    >
                        <CardBody>
                            <VStack align="start" spacing={1}>
                                <HStack color="orange.500" mb={1}>
                                    <Icon as={FiStar} boxSize={5} />
                                    <Text fontSize="sm" fontWeight="600">{t('vouch.stats.saathiStaked')}</Text>
                                </HStack>
                                {givenLoading ? (
                                    <Skeleton height="36px" width="80px" />
                                ) : (
                                    <Text fontSize="3xl" fontWeight="800" bgGradient="linear(to-r, orange.400, red.400)" bgClip="text">
                                        {totalStaked}
                                    </Text>
                                )}
                            </VStack>
                        </CardBody>
                    </MotionCard>

                    <MotionCard
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        bg="linear-gradient(135deg, #059669 0%, #10b981 100%)"
                        borderRadius="2xl"
                        boxShadow="lg"
                        color="white"
                    >
                        <CardBody>
                            <VStack align="start" spacing={1}>
                                <HStack color="whiteAlpha.900" mb={1}>
                                    <Icon as={FiCheck} boxSize={5} />
                                    <Text fontSize="sm" fontWeight="600">{t('vouch.stats.available')}</Text>
                                </HStack>
                                <Text fontSize="3xl" fontWeight="800">
                                    {saathiBalance?.available ?? user?.saathi_balance ?? 0}
                                </Text>
                            </VStack>
                        </CardBody>
                    </MotionCard>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
                    {/* People I Vouch For - Premium Card */}
                    <Box>
                        <HStack mb={4}>
                            <Box p={2} bg="pink.100" borderRadius="xl">
                                <Text fontSize="xl">💪</Text>
                            </Box>
                            <Heading size="md" color="gray.700">{t('vouch.given.title')}</Heading>
                        </HStack>

                        <VStack spacing={4} align="stretch">
                            {givenLoading ? (
                                [1, 2].map(i => <Skeleton key={i} height="100px" borderRadius="2xl" />)
                            ) : vouchesGiven && vouchesGiven.length > 0 ? (
                                vouchesGiven.map((vouch, i) => (
                                    <MotionCard
                                        key={vouch.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        bg="white"
                                        borderRadius="2xl"
                                        boxShadow="md"
                                        _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                                    >
                                        <CardBody>
                                            <HStack justify="space-between" align="start">
                                                <HStack spacing={4}>
                                                    <Avatar
                                                        size="md"
                                                        name={vouch.vouchee?.full_name}
                                                        src={`https://api.dicebear.com/7.x/micah/svg?seed=${vouch.vouchee?.full_name}`}
                                                        bg="pink.50"
                                                    />
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="bold" fontSize="lg" color="gray.800">
                                                            {vouch.vouchee?.full_name || 'User'}
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.500">
                                                            Since {new Date(vouch.created_at).toLocaleDateString()}
                                                        </Text>
                                                    </VStack>
                                                </HStack>
                                                <Badge
                                                    colorScheme={getLevelColor(vouch.vouch_level)}
                                                    px={3} py={1} borderRadius="full"
                                                    fontSize="xs" textTransform="uppercase"
                                                >
                                                    {vouch.vouch_level}
                                                </Badge>
                                            </HStack>
                                            <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.100">
                                                <HStack justify="space-between">
                                                    <Text fontSize="sm" color="gray.600">Locked Stake</Text>
                                                    <Text fontWeight="bold" color="pink.500">{vouch.saathi_staked} SAATHI</Text>
                                                </HStack>
                                            </Box>
                                        </CardBody>
                                    </MotionCard>
                                ))
                            ) : (
                                <Card bg="rgba(255,255,255,0.6)" backdropFilter="blur(10px)" borderRadius="2xl" borderStyle="dashed" borderWidth="2px">
                                    <CardBody py={10} textAlign="center">
                                        <Text fontSize="4xl" mb={4}>😴</Text>
                                        <Text color="gray.500">{t('vouch.given.empty')}</Text>
                                        <Button mt={4} size="sm" colorScheme="pink" onClick={onOpen}>
                                            {t('vouch.given.cta')}
                                        </Button>
                                    </CardBody>
                                </Card>
                            )}
                        </VStack>
                    </Box>

                    {/* People Who Vouch For Me */}
                    <Box>
                        <HStack mb={4}>
                            <Box p={2} bg="blue.100" borderRadius="xl">
                                <Text fontSize="xl">🛡️</Text>
                            </Box>
                            <Heading size="md" color="gray.700">{t('vouch.received.title')}</Heading>
                        </HStack>

                        <VStack spacing={4} align="stretch">
                            {receivedLoading ? (
                                [1, 2].map(i => <Skeleton key={i} height="100px" borderRadius="2xl" />)
                            ) : vouchesReceived && vouchesReceived.length > 0 ? (
                                vouchesReceived.map((vouch, i) => (
                                    <MotionCard
                                        key={vouch.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        bg="white"
                                        borderRadius="2xl"
                                        boxShadow="md"
                                        _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                                    >
                                        <CardBody>
                                            <HStack justify="space-between" align="start">
                                                <HStack spacing={4}>
                                                    <Avatar
                                                        size="md"
                                                        name={vouch.voucher?.full_name}
                                                        src={`https://api.dicebear.com/7.x/micah/svg?seed=${vouch.voucher?.full_name}`}
                                                        bg="blue.50"
                                                    />
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="bold" fontSize="lg" color="gray.800">
                                                            {vouch.voucher?.full_name || 'User'}
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.500">
                                                            Trust Backer
                                                        </Text>
                                                    </VStack>
                                                </HStack>
                                                <Badge
                                                    colorScheme="green"
                                                    px={3} py={1} borderRadius="full"
                                                    fontSize="xs"
                                                >
                                                    ACTIVE
                                                </Badge>
                                            </HStack>
                                            <Box mt={4} pt={4} borderTop="1px solid" borderColor="gray.100">
                                                <HStack justify="space-between">
                                                    <Text fontSize="sm" color="gray.600">Trust Value</Text>
                                                    <Text fontWeight="bold" color="blue.500">{vouch.saathi_staked} SAATHI</Text>
                                                </HStack>
                                            </Box>
                                        </CardBody>
                                    </MotionCard>
                                ))
                            ) : (
                                <Card bg="rgba(255,255,255,0.6)" backdropFilter="blur(10px)" borderRadius="2xl" borderStyle="dashed" borderWidth="2px">
                                    <CardBody py={10} textAlign="center">
                                        <Text fontSize="4xl" mb={4}>🌱</Text>
                                        <Text color="gray.500">{t('vouch.received.empty')}</Text>
                                    </CardBody>
                                </Card>
                            )}
                        </VStack>
                    </Box>
                </SimpleGrid>

                {/* Vouch Modal - Enhanced */}
                <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered motionPreset="slideInBottom">
                    <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.300" />
                    <ModalContent borderRadius="3xl" mx={4} boxShadow="2xl">
                        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
                            <HStack>
                                <Box p={2} bg="pink.100" borderRadius="lg" color="pink.500">
                                    <Icon as={FiHeart} />
                                </Box>
                                <Text fontSize="xl">{t('vouch.modal.title')}</Text>
                            </HStack>
                        </ModalHeader>
                        <ModalCloseButton mt={2} />
                        <ModalBody py={6}>
                            {/* Content Logic Same as Before but with better styling */}
                            <FormControl mb={8}>
                                <FormLabel fontWeight="bold" color="gray.700" mb={4}>{t('vouch.modal.selectCircle')}</FormLabel>
                                {circlesLoading ? (
                                    <Skeleton height="40px" borderRadius="xl" />
                                ) : circles && circles.length > 0 ? (
                                    <SimpleGrid columns={2} gap={3}>
                                        {circles.map((circle) => (
                                            <Box
                                                key={circle.id}
                                                p={4}
                                                borderRadius="xl"
                                                border="2px solid"
                                                borderColor={selectedCircleId === circle.id ? 'teal.500' : 'gray.100'}
                                                bg={selectedCircleId === circle.id ? 'teal.50' : 'gray.50'}
                                                cursor="pointer"
                                                onClick={() => {
                                                    setSelectedCircleId(circle.id)
                                                    setSelectedMember(null)
                                                }}
                                                transition="all 0.2s"
                                                _hover={{ borderColor: 'teal.300', transform: 'scale(1.02)' }}
                                            >
                                                <Text fontWeight="bold">{circle.name}</Text>
                                                <Text fontSize="xs" color="gray.500">{circle.member_count} Members</Text>
                                            </Box>
                                        ))}
                                    </SimpleGrid>
                                ) : (
                                    <Alert status="info" borderRadius="xl">
                                        <AlertIcon /> First, join a circle to vouch for someone.
                                    </Alert>
                                )}
                            </FormControl>

                            {selectedCircleId && (
                                <FormControl mb={8}>
                                    <FormLabel fontWeight="bold" color="gray.700" mb={4}>Select Member</FormLabel>
                                    <SimpleGrid columns={3} gap={3}>
                                        {circleMembers?.filter(m => m.user_id !== user?.id).map((member) => (
                                            <Box
                                                key={member.id}
                                                p={3}
                                                borderRadius="xl"
                                                border="2px solid"
                                                borderColor={selectedMember?.id === member.id ? 'pink.500' : 'gray.100'}
                                                bg={selectedMember?.id === member.id ? 'pink.50' : 'white'}
                                                cursor="pointer"
                                                onClick={() => setSelectedMember(member)}
                                                textAlign="center"
                                                transition="all 0.2s"
                                                _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                                            >
                                                <Avatar size="sm" name={member.full_name} mb={2} />
                                                <Text fontSize="sm" fontWeight="600" noOfLines={1}>{member.full_name}</Text>
                                            </Box>
                                        ))}
                                    </SimpleGrid>
                                </FormControl>
                            )}

                            {selectedMember && (
                                <Box bg="gray.50" p={4} borderRadius="2xl">
                                    <VStack spacing={6}>
                                        <FormControl>
                                            <HStack justify="space-between" mb={2}>
                                                <FormLabel m={0} fontWeight="bold">Stake Amount</FormLabel>
                                                <Badge colorScheme="orange" fontSize="md" px={2} borderRadius="md">
                                                    {stakeAmount} SAATHI
                                                </Badge>
                                            </HStack>
                                            <Slider
                                                aria-label="stake-amount"
                                                defaultValue={30}
                                                min={10}
                                                max={100}
                                                step={5}
                                                onChange={(val) => setStakeAmount(val)}
                                            >
                                                <SliderTrack bg="gray.200" h={2} borderRadius="full">
                                                    <SliderFilledTrack bg="orange.400" />
                                                </SliderTrack>
                                                <SliderThumb boxSize={6} bg="white" boxShadow="md" border="2px solid" borderColor="orange.400" />
                                            </Slider>
                                            <Text fontSize="xs" color="gray.500" mt={2}>
                                                Higher stake = Stronger signal of trust.
                                            </Text>
                                        </FormControl>

                                        <Button
                                            w="full"
                                            size="lg"
                                            bgGradient="linear(to-r, pink.500, purple.500)"
                                            color="white"
                                            borderRadius="xl"
                                            onClick={handleCreateVouch}
                                            isLoading={createVouchMutation.isLoading}
                                            _hover={{ opacity: 0.9, transform: 'scale(1.02)' }}
                                            boxShadow="lg"
                                        >
                                            Confirm Vouch ({stakeAmount} SAATHI)
                                        </Button>
                                    </VStack>
                                </Box>
                            )}
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </Box>
        </AppLayout>
    )
}
