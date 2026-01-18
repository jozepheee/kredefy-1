'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, SimpleGrid, Card, CardBody,
    HStack, VStack, Badge, Button, Avatar, AvatarGroup, Icon,
    Input, InputGroup, InputLeftElement, Modal, ModalOverlay,
    ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
    useDisclosure, FormControl, FormLabel, useToast, Skeleton,
    Alert, AlertIcon, Spinner
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiPlus, FiUsers, FiSearch, FiCopy, FiCheck } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { circlesAPI, Circle } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import CircleLeaderboard from '@/components/CircleLeaderboard'

const MotionCard = motion.create(Card)

export default function CirclesPage() {
    const router = useRouter()
    const { isOpen: isJoinOpen, onOpen: onJoinOpen, onClose: onJoinClose } = useDisclosure()
    const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure()
    const [inviteCode, setInviteCode] = useState('')
    const [newCircleName, setNewCircleName] = useState('')
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const toast = useToast()
    const { user } = useAuth()
    const { t } = useLanguage()

    // Fetch circles from API
    const {
        data: circles,
        isLoading,
        error,
        execute: fetchCircles
    } = useAPI<Circle[]>(circlesAPI.getMyCircles)

    // Join circle mutation
    const joinMutation = useMutation(
        (code: string) => circlesAPI.joinCircle(code),
        {
            onSuccess: (circle) => {
                toast({
                    title: t('circles.joinSuccess'),
                    description: `${t('dashboard.hello')} to ${circle.name}`,
                    status: 'success',
                    duration: 4000,
                })
                onJoinClose()
                setInviteCode('')
                fetchCircles()
            },
            onError: (error) => {
                toast({
                    title: t('common.error'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Create circle mutation
    const createMutation = useMutation(
        (name: string) => circlesAPI.createCircle(name),
        {
            onSuccess: (circle) => {
                toast({
                    title: t('circles.createSuccess'),
                    description: `Share code: ${circle.invite_code}`,
                    status: 'success',
                    duration: 6000,
                })
                onCreateClose()
                setNewCircleName('')
                fetchCircles()
            },
            onError: (error) => {
                toast({
                    title: t('common.error'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Load circles on mount
    useEffect(() => {
        fetchCircles()
    }, [fetchCircles])

    const handleJoinCircle = () => {
        if (inviteCode.trim().length < 4) {
            toast({ title: t('circles.invalidCode'), status: 'error', duration: 3000 })
            return
        }
        joinMutation.mutate(inviteCode.trim().toUpperCase())
    }

    const handleCreateCircle = () => {
        if (newCircleName.trim().length < 3) {
            toast({ title: t('circles.invalidName'), status: 'error', duration: 3000 })
            return
        }
        createMutation.mutate(newCircleName.trim())
    }

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopiedCode(code)
        toast({ title: t('circles.copied'), status: 'success', duration: 2000 })
        setTimeout(() => setCopiedCode(null), 2000)
    }

    const getCircleColor = (index: number) => {
        const colors = ['purple', 'blue', 'teal', 'pink', 'orange', 'cyan']
        return colors[index % colors.length]
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={6}>
                    <Heading size="lg" color="gray.800">{t('circles.title')}</Heading>
                    <Text color="gray.500">
                        {t('circles.subtitle')}
                    </Text>
                </VStack>

                {/* Action Bar */}
                <HStack mb={6} flexWrap="wrap" gap={3}>
                    <Button
                        leftIcon={<FiPlus />}
                        bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                        color="white"
                        borderRadius="xl"
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                        onClick={onCreateOpen}
                    >
                        {t('circles.create')}
                    </Button>

                    <Button
                        leftIcon={<FiUsers />}
                        variant="outline"
                        colorScheme="teal"
                        borderRadius="xl"
                        onClick={onJoinOpen}
                    >
                        {t('circles.join')}
                    </Button>
                </HStack>

                {/* Error State */}
                {error && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        {t('common.error')}
                    </Alert>
                )}

                {/* Circle Wars Leaderboard */}
                <Box mb={8}>
                    <CircleLeaderboard />
                </Box>

                {/* Loading State */}
                {isLoading ? (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} height="280px" borderRadius="2xl" />
                        ))}
                    </SimpleGrid>
                ) : circles && circles.length > 0 ? (
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
                        {circles.map((circle, index) => {
                            const color = getCircleColor(index)
                            return (
                                <MotionCard
                                    key={circle.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 * index }}
                                    whileHover={{ y: -8 }}
                                    bg="white"
                                    borderRadius="2xl"
                                    boxShadow="lg"
                                    overflow="hidden"
                                    cursor="pointer"
                                    _hover={{ boxShadow: '2xl' }}
                                    onClick={() => router.push(`/circles/${circle.id}`)}
                                    position="relative"
                                >
                                    {/* Premium Gradient Header */}
                                    <Box
                                        h="100px"
                                        bgGradient={`linear(to-br, ${color}.400, ${color}.600)`}
                                        position="relative"
                                    >
                                        <Box
                                            position="absolute"
                                            bottom="-24px"
                                            left="24px"
                                            p={1}
                                            bg="white"
                                            borderRadius="2xl"
                                            boxShadow="md"
                                        >
                                            <Box
                                                w="48px"
                                                h="48px"
                                                borderRadius="xl"
                                                bg={`${color}.50`}
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                fontSize="2xl"
                                            >
                                                👥
                                            </Box>
                                        </Box>
                                    </Box>

                                    <CardBody p={6} pt={10}>
                                        <HStack justify="space-between" mb={2} align="start">
                                            <VStack align="start" spacing={1} maxW="70%">
                                                <Heading size="md" color="gray.800" noOfLines={1} title={circle.name}>
                                                    {circle.name}
                                                </Heading>
                                                <Badge
                                                    colorScheme={circle.my_role === 'admin' ? 'purple' : 'gray'}
                                                    variant="solid"
                                                    borderRadius="full"
                                                    px={3}
                                                >
                                                    {circle.my_role}
                                                </Badge>
                                            </VStack>
                                        </HStack>

                                        {/* Stats */}
                                        <SimpleGrid columns={2} gap={4} mb={6}>
                                            <VStack align="center" p={3} bg="gray.50" borderRadius="xl" spacing={0}>
                                                <Text fontSize="xs" color="gray.500" fontWeight="600" textTransform="uppercase">{t('circles.members')}</Text>
                                                <Text fontWeight="800" fontSize="2xl" color="gray.800">
                                                    {circle.member_count}
                                                </Text>
                                            </VStack>
                                            <VStack align="center" p={3} bg="emerald.50" borderRadius="xl" spacing={0}>
                                                <Text fontSize="xs" color="emerald.600" fontWeight="600" textTransform="uppercase">{t('circles.poolSize')}</Text>
                                                <Text fontWeight="800" fontSize="2xl" color="emerald.600">
                                                    ₹{(circle.total_pool / 1000).toFixed(1)}k
                                                </Text>
                                            </VStack>
                                        </SimpleGrid>

                                        {/* Actions */}
                                        <Button
                                            w="full"
                                            size="lg"
                                            bg={`${color}.50`}
                                            color={`${color}.700`}
                                            _hover={{ bg: `${color}.100` }}
                                            borderRadius="xl"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                router.push(`/loans/apply?circleId=${circle.id}`)
                                            }}
                                        >
                                            View Circle
                                        </Button>
                                    </CardBody>
                                </MotionCard>
                            )
                        })}

                        {/* Create New Circle Card */}
                        <MotionCard
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            bg="white"
                            borderRadius="2xl"
                            border="2px dashed"
                            borderColor="gray.300"
                            cursor="pointer"
                            _hover={{ borderColor: 'emerald.500', bg: 'emerald.50' }}
                            onClick={onCreateOpen}
                            minH="320px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                        >
                            <CardBody textAlign="center">
                                <Box
                                    w="64px"
                                    h="64px"
                                    borderRadius="full"
                                    bg="emerald.100"
                                    color="emerald.600"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    mx="auto"
                                    mb={4}
                                >
                                    <FiPlus size={32} />
                                </Box>
                                <Heading size="md" color="gray.700" mb={2}>
                                    {t('circles.createNew')}
                                </Heading>
                                <Text fontSize="sm" color="gray.500" maxW="200px" mx="auto">
                                    {t('circles.createNewDesc')}
                                </Text>
                            </CardBody>
                        </MotionCard>
                    </SimpleGrid>
                ) : (
                    <Box
                        textAlign="center"
                        py={20}
                        px={10}
                        bgGradient="linear(to-br, blue.50, purple.50)"
                        borderRadius="3xl"
                        border="1px solid"
                        borderColor="blue.100"
                    >
                        <Box fontSize="6xl" mb={6}>👥</Box>
                        <Heading size="xl" color="gray.800" mb={4}>
                            {t('circles.noCircles')}
                        </Heading>
                        <Text fontSize="lg" color="gray.600" maxW="600px" mx="auto" mb={10}>
                            {t('circles.noCirclesDesc')}
                        </Text>
                        <HStack justify="center" spacing={6}>
                            <Button
                                size="lg"
                                colorScheme="teal"
                                borderRadius="xl"
                                onClick={onCreateOpen}
                                leftIcon={<FiPlus />}
                                px={8}
                                boxShadow="lg"
                            >
                                {t('circles.create')}
                            </Button>
                            <Button
                                size="lg"
                                bg="white"
                                color="teal.600"
                                borderRadius="xl"
                                onClick={onJoinOpen}
                                leftIcon={<FiUsers />}
                                px={8}
                                boxShadow="md"
                            >
                                {t('circles.join')}
                            </Button>
                        </HStack>
                    </Box>
                )}

                {/* Join Circle Modal */}
                <Modal isOpen={isJoinOpen} onClose={onJoinClose} isCentered>
                    <ModalOverlay backdropFilter="blur(10px)" />
                    <ModalContent borderRadius="2xl" mx={4}>
                        <ModalHeader>
                            <VStack align="start" spacing={1}>
                                <Text fontSize="xl" fontWeight="700">{t('circles.joinCircleTitle')}</Text>
                                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                                    {t('circles.joinCircleDesc')}
                                </Text>
                            </VStack>
                        </ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={6}>
                            <FormControl mb={4}>
                                <FormLabel fontSize="sm" fontWeight="600">
                                    {t('circles.inviteCodeLabel')}
                                </FormLabel>
                                <Input
                                    placeholder="e.g., FAMILY-2024"
                                    size="lg"
                                    borderRadius="xl"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                    textTransform="uppercase"
                                    fontWeight="600"
                                    letterSpacing="2px"
                                    isDisabled={joinMutation.isLoading}
                                />
                            </FormControl>

                            <Button
                                w="full"
                                size="lg"
                                bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                color="white"
                                borderRadius="xl"
                                onClick={handleJoinCircle}
                                isLoading={joinMutation.isLoading}
                                isDisabled={inviteCode.length < 4}
                                _hover={{ transform: 'translateY(-2px)' }}
                            >
                                {t('circles.join')}
                            </Button>
                        </ModalBody>
                    </ModalContent>
                </Modal>

                {/* Create Circle Modal */}
                <Modal isOpen={isCreateOpen} onClose={onCreateClose} isCentered>
                    <ModalOverlay backdropFilter="blur(10px)" />
                    <ModalContent borderRadius="2xl" mx={4}>
                        <ModalHeader>
                            <VStack align="start" spacing={1}>
                                <Text fontSize="xl" fontWeight="700">{t('circles.createCircleTitle')}</Text>
                                <Text fontSize="sm" color="gray.500" fontWeight="normal">
                                    {t('circles.createCircleDesc')}
                                </Text>
                            </VStack>
                        </ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={6}>
                            <FormControl mb={4}>
                                <FormLabel fontSize="sm" fontWeight="600">
                                    {t('circles.circleName')}
                                </FormLabel>
                                <Input
                                    placeholder="e.g., Family Group"
                                    size="lg"
                                    borderRadius="xl"
                                    value={newCircleName}
                                    onChange={(e) => setNewCircleName(e.target.value)}
                                    fontWeight="600"
                                    isDisabled={createMutation.isLoading}
                                />
                            </FormControl>

                            <Button
                                w="full"
                                size="lg"
                                bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                color="white"
                                borderRadius="xl"
                                onClick={handleCreateCircle}
                                isLoading={createMutation.isLoading}
                                isDisabled={newCircleName.length < 3}
                                _hover={{ transform: 'translateY(-2px)' }}
                            >
                                {t('circles.create')}
                            </Button>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </Box>
        </AppLayout>
    )
}
