'use client'

import { useState, useEffect } from 'react'
import {
    Box, VStack, HStack, Text, Heading, Button,
    IconButton, Portal, Circle, Flex, useColorModeValue,
    Icon, Progress, IconButtonProps
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FiX, FiChevronRight, FiChevronLeft, FiAward,
    FiShield, FiUsers, FiTrendingUp, FiCheckCircle
} from 'react-icons/fi'
import { useLanguage } from '@/context/LanguageContext'

const MotionBox = motion.create(Box)

interface GuideStep {
    id: string
    title: string
    desc: string
    icon: any
    color: string
}

export default function FeatureGuide() {
    const { t } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)

    // Check if first time user (simple localStorage check)
    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('kredefy_guide_seen')
        if (!hasSeenGuide) {
            // Delay guide for better UX
            const timer = setTimeout(() => setIsOpen(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleClose = () => {
        setIsOpen(false)
        localStorage.setItem('kredefy_guide_seen', 'true')
    }

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleClose()
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const steps: GuideStep[] = [
        {
            id: 'bharosa',
            title: t('landing.features.noBank.title'),
            desc: t('onboarding.slides.trust.desc'),
            icon: FiAward,
            color: 'orange.400'
        },
        {
            id: 'circles',
            title: t('landing.features.trustCircle.title'),
            desc: t('onboarding.slides.circle.desc'),
            icon: FiUsers,
            color: 'blue.400'
        },
        {
            id: 'vouching',
            title: t('onboarding.slides.earn.title'),
            desc: t('onboarding.slides.earn.desc'),
            icon: FiShield,
            color: 'emerald.400'
        },
        {
            id: 'growth',
            title: 'Grow Together',
            desc: 'As your trust score grows, you unlock larger loans and lower interest rates!',
            icon: FiTrendingUp,
            color: 'purple.400'
        }
    ]

    const step = steps[currentStep]

    return (
        <AnimatePresence>
            {isOpen && (
                <Portal>
                    <Box
                        position="fixed"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        zIndex={2000}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        p={4}
                    >
                        {/* Overlay */}
                        <MotionBox
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            bg="blackAlpha.700"
                            backdropFilter="blur(8px)"
                            onClick={handleClose}
                        />

                        {/* Modal Content */}
                        <MotionBox
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            bg="white"
                            w="full"
                            maxW="450px"
                            borderRadius="3xl"
                            overflow="hidden"
                            boxShadow="2xl"
                            position="relative"
                            p={8}
                            textAlign="center"
                        >
                            <IconButton
                                aria-label="Close"
                                icon={<FiX />}
                                position="absolute"
                                top={4}
                                right={4}
                                variant="ghost"
                                borderRadius="full"
                                onClick={handleClose}
                            />

                            <VStack spacing={6}>
                                <Circle size="80px" bg={`${step.color}15`} color={step.color}>
                                    <Icon as={step.icon} boxSize={10} />
                                </Circle>

                                <VStack spacing={2}>
                                    <Heading size="lg" color="gray.800">
                                        {step.title}
                                    </Heading>
                                    <Text color="gray.600" fontSize="md">
                                        {step.desc}
                                    </Text>
                                </VStack>

                                {/* Progress Dots */}
                                <HStack spacing={2}>
                                    {steps.map((_, idx) => (
                                        <Circle
                                            key={idx}
                                            size="8px"
                                            bg={idx === currentStep ? step.color : 'gray.200'}
                                            transition="all 0.3s"
                                        />
                                    ))}
                                </HStack>

                                <HStack w="full" spacing={4} justify="space-between" pt={4}>
                                    <Button
                                        variant="ghost"
                                        leftIcon={<FiChevronLeft />}
                                        onClick={prevStep}
                                        isDisabled={currentStep === 0}
                                        borderRadius="xl"
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        rightIcon={currentStep === steps.length - 1 ? <FiCheckCircle /> : <FiChevronRight />}
                                        colorScheme={step.color.split('.')[0]}
                                        bg={step.color}
                                        _hover={{ bg: step.color }}
                                        color="white"
                                        borderRadius="xl"
                                        size="lg"
                                        px={8}
                                        onClick={nextStep}
                                        boxShadow={`0 8px 20px -6px ${step.color}`}
                                    >
                                        {currentStep === steps.length - 1 ? "Got it!" : "Next"}
                                    </Button>
                                </HStack>
                            </VStack>
                        </MotionBox>
                    </Box>
                </Portal>
            )}
        </AnimatePresence>
    )
}
