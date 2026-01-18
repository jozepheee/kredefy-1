'use client'

import { Box, VStack, HStack, Text, Icon, Collapse, Badge, useDisclosure, IconButton } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FaBrain, FaChevronDown, FaChevronUp, FaLightbulb, FaSearch, FaCheckCircle } from 'react-icons/fa'

interface ReasoningStep {
    type: 'observe' | 'analyze' | 'hypothesize' | 'act' | 'conclude'
    content: string
    confidence?: number
}

interface ReasoningTracesProps {
    traces: ReasoningStep[]
    agentsUsed?: string[]
}

const MotionBox = motion.create(Box)

const stepIcons = {
    observe: FaSearch,
    analyze: FaBrain,
    hypothesize: FaLightbulb,
    act: FaCheckCircle,
    conclude: FaCheckCircle,
}

const stepColors = {
    observe: 'blue',
    analyze: 'purple',
    hypothesize: 'orange',
    act: 'green',
    conclude: 'teal',
}

export default function ReasoningTraces({ traces, agentsUsed }: ReasoningTracesProps) {
    const { isOpen, onToggle } = useDisclosure()

    if (!traces || traces.length === 0) return null

    return (
        <Box mt={3}>
            <HStack
                onClick={onToggle}
                cursor="pointer"
                p={2}
                bg="purple.50"
                borderRadius="lg"
                _hover={{ bg: 'purple.100' }}
            >
                <Icon as={FaBrain} color="purple.500" />
                <Text fontSize="xs" fontWeight="600" color="purple.700">
                    Nova's Thinking Process
                </Text>
                {agentsUsed && agentsUsed.length > 0 && (
                    <HStack spacing={1} ml={2}>
                        {agentsUsed.map((agent, i) => (
                            <Badge key={i} colorScheme="purple" fontSize="xx-small" variant="outline">
                                {agent}
                            </Badge>
                        ))}
                    </HStack>
                )}
                <Icon as={isOpen ? FaChevronUp : FaChevronDown} color="purple.500" ml="auto" />
            </HStack>

            <Collapse in={isOpen} animateOpacity>
                <VStack
                    align="stretch"
                    spacing={2}
                    mt={2}
                    p={3}
                    bg="gray.50"
                    borderRadius="lg"
                    fontSize="xs"
                >
                    {traces.map((step, index) => (
                        <MotionBox
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <HStack align="start" spacing={2}>
                                <Box
                                    p={1}
                                    borderRadius="full"
                                    bg={`${stepColors[step.type]}.100`}
                                    color={`${stepColors[step.type]}.600`}
                                >
                                    <Icon as={stepIcons[step.type]} boxSize={3} />
                                </Box>
                                <Box flex={1}>
                                    <Text color="gray.700" lineHeight="1.4">
                                        {step.content}
                                    </Text>
                                    {step.confidence && (
                                        <Text fontSize="xx-small" color="gray.400" mt={0.5}>
                                            Confidence: {Math.round(step.confidence * 100)}%
                                        </Text>
                                    )}
                                </Box>
                            </HStack>
                        </MotionBox>
                    ))}
                </VStack>
            </Collapse>
        </Box>
    )
}
