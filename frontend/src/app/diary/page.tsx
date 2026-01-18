'use client'

import { useEffect, useState, useRef } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, SimpleGrid, Skeleton, Alert, AlertIcon,
    Input, InputGroup, InputLeftElement, Select, useToast,
    Table, Thead, Tbody, Tr, Th, Td, Icon, Stat, StatLabel,
    StatNumber, Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalBody, ModalCloseButton, useDisclosure, FormControl,
    FormLabel, NumberInput, NumberInputField, Textarea, Tooltip
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiPlus, FiMic, FiDollarSign, FiTrendingUp, FiTrendingDown, FiSearch } from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { diaryAPI } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionCard = motion.create(Card)

interface DiaryEntry {
    id: string
    type: 'income' | 'expense'
    amount: number
    category: string
    notes: string
    created_at: string
}

interface DiarySummary {
    total_income: number
    total_expense: number
    balance: number
    category_breakdown: { category: string; amount: number }[]
}

export default function DiaryPage() {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [type, setType] = useState<'income' | 'expense'>('expense')
    const [amount, setAmount] = useState<number>(0)
    const [category, setCategory] = useState('')
    const [notes, setNotes] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const toast = useToast()
    const { t } = useLanguage()
    const { user } = useAuth()

    // Fetch entries from API
    const {
        data: entries,
        isLoading: entriesLoading,
        error: entriesError,
        execute: fetchEntries
    } = useAPI<DiaryEntry[]>(diaryAPI.getEntries)

    // Fetch summary from API
    const {
        data: summary,
        isLoading: summaryLoading,
        execute: fetchSummary
    } = useAPI<DiarySummary>(diaryAPI.getSummary)

    // Add entry mutation
    const addMutation = useMutation(
        (data: { type: string; amount: number; category: string; notes?: string }) =>
            diaryAPI.addEntry(data),
        {
            onSuccess: () => {
                toast({
                    title: 'Entry Added! ✓',
                    status: 'success',
                    duration: 3000,
                })
                onClose()
                resetForm()
                fetchEntries()
                fetchSummary()
            },
            onError: (error) => {
                toast({
                    title: 'Failed to add entry',
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Voice transcription mutation
    const transcribeMutation = useMutation(
        (audioBlob: Blob) => diaryAPI.transcribeVoice(audioBlob),
        {
            onSuccess: (data) => {
                // Parse the transcribed entry
                if (data.type) setType(data.type)
                if (data.amount) setAmount(data.amount)
                if (data.category) setCategory(data.category)
                if (data.notes) setNotes(data.notes)
                toast({
                    title: 'Voice transcribed! ✓',
                    description: 'Check and submit your entry',
                    status: 'success',
                    duration: 3000,
                })
            },
            onError: (error) => {
                toast({
                    title: 'Transcription failed',
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Load data on mount
    useEffect(() => {
        fetchEntries()
        fetchSummary()
    }, [fetchEntries, fetchSummary])

    const resetForm = () => {
        setType('expense')
        setAmount(0)
        setCategory('')
        setNotes('')
    }

    const handleSubmit = () => {
        if (!amount || !category) {
            toast({ title: 'Please fill amount and category', status: 'error', duration: 3000 })
            return
        }
        addMutation.mutate({ type, amount, category, notes })
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data)
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                transcribeMutation.mutate(audioBlob)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            toast({
                title: 'Microphone access denied',
                status: 'error',
                duration: 3000
            })
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
        }
    }

    const expenseCategories = [
        { id: 'Food', label: t('diary.categories.food') },
        { id: 'Transport', label: t('diary.categories.transport') },
        { id: 'Bills', label: t('diary.categories.bills') },
        { id: 'Shopping', label: t('diary.categories.shopping') },
        { id: 'Health', label: t('diary.categories.health') },
        { id: 'Education', label: t('diary.categories.education') },
        { id: 'Other', label: t('diary.categories.other') },
    ]
    const incomeCategories = [
        { id: 'Salary', label: t('diary.categories.salary') },
        { id: 'Business', label: t('diary.categories.business') },
        { id: 'Gift', label: t('diary.categories.gift') },
        { id: 'Interest', label: t('diary.categories.interest') },
        { id: 'Other', label: t('diary.categories.other') },
    ]

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
                    <VStack align="start" spacing={1}>
                        <Heading size="lg" color="gray.800">{t('diary.title')}</Heading>
                        <Text color="gray.500">{t('diary.subtitle')}</Text>
                    </VStack>

                    <Button
                        leftIcon={<FiPlus />}
                        bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                        color="white"
                        borderRadius="xl"
                        onClick={onOpen}
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                    >
                        {t('diary.addEntry')}
                    </Button>
                </HStack>

                {entriesError && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        Failed to load diary entries. Please refresh.
                    </Alert>
                )}

                {/* Trust Builder Tip */}
                <Alert status="info" borderRadius="2xl" mb={8} bg="blue.50" border="1px solid" borderColor="blue.100">
                    <AlertIcon color="blue.500" />
                    <Box flex="1">
                        <Text fontWeight="700" color="blue.800" fontSize="sm">
                            Trust Builder Tip 🚀
                        </Text>
                        <Text color="blue.600" fontSize="xs">
                            Keep your financial diary updated! Consistent logging for 7 days increases your <b>Bharosa Score</b> by 5 points.
                        </Text>
                    </Box>
                </Alert>

                {/* Summary Stats - from real API */}
                <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={10}>
                    <Tooltip label="Total money you earned this month" placement="top">
                        <MotionCard
                            borderRadius="2xl"
                            bgGradient="linear(to-br, emerald.500, emerald.600)"
                            cursor="help"
                            whileHover={{ y: -5 }}
                            boxShadow="lg"
                        >
                            <CardBody position="relative" overflow="hidden">
                                <Box position="absolute" right="-10px" top="-10px" opacity={0.2} fontSize="8xl">
                                    <FiTrendingUp />
                                </Box>
                                <Stat color="white">
                                    <StatLabel color="whiteAlpha.900" fontSize="sm">{t('diary.totalIncome')}</StatLabel>
                                    {summaryLoading ? (
                                        <Skeleton height="36px" width="120px" startColor="whiteAlpha.300" endColor="whiteAlpha.500" />
                                    ) : (
                                        <StatNumber fontSize="3xl" fontWeight="800">
                                            ₹{(summary?.total_income || 0).toLocaleString()}
                                        </StatNumber>
                                    )}
                                    <HStack color="whiteAlpha.900" fontSize="xs" mt={2} bg="whiteAlpha.200" px={2} py={1} borderRadius="lg" w="fit-content">
                                        <Icon as={FiTrendingUp} />
                                        <Text fontWeight="600">{t('diary.thisMonth')}</Text>
                                    </HStack>
                                </Stat>
                            </CardBody>
                        </MotionCard>
                    </Tooltip>

                    <MotionCard
                        borderRadius="2xl"
                        bgGradient="linear(to-br, red.500, red.600)"
                        whileHover={{ y: -5 }}
                        boxShadow="lg"
                    >
                        <CardBody position="relative" overflow="hidden">
                            <Box position="absolute" right="-10px" bottom="-10px" opacity={0.2} fontSize="8xl">
                                <FiTrendingDown />
                            </Box>
                            <Stat color="white">
                                <StatLabel color="whiteAlpha.900" fontSize="sm">{t('diary.totalExpense')}</StatLabel>
                                {summaryLoading ? (
                                    <Skeleton height="36px" width="120px" startColor="whiteAlpha.300" endColor="whiteAlpha.500" />
                                ) : (
                                    <StatNumber fontSize="3xl" fontWeight="800">
                                        ₹{(summary?.total_expense || 0).toLocaleString()}
                                    </StatNumber>
                                )}
                                <HStack color="whiteAlpha.900" fontSize="xs" mt={2} bg="whiteAlpha.200" px={2} py={1} borderRadius="lg" w="fit-content">
                                    <Icon as={FiTrendingDown} />
                                    <Text fontWeight="600">{t('diary.thisMonth')}</Text>
                                </HStack>
                            </Stat>
                        </CardBody>
                    </MotionCard>

                    <MotionCard
                        borderRadius="2xl"
                        bg="white"
                        boxShadow="lg"
                        whileHover={{ y: -5 }}
                        border="1px solid"
                        borderColor="gray.100"
                    >
                        <CardBody>
                            <Stat>
                                <StatLabel color="gray.500" fontSize="sm">{t('diary.balance')}</StatLabel>
                                {summaryLoading ? (
                                    <Skeleton height="36px" width="120px" />
                                ) : (
                                    <StatNumber
                                        color={(summary?.balance || 0) >= 0 ? 'emerald.600' : 'red.600'}
                                        fontSize="3xl"
                                        fontWeight="900"
                                    >
                                        ₹{Math.abs(summary?.balance || 0).toLocaleString()}
                                    </StatNumber>
                                )}
                                <Text fontSize="xs" color="gray.500" mt={2} fontWeight="600">
                                    {(summary?.balance || 0) >= 0 ? t('diary.savings') : t('diary.deficit')} {t('diary.thisMonth')}
                                </Text>
                            </Stat>
                            {/* Visual Progress Bar */}
                            <Box mt={3} h="6px" bg="gray.100" borderRadius="full" overflow="hidden">
                                <Box
                                    h="100%"
                                    w={`${Math.min(((summary?.total_income || 1) / ((summary?.total_expense || 1) + (summary?.total_income || 1))) * 100, 100)}%`}
                                    bg="emerald.500"
                                    borderRadius="full"
                                />
                            </Box>
                            <HStack justify="space-between" mt={1}>
                                <Text fontSize="2xs" color="emerald.600">Income</Text>
                                <Text fontSize="2xs" color="red.500">Expense</Text>
                            </HStack>
                        </CardBody>
                    </MotionCard>
                </SimpleGrid>

                {/* Entries Table */}
                <Card borderRadius="2xl" bg="white" boxShadow="sm">
                    <CardBody p={0}>
                        <HStack p={4} borderBottom="1px solid" borderColor="gray.100">
                            <Text fontWeight="700" color="gray.800">{t('diary.recentTransactions')}</Text>
                        </HStack>

                        {entriesLoading ? (
                            <VStack p={4} spacing={3}>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Skeleton key={i} height="50px" width="100%" borderRadius="lg" />
                                ))}
                            </VStack>
                        ) : entries && entries.length > 0 ? (
                            <Table variant="simple">
                                <Thead>
                                    <Tr>
                                        <Th>{t('diary.date')}</Th>
                                        <Th>{t('diary.category')}</Th>
                                        <Th>{t('diary.notes')}</Th>
                                        <Th isNumeric>{t('diary.amount')}</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {entries.map((entry) => (
                                        <Tr key={entry.id}>
                                            <Td color="gray.500" fontSize="sm">
                                                {formatDate(entry.created_at)}
                                            </Td>
                                            <Td>
                                                <Badge
                                                    colorScheme={entry.type === 'income' ? 'green' : 'red'}
                                                    borderRadius="full"
                                                >
                                                    {t(`diary.categories.${entry.category.toLowerCase()}`)}
                                                </Badge>
                                            </Td>
                                            <Td color="gray.600" fontSize="sm">
                                                {entry.notes || '-'}
                                            </Td>
                                            <Td isNumeric>
                                                <Text
                                                    fontWeight="600"
                                                    color={entry.type === 'income' ? 'emerald.600' : 'red.600'}
                                                >
                                                    {entry.type === 'income' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                                                </Text>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        ) : (
                            <VStack py={12} spacing={4}>
                                <Text fontSize="4xl">📒</Text>
                                <Text fontWeight="600" color="gray.700">{t('diary.noEntries')}</Text>
                                <Text color="gray.500">{t('diary.startTracking')}</Text>
                                <Button colorScheme="teal" borderRadius="xl" onClick={onOpen}>
                                    {t('diary.addFirst')}
                                </Button>
                            </VStack>
                        )}
                    </CardBody>
                </Card>

                {/* Add Entry Modal */}
                <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
                    <ModalOverlay backdropFilter="blur(10px)" />
                    <ModalContent borderRadius="2xl" mx={4}>
                        <ModalHeader>
                            <HStack justify="space-between">
                                <VStack align="start" spacing={0}>
                                    <Text fontWeight="700">{t('diary.modal.title')}</Text>
                                    <Text fontSize="sm" color="gray.500" fontWeight="normal">
                                        {t('diary.modal.subtitle')}
                                    </Text>
                                </VStack>
                                <Button
                                    size="sm"
                                    colorScheme={isRecording ? 'red' : 'teal'}
                                    borderRadius="full"
                                    leftIcon={<FiMic />}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    isLoading={transcribeMutation.isLoading}
                                >
                                    {isRecording ? t('diary.modal.stop') : t('diary.modal.voice')}
                                </Button>
                            </HStack>
                        </ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={6}>
                            <VStack spacing={4}>
                                {/* Type Selection */}
                                <HStack w="full">
                                    <Button
                                        flex={1}
                                        colorScheme={type === 'income' ? 'green' : 'gray'}
                                        variant={type === 'income' ? 'solid' : 'outline'}
                                        borderRadius="xl"
                                        onClick={() => setType('income')}
                                    >
                                        + {t('diary.modal.income')}
                                    </Button>
                                    <Button
                                        flex={1}
                                        colorScheme={type === 'expense' ? 'red' : 'gray'}
                                        variant={type === 'expense' ? 'solid' : 'outline'}
                                        borderRadius="xl"
                                        onClick={() => setType('expense')}
                                    >
                                        - {t('diary.modal.expense')}
                                    </Button>
                                </HStack>

                                {/* Amount */}
                                <FormControl>
                                    <FormLabel fontWeight="600">{t('diary.modal.amountLabel')}</FormLabel>
                                    <NumberInput
                                        value={amount}
                                        onChange={(_, val) => setAmount(val)}
                                        min={0}
                                    >
                                        <NumberInputField
                                            borderRadius="xl"
                                            fontSize="xl"
                                            fontWeight="700"
                                            placeholder="0"
                                        />
                                    </NumberInput>
                                </FormControl>

                                {/* Category */}
                                <FormControl>
                                    <FormLabel fontWeight="600">{t('diary.modal.categoryLabel')}</FormLabel>
                                    <Select
                                        placeholder={t('diary.modal.selectCategory')}
                                        borderRadius="xl"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        {(type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Notes */}
                                <FormControl>
                                    <FormLabel fontWeight="600">{t('diary.modal.notesLabel')}</FormLabel>
                                    <Textarea
                                        placeholder={t('diary.modal.notesPlaceholder')}
                                        borderRadius="xl"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </FormControl>

                                <Button
                                    w="full"
                                    size="lg"
                                    bg={type === 'income'
                                        ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
                                        : 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
                                    }
                                    color="white"
                                    borderRadius="xl"
                                    onClick={handleSubmit}
                                    isLoading={addMutation.isLoading}
                                    isDisabled={!amount || !category}
                                    _hover={{ transform: 'translateY(-2px)' }}
                                >
                                    {t('diary.modal.addButton')} {type === 'income' ? t('diary.modal.income') : t('diary.modal.expense')}
                                </Button>
                            </VStack>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </Box>
        </AppLayout>
    )
}
