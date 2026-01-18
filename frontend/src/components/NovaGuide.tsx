'use client'

import { Box, Text, Portal } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

const MotionBox = motion.create(Box)

export interface GuideStep {
    text: string
    target?: string // ID of the target element (e.g., "#submit-btn")
    overlay?: boolean
    action?: 'click' | 'focus' | 'type'
}

interface NovaGuideProps {
    steps: GuideStep[]
    isActive: boolean
    onComplete: () => void
}

export default function NovaGuide({ steps, isActive, onComplete }: NovaGuideProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

    const currentStep = steps[currentStepIndex]

    useEffect(() => {
        if (!isActive || !currentStep) return

        if (currentStep.target) {
            const element = document.querySelector(currentStep.target)
            if (element) {
                const rect = element.getBoundingClientRect()
                setTargetRect(rect)
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })

                // Highlight effect on target (optional styling class)
                element.classList.add('nova-target-pulse')
                setTimeout(() => element.classList.remove('nova-target-pulse'), 3000)
            }
        } else {
            setTargetRect(null)
        }

        // Auto-advance for now after 3 seconds, or wait for user interaction?
        // simple auto-advance for demo flow
        const timer = setTimeout(() => {
            if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1)
            } else {
                onComplete() // All done
            }
        }, 4000)

        return () => clearTimeout(timer)
    }, [currentStepIndex, isActive, steps, onComplete])

    if (!isActive) return null

    return (
        <Portal>
            {/* Dark Overlay if requested */}
            <AnimatePresence>
                {currentStep?.overlay && (
                    <MotionBox
                        position="fixed"
                        top="0"
                        left="0"
                        w="100vw"
                        h="100vh"
                        bg="blackAlpha.600"
                        zIndex={9000}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                )}
            </AnimatePresence>

            {/* Floating Nova Mascot */}
            <MotionBox
                position="fixed"
                zIndex={9999}
                animate={{
                    top: targetRect ? targetRect.top - 80 : '50%',
                    left: targetRect ? targetRect.left + (targetRect.width / 2) - 50 : '50%',
                    x: targetRect ? 0 : '-50%',
                    y: targetRect ? 0 : '-50%',
                }}
                transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            >
                {/* Visual Mascot Representation */}
                <Box position="relative">
                    {/* Using a simplified SVG for the guide */}
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="#14b8a6" stroke="white" strokeWidth="4" />
                        <circle cx="35" cy="45" r="5" fill="white" />
                        <circle cx="65" cy="45" r="5" fill="white" />
                        <path d="M35 65 Q50 75 65 65" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>

                    {/* Speech Bubble */}
                    <MotionBox
                        position="absolute"
                        left="80px"
                        top="-20px"
                        bg="white"
                        p={3}
                        borderRadius="xl"
                        boxShadow="lg"
                        minW="200px"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Text fontWeight="600" fontSize="sm">{currentStep?.text}</Text>
                        <Box
                            position="absolute"
                            left="-8px"
                            bottom="20px"
                            w="0"
                            h="0"
                            borderTop="8px solid transparent"
                            borderBottom="8px solid transparent"
                            borderRight="8px solid white"
                        />
                    </MotionBox>
                </Box>
            </MotionBox>
        </Portal>
    )
}
