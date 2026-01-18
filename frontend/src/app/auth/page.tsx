'use client'

import { useState, useEffect } from 'react'
import {
    Box, Flex, Heading, Text, VStack, HStack, Button, Input,
    FormControl, FormLabel, PinInput, PinInputField, Icon,
    useToast, Spinner, Alert, AlertIcon
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiPhone, FiArrowRight, FiShield, FiUsers, FiHeart } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { useMutation } from '@/hooks/useAPI'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'

const MotionBox = motion.create(Box)

export default function AuthPage() {
    const [phone, setPhone] = useState('')
    const [otp, setOtp] = useState('')
    const [step, setStep] = useState<'phone' | 'otp'>('phone')
    const [isVerifying, setIsVerifying] = useState(false)
    const toast = useToast()
    const router = useRouter()
    const { t } = useLanguage()
    const { login } = useAuth()

    const features = [
        { icon: FiShield, title: t('landing.features.noBank.title'), desc: t('landing.features.noBank.desc') },
        { icon: FiUsers, title: t('landing.features.trustCircle.title'), desc: t('landing.features.trustCircle.desc') },
        { icon: FiHeart, title: t('landing.features.helpOthers.title'), desc: t('landing.features.helpOthers.desc') },
    ]

    // Check if already authenticated
    useEffect(() => {
        const token = localStorage.getItem('kredefy_token')
        if (token) {
            router.push('/')
        }
    }, [router])

    // Send OTP mutation
    const sendOTPMutation = useMutation(
        (phoneNum: string) => authAPI.sendOTP(phoneNum),
        {
            onSuccess: () => {
                setStep('otp')
                toast({
                    title: 'OTP Sent! 📱',
                    description: t('auth.enterOtp').split(' ')[0] + ' code sent to ' + phone,
                    status: 'success',
                    duration: 4000,
                })
            },
            onError: (error) => {
                toast({
                    title: 'Failed to send OTP',
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    // Verify OTP mutation
    const verifyOTPMutation = useMutation(
        ({ phone, otp }: { phone: string; otp: string }) => authAPI.verifyOTP(phone, otp),
        {
            onSuccess: () => {
                toast({
                    title: 'Welcome to Kredefy! 🎉',
                    status: 'success',
                    duration: 3000,
                })
                router.push('/')
            },
            onError: (error) => {
                toast({
                    title: 'Invalid OTP',
                    description: error.message || 'Please try again',
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    const handleSendOTP = () => {
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length !== 10) {
            toast({
                title: 'Enter valid 10-digit phone number',
                status: 'error',
                duration: 3000,
            })
            return
        }
        sendOTPMutation.mutate(`+91${cleanPhone}`)
    }

    const handleVerifyOTP = async (otpValue: string) => {
        if (otpValue.length === 6) {
            setIsVerifying(true)
            const cleanPhone = `+91${phone.replace(/\D/g, '')}`
            try {
                // Use AuthContext login which properly updates state before redirect
                await login(cleanPhone, otpValue)
                toast({
                    title: 'Welcome to Kredefy! 🎉',
                    status: 'success',
                    duration: 3000,
                })
                // login() already handles redirect to '/'
            } catch (error: any) {
                toast({
                    title: 'Invalid OTP',
                    description: error.message || 'Please try again',
                    status: 'error',
                    duration: 4000,
                })
            } finally {
                setIsVerifying(false)
            }
        }
    }

    const isLoading = sendOTPMutation.isLoading || isVerifying

    return (
        <Flex minH="100vh">
            {/* LEFT SIDE - Value Proposition */}
            <Flex
                flex={1}
                display={{ base: 'none', lg: 'flex' }}
                bg="linear-gradient(135deg, #e6f4ea 0%, #d1fae5 50%, #ccfbf1 100%)"
                alignItems="center"
                justifyContent="center"
                p={12}
                position="relative"
                overflow="hidden"
            >
                <Box
                    position="absolute"
                    top="-10%"
                    right="-10%"
                    w="400px"
                    h="400px"
                    borderRadius="full"
                    bg="rgba(16, 185, 129, 0.1)"
                />
                <Box
                    position="absolute"
                    bottom="-20%"
                    left="-10%"
                    w="500px"
                    h="500px"
                    borderRadius="full"
                    bg="rgba(13, 148, 136, 0.1)"
                />

                <MotionBox
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    maxW="420px"
                    position="relative"
                >
                    <HStack spacing={3} mb={8}>
                        <Box
                            w="60px"
                            h="60px"
                            borderRadius="xl"
                            bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color="white"
                            fontWeight="800"
                            fontSize="2xl"
                            boxShadow="0 10px 30px rgba(16, 185, 129, 0.3)"
                        >
                            K
                        </Box>
                        <Text
                            fontSize="2xl"
                            fontWeight="800"
                            bgGradient="linear(to-r, teal.700, emerald.600)"
                            bgClip="text"
                        >
                            Kredefy
                        </Text>
                    </HStack>

                    <Heading fontSize="4xl" fontWeight="800" color="teal.900" mb={4} lineHeight="1.2">
                        {t('landing.hero.title')}<br />
                        <Text as="span" color="emerald.500">{t('landing.hero.titleHighlight')}</Text>
                    </Heading>

                    <Text color="gray.600" fontSize="lg" mb={10}>
                        {t('landing.hero.subtitle')}
                    </Text>

                    <VStack align="start" spacing={4}>
                        {features.map((f, i) => (
                            <MotionBox
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                            >
                                <HStack spacing={4}>
                                    <Box
                                        p={3}
                                        borderRadius="xl"
                                        bg="white"
                                        boxShadow="sm"
                                        color="emerald.600"
                                    >
                                        <Icon as={f.icon} boxSize={5} />
                                    </Box>
                                    <VStack align="start" spacing={0}>
                                        <Text fontWeight="700" color="gray.800">{f.title}</Text>
                                        <Text fontSize="sm" color="gray.500">{f.desc}</Text>
                                    </VStack>
                                </HStack>
                            </MotionBox>
                        ))}
                    </VStack>
                </MotionBox>
            </Flex>

            {/* RIGHT SIDE - Auth Form */}
            <Flex
                flex={1}
                alignItems="center"
                justifyContent="center"
                bg="white"
                p={{ base: 6, md: 12 }}
            >
                <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    w="100%"
                    maxW="400px"
                >
                    {step === 'phone' ? (
                        <>
                            <VStack align="start" spacing={2} mb={8}>
                                <Text fontSize="3xl">👋</Text>
                                <Heading fontSize="2xl" fontWeight="800" color="gray.800">
                                    {t('auth.welcome')}
                                </Heading>
                                <Text color="gray.500">
                                    {t('auth.subtitle')}
                                </Text>
                            </VStack>

                            {sendOTPMutation.error && (
                                <Alert status="error" borderRadius="xl" mb={4}>
                                    <AlertIcon />
                                    {sendOTPMutation.error.message}
                                </Alert>
                            )}

                            <FormControl mb={6}>
                                <FormLabel fontSize="sm" color="gray.700" fontWeight="600">
                                    {t('auth.phone')}
                                </FormLabel>
                                <HStack
                                    bg="gray.50"
                                    borderRadius="xl"
                                    border="2px solid"
                                    borderColor="gray.200"
                                    px={4}
                                    py={1}
                                    _focusWithin={{ borderColor: 'emerald.400', bg: 'white' }}
                                    transition="all 0.2s"
                                >
                                    <Text color="gray.500" fontWeight="500">+91</Text>
                                    <Input
                                        type="tel"
                                        placeholder="98765 43210"
                                        size="lg"
                                        border="none"
                                        bg="transparent"
                                        _focus={{ boxShadow: 'none' }}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        fontWeight="600"
                                        letterSpacing="1px"
                                        disabled={isLoading}
                                    />
                                    <Icon as={FiPhone} color="gray.400" />
                                </HStack>
                            </FormControl>

                            <Button
                                w="100%"
                                size="lg"
                                bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                color="white"
                                borderRadius="xl"
                                _hover={{
                                    bg: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)'
                                }}
                                rightIcon={isLoading ? <Spinner size="sm" /> : <FiArrowRight />}
                                onClick={handleSendOTP}
                                isLoading={sendOTPMutation.isLoading}
                                loadingText="Sending..."
                                isDisabled={phone.length !== 10}
                            >
                                {t('auth.sendOtp')}
                            </Button>

                            <Text fontSize="xs" color="gray.400" textAlign="center" mt={4}>
                                {t('auth.terms')}
                            </Text>
                        </>
                    ) : (
                        <>
                            <VStack align="start" spacing={2} mb={8}>
                                <Text fontSize="3xl">📱</Text>
                                <Heading fontSize="2xl" fontWeight="800" color="gray.800">
                                    {t('auth.verifyOtp')}
                                </Heading>
                                <Text color="gray.500">
                                    {t('auth.enterOtp')} <Text as="span" fontWeight="600">+91 {phone}</Text>
                                </Text>
                            </VStack>

                            {verifyOTPMutation.error && (
                                <Alert status="error" borderRadius="xl" mb={4}>
                                    <AlertIcon />
                                    {verifyOTPMutation.error.message}
                                </Alert>
                            )}

                            <VStack spacing={6}>
                                <HStack justify="center">
                                    <PinInput
                                        size="lg"
                                        otp
                                        onComplete={handleVerifyOTP}
                                        focusBorderColor="emerald.400"
                                        isDisabled={verifyOTPMutation.isLoading}
                                    >
                                        {[...Array(6)].map((_, i) => (
                                            <PinInputField
                                                key={i}
                                                borderRadius="xl"
                                                borderWidth="2px"
                                                fontWeight="700"
                                                fontSize="xl"
                                                w="50px"
                                                h="60px"
                                                _focus={{ borderColor: 'emerald.400', bg: 'emerald.50' }}
                                            />
                                        ))}
                                    </PinInput>
                                </HStack>

                                {verifyOTPMutation.isLoading && (
                                    <HStack>
                                        <Spinner size="sm" color="emerald.500" />
                                        <Text color="gray.500">Verifying...</Text>
                                    </HStack>
                                )}

                                <Button
                                    variant="ghost"
                                    colorScheme="teal"
                                    onClick={() => {
                                        setStep('phone')
                                        sendOTPMutation.reset()
                                        verifyOTPMutation.reset()
                                    }}
                                    isDisabled={isLoading}
                                >
                                    ← Change Number
                                </Button>

                                <HStack fontSize="sm" color="gray.500">
                                    <Text>Didn't receive code?</Text>
                                    <Button
                                        variant="link"
                                        colorScheme="teal"
                                        size="sm"
                                        onClick={() => sendOTPMutation.mutate(`+91${phone}`)}
                                        isDisabled={sendOTPMutation.isLoading}
                                    >
                                        {t('auth.resend')}
                                    </Button>
                                </HStack>
                            </VStack>
                        </>
                    )}

                    {/* Mobile logo */}
                    <VStack display={{ base: 'flex', lg: 'none' }} mt={10} spacing={2}>
                        <HStack>
                            <Box
                                w="40px"
                                h="40px"
                                borderRadius="lg"
                                bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                color="white"
                                fontWeight="800"
                            >
                                K
                            </Box>
                            <Text fontWeight="700" color="gray.800">Kredefy</Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.400">{t('app.tagline')}</Text>
                    </VStack>
                </MotionBox>
            </Flex>
        </Flex>
    )
}
