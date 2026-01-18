'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Box, Container, Heading, Text, VStack, HStack, Button,
    Flex, IconButton
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowRight, FiArrowLeft, FiX, FiCheck, FiShield, FiUsers, FiHeart, FiGift } from 'react-icons/fi'
import { useLanguage } from '@/context/LanguageContext'

const MotionBox = motion.create(Box)

interface SlideContent {
    key: string
    icon: string
    bg: string
    highlights: { key: string; icon: React.ReactNode }[]
}

const slides: SlideContent[] = [
    {
        key: 'trust',
        icon: '🎯',
        bg: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
        highlights: [
            { key: 'no_bank', icon: <FiShield /> },
            { key: 'phone_only', icon: <FiCheck /> },
            { key: 'build_score', icon: <FiHeart /> }
        ]
    },
    {
        key: 'circle',
        icon: '👥',
        bg: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        highlights: [
            { key: 'trusted_people', icon: <FiUsers /> },
            { key: 'small_loans', icon: <FiCheck /> },
            { key: 'vouch_system', icon: <FiShield /> }
        ]
    },
    {
        key: 'earn',
        icon: '🪙',
        bg: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        highlights: [
            { key: 'earn_tokens', icon: <FiGift /> },
            { key: 'on_time_bonus', icon: <FiCheck /> },
            { key: 'help_others', icon: <FiHeart /> }
        ]
    },
]

export default function OnboardingPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [currentSlide, setCurrentSlide] = useState(0)

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1)
        } else {
            localStorage.setItem('kredefy_onboarding_done', 'true')
            router.push('/auth')
        }
    }

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1)
        }
    }

    const handleSkip = () => {
        localStorage.setItem('kredefy_onboarding_done', 'true')
        router.push('/auth')
    }

    const slide = slides[currentSlide]
    const isLastSlide = currentSlide === slides.length - 1

    return (
        <Box minH="100vh" bg={slide.bg} overflow="hidden" position="relative">
            {/* Skip Button */}
            <Flex
                position="absolute"
                top={4}
                right={4}
                zIndex={100}
            >
                <Button
                    variant="ghost"
                    color="whiteAlpha.800"
                    size="sm"
                    onClick={handleSkip}
                    rightIcon={<FiX />}
                    _hover={{ bg: 'whiteAlpha.200' }}
                >
                    {t('onboarding.skip')}
                </Button>
            </Flex>

            {/* Progress Dots */}
            <Flex
                position="absolute"
                top={4}
                left={0}
                right={0}
                justify="center"
                gap={2}
                zIndex={100}
            >
                {slides.map((_, i) => (
                    <Box
                        key={i}
                        w={currentSlide === i ? '24px' : '8px'}
                        h="8px"
                        borderRadius="full"
                        bg={currentSlide === i ? 'white' : 'whiteAlpha.400'}
                        transition="all 0.3s"
                        cursor="pointer"
                        onClick={() => setCurrentSlide(i)}
                    />
                ))}
            </Flex>

            {/* Slide Content */}
            <Container maxW="lg" h="100vh" display="flex" alignItems="center">
                <AnimatePresence mode="wait">
                    <MotionBox
                        key={currentSlide}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        w="full"
                    >
                        <VStack spacing={8} textAlign="center" py={12}>
                            {/* Icon */}
                            <MotionBox
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring' }}
                            >
                                <Box fontSize="7xl" mb={2}>
                                    {slide.icon}
                                </Box>
                            </MotionBox>

                            {/* Title */}
                            <Heading
                                color="white"
                                fontSize={{ base: '2xl', md: '3xl' }}
                                fontWeight="800"
                                lineHeight="1.3"
                            >
                                {t(`onboarding.slides.${slide.key}.title`)}
                            </Heading>

                            {/* Description */}
                            <Text
                                color="whiteAlpha.900"
                                fontSize={{ base: 'md', md: 'lg' }}
                                maxW="400px"
                                lineHeight="1.7"
                            >
                                {t(`onboarding.slides.${slide.key}.desc`)}
                            </Text>

                            {/* Highlight Points */}
                            <VStack
                                spacing={4}
                                align="stretch"
                                w="full"
                                maxW="360px"
                                mt={4}
                            >
                                {slide.highlights.map((h, i) => (
                                    <MotionBox
                                        key={h.key}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + i * 0.1 }}
                                    >
                                        <HStack
                                            bg="whiteAlpha.200"
                                            backdropFilter="blur(8px)"
                                            borderRadius="xl"
                                            p={4}
                                            spacing={3}
                                        >
                                            <Box
                                                color="white"
                                                fontSize="xl"
                                                p={2}
                                                bg="whiteAlpha.200"
                                                borderRadius="lg"
                                            >
                                                {h.icon}
                                            </Box>
                                            <Text
                                                color="white"
                                                fontSize="sm"
                                                fontWeight="500"
                                                textAlign="left"
                                            >
                                                {t(`onboarding.highlights.${slide.key}.${h.key}`)}
                                            </Text>
                                        </HStack>
                                    </MotionBox>
                                ))}
                            </VStack>
                        </VStack>
                    </MotionBox>
                </AnimatePresence>
            </Container>

            {/* Navigation Buttons */}
            <Flex
                position="absolute"
                bottom={10}
                left={0}
                right={0}
                px={6}
                justify="space-between"
                align="center"
            >
                <IconButton
                    aria-label="Previous"
                    icon={<FiArrowLeft />}
                    variant="ghost"
                    color="white"
                    size="lg"
                    borderRadius="full"
                    visibility={currentSlide === 0 ? 'hidden' : 'visible'}
                    onClick={handlePrev}
                    _hover={{ bg: 'whiteAlpha.200' }}
                />

                <Button
                    size="lg"
                    bg="white"
                    color={currentSlide === 2 ? 'orange.600' : currentSlide === 1 ? 'purple.600' : 'teal.600'}
                    px={isLastSlide ? 10 : 8}
                    py={7}
                    fontSize="md"
                    fontWeight="700"
                    borderRadius="full"
                    rightIcon={<FiArrowRight />}
                    onClick={handleNext}
                    _hover={{
                        transform: 'scale(1.05)',
                    }}
                    boxShadow="0 8px 32px rgba(0,0,0,0.2)"
                >
                    {isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}
                </Button>

                <Box w="48px" />
            </Flex>
        </Box>
    )
}
