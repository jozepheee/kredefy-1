'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, SimpleGrid, Skeleton, Alert, AlertIcon,
    Icon, Table, Thead, Tbody, Tr, Th, Td, useToast,
    Stat, StatLabel, StatNumber, StatHelpText, Divider,
    Code, Link as ChakraLink, Tooltip, useDisclosure,
    Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalFooter, ModalBody, ModalCloseButton, RadioGroup,
    Radio, Stack, Image
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiExternalLink, FiCopy, FiCheck, FiRefreshCw, FiTrendingUp,
    FiShield, FiAward, FiLock, FiPlusCircle, FiShoppingBag, FiInfo
} from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { saathiAPI, SaathiBalance, SaathiTransaction } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)

export default function WalletPage() {
    const { user, refreshSaathiBalance } = useAuth()
    const toast = useToast()
    const { t, language } = useLanguage()
    const [copiedAddress, setCopiedAddress] = useState(false)
    const { isOpen: isBuyOpen, onOpen: onBuyOpen, onClose: onBuyClose } = useDisclosure()
    const [buyAmount, setBuyAmount] = useState('100')

    // Fetch SAATHI balance
    const {
        data: balance,
        isLoading: balanceLoading,
        error: balanceError,
        execute: fetchBalance
    } = useAPI<SaathiBalance>(saathiAPI.getBalance)

    // Fetch transactions
    const {
        data: transactions,
        isLoading: txLoading,
        execute: fetchTransactions
    } = useAPI<SaathiTransaction[]>(saathiAPI.getTransactions)

    // Claim rewards mutation
    const claimMutation = useMutation(
        () => saathiAPI.claimRewards(),
        {
            onSuccess: (data) => {
                toast({
                    title: `${t('wallet.toasts.claimSuccess')} ${data.amount} SAATHI! 🎉`,
                    status: 'success',
                    duration: 4000,
                })
                fetchBalance()
                fetchTransactions()
                refreshSaathiBalance()
            },
            onError: (error) => {
                toast({
                    title: t('wallet.toasts.claimError'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Buy tokens mutation
    const buyMutation = useMutation(
        (amount: number) => saathiAPI.buyTokens(amount),
        {
            onSuccess: () => {
                toast({
                    title: t('wallet.toasts.buySuccess'),
                    status: 'success',
                    duration: 4000,
                })
                onBuyClose()
                fetchBalance()
                fetchTransactions()
                refreshSaathiBalance()
            },
            onError: (error) => {
                toast({
                    title: t('wallet.toasts.buyError'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    useEffect(() => {
        fetchBalance()
        fetchTransactions()
    }, [fetchBalance, fetchTransactions])

    const copyAddress = () => {
        if (user?.wallet_address) {
            navigator.clipboard.writeText(user.wallet_address)
            setCopiedAddress(true)
            toast({ title: t('wallet.copied'), status: 'success', duration: 2000 })
            setTimeout(() => setCopiedAddress(false), 2000)
        }
    }

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'earn': return '💰'
            case 'spend': return '🛒'
            case 'stake': return '🔒'
            case 'unstake': return '🔓'
            case 'reward': return '🎁'
            case 'slash': return '⚡'
            default: return '💫'
        }
    }

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'earn':
            case 'reward':
            case 'unstake': return 'green'
            case 'spend':
            case 'stake':
            case 'slash': return 'red'
            default: return 'gray'
        }
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={6}>
                    <Heading size="lg" color="gray.800">{t('wallet.title')}</Heading>
                    <Text color="gray.500">{t('wallet.subtitle')}</Text>
                </VStack>

                {balanceError && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        {t('wallet.errors.load')}
                    </Alert>
                )}

                {/* Main Balance Card */}
                <Card
                    bg="linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)"
                    borderRadius="2xl"
                    mb={6}
                    overflow="hidden"
                    position="relative"
                >
                    <Box
                        position="absolute"
                        top={0}
                        right={0}
                        bottom={0}
                        left={0}
                        opacity={0.1}
                        bgImage="radial-gradient(circle at 80% 20%, white 1px, transparent 1px)"
                        bgSize="40px 40px"
                    />
                    <CardBody p={8} position="relative">
                        <HStack justify="space-between" flexWrap="wrap" gap={4}>
                            <VStack align="start" spacing={4}>
                                <HStack>
                                    <Text fontSize="4xl">🪙</Text>
                                    <VStack align="start" spacing={0}>
                                        <Text color="orange.900" fontSize="sm" fontWeight="600">{t('wallet.balance')}</Text>
                                        {balanceLoading ? (
                                            <Skeleton height="48px" width="150px" />
                                        ) : (
                                            <Text color="orange.900" fontSize="4xl" fontWeight="900">
                                                {balance?.balance ?? 0}
                                            </Text>
                                        )}
                                    </VStack>
                                </HStack>

                                {/* Breakdown */}
                                <HStack spacing={4}>
                                    <Tooltip label="Tokens available for immediate use or withdrawal" placement="top">
                                        <VStack
                                            align="start"
                                            p={2}
                                            px={4}
                                            bg="whiteAlpha.400"
                                            borderRadius="lg"
                                            spacing={0}
                                            cursor="help"
                                        >
                                            <Text fontSize="xs" color="orange.800">{t('wallet.available')}</Text>
                                            <Text fontWeight="800" color="orange.900">
                                                {balance?.available ?? 0}
                                            </Text>
                                        </VStack>
                                    </Tooltip>

                                    <Tooltip label="Tokens locked as security for your friends' loans" placement="top">
                                        <VStack
                                            align="start"
                                            p={2}
                                            px={4}
                                            bg="whiteAlpha.400"
                                            borderRadius="lg"
                                            spacing={0}
                                            cursor="help"
                                        >
                                            <HStack spacing={1}>
                                                <Icon as={FiLock} boxSize={3} color="orange.800" />
                                                <Text fontSize="xs" color="orange.800">{t('wallet.staked')}</Text>
                                            </HStack>
                                            <Text fontWeight="800" color="orange.900">
                                                {balance?.staked ?? 0}
                                            </Text>
                                        </VStack>
                                    </Tooltip>
                                </HStack>
                            </VStack>

                            {/* Actions & Pending */}
                            <HStack spacing={4}>
                                <VStack spacing={2}>
                                    <Button
                                        leftIcon={<FiShoppingBag />}
                                        colorScheme="orange"
                                        bg="orange.900"
                                        _hover={{ bg: 'orange.800' }}
                                        color="white"
                                        borderRadius="xl"
                                        size="lg"
                                        onClick={onBuyOpen}
                                        px={8}
                                        boxShadow="xl"
                                    >
                                        {t('wallet.buy')}
                                    </Button>
                                    <Text fontSize="xs" color="orange.900" fontWeight="600">{t('wallet.buyDesc')}</Text>
                                </VStack>
                                {balance && balance.pending_rewards > 0 && (
                                    <VStack
                                        bg="whiteAlpha.400"
                                        p={4}
                                        borderRadius="xl"
                                        backdropFilter="blur(10px)"
                                    >
                                        <Text color="orange.900" fontSize="sm" fontWeight="600">
                                            {t('wallet.pending')}
                                        </Text>
                                        <Text color="orange.900" fontSize="2xl" fontWeight="800">
                                            +{balance.pending_rewards} 🎁
                                        </Text>
                                        <Button
                                            size="sm"
                                            bg="orange.900"
                                            color="white"
                                            borderRadius="xl"
                                            onClick={() => claimMutation.mutate(undefined)}
                                            isLoading={claimMutation.isLoading}
                                            _hover={{ bg: 'orange.800' }}
                                        >
                                            {t('wallet.claim')}
                                        </Button>
                                    </VStack>
                                )}
                            </HStack>
                        </HStack>
                    </CardBody>
                </Card>

                {/* Wallet Address */}
                {user?.wallet_address && (
                    <Card borderRadius="2xl" bg="white" mb={6}>
                        <CardBody>
                            <HStack justify="space-between" flexWrap="wrap" gap={4}>
                                <VStack align="start" spacing={1}>
                                    <HStack>
                                        <Icon as={FiShield} color="purple.500" />
                                        <Text fontWeight="600" color="gray.700">{t('wallet.walletAddress')}</Text>
                                    </HStack>
                                    <Code
                                        p={2}
                                        borderRadius="lg"
                                        bg="purple.50"
                                        color="purple.700"
                                        fontSize="sm"
                                    >
                                        {user.wallet_address}
                                    </Code>
                                </VStack>
                                <HStack>
                                    <Tooltip label={copiedAddress ? t('wallet.copied') : t('wallet.copy')}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            colorScheme="purple"
                                            borderRadius="xl"
                                            leftIcon={copiedAddress ? <FiCheck /> : <FiCopy />}
                                            onClick={copyAddress}
                                        >
                                            {t('wallet.copy')}
                                        </Button>
                                    </Tooltip>
                                    <ChakraLink
                                        href={`https://amoy.polygonscan.com/address/${user.wallet_address}`}
                                        isExternal
                                    >
                                        <Button
                                            size="sm"
                                            colorScheme="purple"
                                            borderRadius="xl"
                                            rightIcon={<FiExternalLink />}
                                        >
                                            {t('wallet.explorer')}
                                        </Button>
                                    </ChakraLink>
                                </HStack>
                            </HStack>
                        </CardBody>
                    </Card>
                )}

                {/* How to Earn */}
                <Card borderRadius="2xl" bg="white" mb={6}>
                    <CardBody>
                        <HStack mb={4}>
                            <Text fontSize="xl">💡</Text>
                            <Text fontWeight="700" color="gray.800">{t('wallet.howToEarn')}</Text>
                        </HStack>

                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                            <VStack p={4} bg="emerald.50" borderRadius="xl" align="start">
                                <HStack>
                                    <Badge colorScheme="emerald" borderRadius="full">+10</Badge>
                                    <Text fontWeight="600">{t('wallet.repayOnTime')}</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                    {t('wallet.repayOnTimeDesc')}
                                </Text>
                            </VStack>

                            <VStack p={4} bg="pink.50" borderRadius="xl" align="start">
                                <HStack>
                                    <Badge colorScheme="pink" borderRadius="full">+5-20</Badge>
                                    <Text fontWeight="600">{t('wallet.vouchFriends')}</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                    {t('wallet.vouchFriendsDesc')}
                                </Text>
                            </VStack>

                            <VStack p={4} bg="blue.50" borderRadius="xl" align="start">
                                <HStack>
                                    <Badge colorScheme="blue" borderRadius="full">+15</Badge>
                                    <Text fontWeight="600">{t('wallet.completeLoans')}</Text>
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                    {t('wallet.completeLoansDesc')}
                                </Text>
                            </VStack>
                        </SimpleGrid>
                    </CardBody>
                </Card>

                {/* Transaction History */}
                <Card borderRadius="2xl" bg="white">
                    <CardBody>
                        <HStack justify="space-between" mb={4}>
                            <HStack>
                                <Text fontSize="xl">📜</Text>
                                <Text fontWeight="700" color="gray.800">{t('wallet.history')}</Text>
                            </HStack>
                            <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<FiRefreshCw />}
                                onClick={fetchTransactions}
                                isLoading={txLoading}
                            >
                                {t('common.refresh')}
                            </Button>
                        </HStack>

                        {txLoading ? (
                            <VStack spacing={3}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Skeleton key={i} height="50px" borderRadius="lg" />
                                ))}
                            </VStack>
                        ) : transactions && transactions.length > 0 ? (
                            <Box overflowX="auto">
                                <Table variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th>{t('wallet.historyTable.type')}</Th>
                                            <Th>{t('wallet.historyTable.desc')}</Th>
                                            <Th>{t('wallet.historyTable.date')}</Th>
                                            <Th isNumeric>{t('wallet.historyTable.amount')}</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {transactions.map((tx) => (
                                            <Tr key={tx.id}>
                                                <Td>
                                                    <HStack>
                                                        <Text fontSize="xl">{getTransactionIcon(tx.type)}</Text>
                                                        <Badge
                                                            colorScheme={getTransactionColor(tx.type)}
                                                            borderRadius="full"
                                                            textTransform="capitalize"
                                                        >
                                                            {t(`wallet.types.${tx.type}`) || tx.type}
                                                        </Badge>
                                                    </HStack>
                                                </Td>
                                                <Td color="gray.600" fontSize="sm">{tx.description}</Td>
                                                <Td color="gray.500" fontSize="sm">
                                                    {new Date(tx.created_at).toLocaleDateString(language === 'en' ? 'en-IN' : 'ml-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </Td>
                                                <Td isNumeric>
                                                    <Text
                                                        fontWeight="700"
                                                        color={['earn', 'reward', 'unstake'].includes(tx.type) ? 'emerald.600' : 'red.600'}
                                                    >
                                                        {['earn', 'reward', 'unstake'].includes(tx.type) ? '+' : '-'}
                                                        {tx.amount}
                                                    </Text>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        ) : (
                            <VStack py={8}>
                                <Text fontSize="3xl">🪙</Text>
                                <Text color="gray.500">{t('wallet.noTx')}</Text>
                                <Text fontSize="sm" color="gray.400">
                                    {t('wallet.startEarning')}
                                </Text>
                            </VStack>
                        )}
                    </CardBody>
                </Card>
            </Box>

            {/* Buy SAATHI Modal */}
            <Modal isOpen={isBuyOpen} onClose={onBuyClose} isCentered size="sm">
                <ModalOverlay backdropFilter="blur(5px)" />
                <ModalContent borderRadius="2xl">
                    <ModalHeader pb={0}>
                        <VStack align="start" spacing={1}>
                            <HStack>
                                <Text fontSize="xl" fontWeight="800" color="gray.800">Checkout with Dodo Payments 🦤</Text>
                                <Badge colorScheme="purple" variant="solid" fontSize="xs">SECURE</Badge>
                            </HStack>
                            <Text fontSize="sm" color="gray.500" fontWeight="normal">Powered by Cross-Chain Liquidity Layer</Text>
                        </VStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={6}>
                        <VStack spacing={6} align="stretch">
                            <RadioGroup onChange={setBuyAmount} value={buyAmount}>
                                <Stack spacing={3}>
                                    {[
                                        { val: '100', price: '₹10', label: 'Starter Pack', icon: '🌱' },
                                        { val: '500', price: '₹45', label: 'Trust Builder', icon: '🚀', discount: '10% off' },
                                        { val: '2000', price: '₹160', label: 'Community Leader', icon: '👑', discount: '20% off' }
                                    ].map((opt) => (
                                        <Box
                                            key={opt.val}
                                            p={4}
                                            borderWidth="2px"
                                            borderRadius="xl"
                                            borderColor={buyAmount === opt.val ? 'orange.400' : 'gray.100'}
                                            bg={buyAmount === opt.val ? 'orange.50' : 'white'}
                                            cursor="pointer"
                                            onClick={() => setBuyAmount(opt.val)}
                                            transition="all 0.2s"
                                            position="relative"
                                        >
                                            <Radio value={opt.val} opacity={0} position="absolute" />
                                            <HStack justify="space-between">
                                                <HStack spacing={3}>
                                                    <Text fontSize="2xl">{opt.icon}</Text>
                                                    <VStack align="start" spacing={0}>
                                                        <Text fontWeight="800" fontSize="md">{opt.val} SAATHI</Text>
                                                        <Text fontSize="xs" color="gray.500">{opt.label}</Text>
                                                    </VStack>
                                                </HStack>
                                                <VStack align="end" spacing={0}>
                                                    <Text fontWeight="800" color="orange.600">{opt.price}</Text>
                                                    {opt.discount && (
                                                        <Badge colorScheme="green" variant="subtle" fontSize="2xs">
                                                            {opt.discount}
                                                        </Badge>
                                                    )}
                                                </VStack>
                                            </HStack>
                                        </Box>
                                    ))}
                                </Stack>
                            </RadioGroup>

                            <Alert status="success" borderRadius="xl" variant="subtle" py={2}>
                                <AlertIcon />
                                <VStack align="start" spacing={0}>
                                    <Text fontSize="xs" fontWeight="600">
                                        Verified by Mastra AI Defense 🛡️
                                    </Text>
                                    <Text fontSize="xs">
                                        Transaction will be securely recorded on Polygon Amoy.
                                    </Text>
                                </VStack>
                            </Alert>
                        </VStack>
                    </ModalBody>
                    <ModalFooter bg="gray.50" borderBottomRadius="2xl">
                        <Button
                            w="full"
                            colorScheme="orange"
                            size="lg"
                            borderRadius="xl"
                            leftIcon={<FiShoppingBag />}
                            onClick={() => buyMutation.mutate(parseInt(buyAmount))}
                            isLoading={buyMutation.isLoading}
                            loadingText="Processing with Dodo..."
                        >
                            Pay with Dodo
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </AppLayout>
    )
}
