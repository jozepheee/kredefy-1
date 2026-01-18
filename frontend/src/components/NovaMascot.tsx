'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Box, Text, Input, VStack, HStack, IconButton, Spinner, Badge } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMic, FiSend, FiX, FiVolume2 } from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { novaAPI } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import NovaGuide, { GuideStep } from './NovaGuide'
import ReasoningTraces from './ReasoningTraces'
import BlockchainLink from './BlockchainLink'

const MotionBox = motion.create(Box)

// Nova Mood Types
export type NovaMood = 'happy' | 'excited' | 'thinking' | 'sleeping' | 'waking' | 'speaking' | 'celebrating'

// Nova SVG Mascot with moods
const NovaSVG = ({ mood = 'happy', size = 100 }: { mood?: NovaMood; size?: number }) => {
    const getAnimationClass = () => {
        switch (mood) {
            case 'sleeping': return 'nova-sleep'
            case 'excited':
            case 'celebrating': return 'nova-bounce'
            case 'speaking': return 'nova-speak'
            default: return 'nova-float'
        }
    }

    const getEyes = () => {
        switch (mood) {
            case 'sleeping':
                return (
                    <>
                        <path d="M30 42 Q35 40 40 42" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M60 42 Q65 40 70 42" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <text x="75" y="28" fontSize="10" fill="#718096" fontWeight="bold">z</text>
                        <text x="82" y="22" fontSize="8" fill="#a0aec0" fontWeight="bold">z</text>
                    </>
                )
            case 'excited':
            case 'celebrating':
                return (
                    <>
                        <path d="M28 42 Q35 36 42 42" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <path d="M58 42 Q65 36 72 42" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </>
                )
            case 'thinking':
                return (
                    <>
                        <circle cx="35" cy="40" r="6" fill="#1a365d" />
                        <circle cx="65" cy="40" r="6" fill="#1a365d" />
                        <circle cx="36" cy="38" r="2" fill="white" />
                        <circle cx="66" cy="38" r="2" fill="white" />
                        <circle cx="80" cy="32" r="4" fill="#e2e8f0" />
                        <circle cx="88" cy="24" r="5" fill="#cbd5e0" />
                    </>
                )
            case 'speaking':
                return (
                    <>
                        <circle cx="35" cy="42" r="5" fill="#1a365d" />
                        <circle cx="65" cy="42" r="5" fill="#1a365d" />
                        <circle cx="36" cy="40" r="2" fill="white" />
                        <circle cx="66" cy="40" r="2" fill="white" />
                    </>
                )
            default:
                return (
                    <>
                        <circle cx="35" cy="42" r="6" fill="#1a365d" />
                        <circle cx="65" cy="42" r="6" fill="#1a365d" />
                        <circle cx="37" cy="40" r="2" fill="white" />
                        <circle cx="67" cy="40" r="2" fill="white" />
                    </>
                )
        }
    }

    const getMouth = () => {
        switch (mood) {
            case 'sleeping':
                return <path d="M45 58 Q50 60 55 58" stroke="#1a365d" strokeWidth="2" fill="none" strokeLinecap="round" />
            case 'excited':
            case 'celebrating':
                return (
                    <>
                        <path d="M38 54 Q50 70 62 54" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
                        <ellipse cx="50" cy="60" rx="6" ry="4" fill="#fc8181" />
                    </>
                )
            case 'thinking':
                return <circle cx="55" cy="58" r="4" fill="#1a365d" />
            case 'speaking':
                return <ellipse cx="50" cy="58" rx="8" ry="6" fill="#1a365d" className="mouth-speak" />
            default:
                return <path d="M40 54 Q50 64 60 54" stroke="#1a365d" strokeWidth="3" fill="none" strokeLinecap="round" />
        }
    }

    return (
        <Box position="relative" width={`${size}px`} height={`${size + 20}px`}>
            <style jsx global>{`
        @keyframes nova-float-anim { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes nova-bounce-anim { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes nova-sleep-anim { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-3px) rotate(3deg); } }
        @keyframes mouth-talk { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.5); } }
        .nova-float { animation: nova-float-anim 3s ease-in-out infinite; }
        .nova-bounce { animation: nova-bounce-anim 0.5s ease-in-out infinite; }
        .nova-sleep { animation: nova-sleep-anim 4s ease-in-out infinite; }
        .nova-speak .mouth-speak { transform-origin: center; animation: mouth-talk 0.15s ease-in-out infinite; }
      `}</style>

            <Box
                position="absolute"
                bottom="0"
                left="50%"
                transform="translateX(-50%)"
                width={`${size * 0.5}px`}
                height={`${size * 0.1}px`}
                bg="blackAlpha.200"
                borderRadius="50%"
                filter="blur(4px)"
            />

            <Box className={getAnimationClass()} position="absolute" top="0" left="0">
                <svg width={size} height={size} viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="novaBody" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#5eead4" />
                            <stop offset="50%" stopColor="#2dd4bf" />
                            <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                        <linearGradient id="novaGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#99f6e4" />
                            <stop offset="100%" stopColor="#5eead4" />
                        </linearGradient>
                    </defs>

                    <ellipse cx="50" cy="55" rx="38" ry="42" fill="url(#novaGlow)" opacity="0.3" />
                    <ellipse cx="50" cy="55" rx="35" ry="40" fill="url(#novaBody)" />
                    <ellipse cx="35" cy="38" rx="8" ry="12" fill="white" opacity="0.4" />

                    <line x1="35" y1="18" x2="28" y2="5" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="28" cy="5" r="5" fill="#fbbf24" className="saathi-glow" />
                    <line x1="65" y1="18" x2="72" y2="5" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="72" cy="5" r="5" fill="#fbbf24" className="saathi-glow" />

                    <circle cx="22" cy="52" r="6" fill="#feb2b2" opacity="0.6" />
                    <circle cx="78" cy="52" r="6" fill="#feb2b2" opacity="0.6" />

                    <text x="43" y="78" fontSize="16">💚</text>

                    <ellipse cx="12" cy="55" rx="10" ry="8" fill="#2dd4bf" />
                    <ellipse cx="88" cy="55" rx="10" ry="8" fill="#2dd4bf" />

                    {getEyes()}
                    {getMouth()}
                </svg>
            </Box>
        </Box>
    )
}

interface ChatMessage {
    role: 'user' | 'nova'
    text: string
    voiceUrl?: string
    action?: any
    reasoning_traces?: { type: string; content: string; confidence?: number }[]
    agents_used?: string[]
    blockchain_tx?: string
}

export default function NovaMascot() {
    const [mood, setMood] = useState<NovaMood>('happy')
    const [message, setMessage] = useState('')
    const [chatOpen, setChatOpen] = useState(false)
    const [chatInput, setChatInput] = useState('')
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
    const [loading, setLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [lastInteraction, setLastInteraction] = useState(Date.now())
    const chatEndRef = useRef<HTMLDivElement>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const { user } = useAuth()
    const { t, language } = useLanguage()

    // Idle detection - go to sleep after 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            if (Date.now() - lastInteraction > 30000 && mood !== 'sleeping' && !chatOpen) {
                setMood('sleeping')
                setMessage('')
            }
        }, 5000)
        return () => clearInterval(timer)
    }, [lastInteraction, mood, chatOpen])

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatHistory])

    // Play voice audio
    const playVoice = useCallback((base64Audio: string) => {
        try {
            const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`)
            setMood('speaking')
            audio.onended = () => setMood('happy')
            audio.play().catch(console.error)
        } catch (err) {
            console.error('Failed to play voice:', err)
        }
    }, [])

    const [guideSteps, setGuideSteps] = useState<GuideStep[]>([])
    const [guideActive, setGuideActive] = useState(false)
    const router = useRouter()

    // ... existing ...

    // Send chat message to REAL Nova API
    const handleSendChat = async () => {
        const textToSend = chatInput.trim()
        if (!textToSend) return

        setChatInput('')
        setChatHistory(prev => [...prev, { role: 'user', text: textToSend }])
        setLoading(true)
        setMood('thinking')
        setLastInteraction(Date.now())

        try {
            // Call REAL Nova API
            const response = await novaAPI.chat(textToSend, language, true)

            const novaMessage: ChatMessage = {
                role: 'nova',
                text: response.message || response.response, // Handle new format
                voiceUrl: response.voice_audio,
                action: response.action,
                reasoning_traces: (response as any).reasoning_traces || (response as any).reasoning_traces_raw,
                agents_used: (response as any).agents_used,
                blockchain_tx: (response as any).blockchain_tx,
            }

            setChatHistory(prev => [...prev, novaMessage])
            setMood('happy')

            // Play voice if available
            if (response.voice_audio) {
                playVoice(response.voice_audio)
            }

            // HANDLE ACTIONS - "The Doer"
            if (response.action === 'NAVIGATE' && response.target) {
                // Delay slightly to let user read message
                const targetPath = response.target
                setTimeout(() => {
                    router.push(targetPath)
                    setChatOpen(false) // Close chat to show page
                }, 1500)
            }

            if (response.action === 'GUIDE_FLOW' && response.guide_steps) {
                // 1. Navigate if needed
                if (response.screen) {
                    router.push(response.screen)
                    // If we have state (pre-fill), pass it via query params or context?
                    // For hackathon, just navigating.
                }
                setChatOpen(false) // Close chat

                // 2. Start Guide Overlay
                setTimeout(() => {
                    setGuideSteps(response.guide_steps || [])
                    setGuideActive(true)
                }, 1000)
            }

        } catch (err) {
            console.error('Nova chat error:', err)
            setChatHistory(prev => [...prev, {
                role: 'nova',
                text: t('nova.error')
            }])
            setMood('happy')
        }

        setLoading(false)
    }

    // Start voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data)
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(track => track.stop())

                setLoading(true)
                setMood('thinking')

                try {
                    // Send voice to REAL Nova API
                    const response = await novaAPI.voice(audioBlob)

                    // Add user's transcribed message
                    setChatHistory(prev => [...prev, { role: 'user', text: response.transcription }])

                    // Add Nova's response
                    const novaMessage: ChatMessage = {
                        role: 'nova',
                        text: response.response,
                        voiceUrl: response.voice_audio
                    }
                    setChatHistory(prev => [...prev, novaMessage])

                    setMood('happy')

                    if (response.voice_audio) {
                        playVoice(response.voice_audio)
                    }
                } catch (err) {
                    console.error('Voice processing error:', err)
                    setChatHistory(prev => [...prev, {
                        role: 'nova',
                        text: t('nova.voiceError')
                    }])
                    setMood('happy')
                }

                setLoading(false)
            }

            mediaRecorder.start()
            setIsListening(true)
        } catch (err) {
            console.error('Mic access error:', err)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isListening) {
            mediaRecorderRef.current.stop()
            setIsListening(false)
        }
    }

    const quickQuestions = [
        t('nova.questions.getLoan'),
        t('nova.questions.helpFriend'),
        t('nova.questions.checkScore')
    ]

    return (
        <AnimatePresence>
            <MotionBox
                position="fixed"
                bottom="20px"
                right="20px"
                zIndex={1000}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
            >
                {/* Chat Panel */}
                {chatOpen && (
                    <MotionBox
                        position="absolute"
                        bottom="140px"
                        right="0"
                        width="340px"
                        bg="white"
                        borderRadius="2xl"
                        boxShadow="0 20px 60px rgba(0,0,0,0.2)"
                        overflow="hidden"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                    >
                        {/* Header */}
                        <HStack
                            bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                            p={4}
                            justify="space-between"
                        >
                            <HStack>
                                <Text fontSize="lg" fontWeight="800" color="white">Nova AI</Text>
                                <Badge colorScheme="green" variant="solid" fontSize="2xs">ONLINE</Badge>
                                <Badge colorScheme="purple" variant="outline" fontSize="2xs" color="white" borderColor="whiteAlpha.500">Mastra Secured 🛡️</Badge>
                            </HStack>
                            <IconButton
                                aria-label="Close"
                                size="sm"
                                variant="ghost"
                                color="white"
                                onClick={() => setChatOpen(false)}
                                icon={<FiX />}
                                _hover={{ bg: 'whiteAlpha.200' }}
                            />
                        </HStack>

                        {/* Messages */}
                        <VStack
                            h="280px"
                            overflowY="auto"
                            p={4}
                            align="stretch"
                            spacing={3}
                            bg="gray.50"
                        >
                            {chatHistory.length === 0 && (
                                <VStack py={6} spacing={3}>
                                    <Text fontSize="2xl">👋</Text>
                                    <Text fontSize="sm" color="gray.600" textAlign="center" fontWeight="500">
                                        {t('nova.greeting').replace('Nova', `Nova, hi ${user?.full_name || 'there'}!`)}
                                    </Text>
                                    <HStack spacing={2} flexWrap="wrap" justify="center">
                                        {quickQuestions.map(q => (
                                            <Badge
                                                key={q}
                                                colorScheme="teal"
                                                borderRadius="full"
                                                px={3}
                                                py={1}
                                                cursor="pointer"
                                                _hover={{ bg: 'teal.100' }}
                                                onClick={() => {
                                                    setChatInput(q)
                                                }}
                                            >
                                                {q}
                                            </Badge>
                                        ))}
                                    </HStack>
                                </VStack>
                            )}

                            {chatHistory.map((msg, i) => (
                                <React.Fragment key={i}>
                                    <HStack
                                        alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                                        maxW="85%"
                                    >
                                        <Box
                                            bg={msg.role === 'user' ? 'teal.500' : 'white'}
                                            color={msg.role === 'user' ? 'white' : 'gray.800'}
                                            px={4}
                                            py={2.5}
                                            borderRadius="2xl"
                                            borderBottomRightRadius={msg.role === 'user' ? 'sm' : '2xl'}
                                            borderBottomLeftRadius={msg.role === 'nova' ? 'sm' : '2xl'}
                                            fontSize="sm"
                                            boxShadow="sm"
                                        >
                                            {msg.text}
                                        </Box>
                                        {msg.role === 'nova' && msg.voiceUrl && (
                                            <IconButton
                                                aria-label="Play voice"
                                                size="xs"
                                                borderRadius="full"
                                                colorScheme="teal"
                                                variant="ghost"
                                                icon={<FiVolume2 />}
                                                onClick={() => playVoice(msg.voiceUrl!)}
                                            />
                                        )}
                                    </HStack>
                                    {/* Show reasoning traces for Nova messages */}
                                    {msg.role === 'nova' && msg.reasoning_traces && msg.reasoning_traces.length > 0 && (
                                        <Box maxW="85%" alignSelf="flex-start" mt={1}>
                                            <ReasoningTraces
                                                traces={msg.reasoning_traces}
                                                agentsUsed={msg.agents_used}
                                            />
                                        </Box>
                                    )}
                                    {/* Show blockchain link for Nova messages */}
                                    {msg.role === 'nova' && msg.blockchain_tx && (
                                        <Box maxW="85%" alignSelf="flex-start">
                                            <BlockchainLink txHash={msg.blockchain_tx} />
                                        </Box>
                                    )}
                                </React.Fragment>
                            ))}

                            {loading && (
                                <HStack alignSelf="flex-start" bg="white" px={4} py={2} borderRadius="2xl" boxShadow="sm">
                                    <Spinner size="xs" color="teal.500" />
                                    <Text fontSize="sm" color="gray.500">{t('nova.thinking')}</Text>
                                </HStack>
                            )}
                            <div ref={chatEndRef} />
                        </VStack>

                        {/* Input */}
                        <HStack p={3} borderTop="1px solid" borderColor="gray.100" bg="white">
                            <IconButton
                                aria-label="Voice"
                                size="sm"
                                borderRadius="full"
                                colorScheme={isListening ? 'red' : 'gray'}
                                variant={isListening ? 'solid' : 'ghost'}
                                onClick={isListening ? stopRecording : startRecording}
                                icon={<FiMic />}
                                isDisabled={loading}
                            />
                            <Input
                                placeholder={t('nova.askAnything') || "Ask anything..."}
                                size="md"
                                value={chatInput}
                                borderRadius="full"
                                border="2px solid"
                                borderColor="gray.200"
                                _focus={{ borderColor: 'teal.400' }}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendChat()}
                                isDisabled={loading}
                            />
                            <IconButton
                                aria-label="Send"
                                size="sm"
                                colorScheme="teal"
                                borderRadius="full"
                                onClick={handleSendChat}
                                isDisabled={loading || !chatInput.trim()}
                                icon={<FiSend />}
                            />
                        </HStack>
                    </MotionBox>
                )}

                {/* Message bubble */}
                {message && !chatOpen && (
                    <MotionBox
                        position="absolute"
                        bottom="130px"
                        right="10px"
                        bg="white"
                        px={4}
                        py={2}
                        borderRadius="xl"
                        boxShadow="lg"
                        maxW="200px"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Text fontSize="sm" fontWeight="500">{message}</Text>
                    </MotionBox>
                )}

                {/* Nova mascot - clickable */}
                <Box
                    cursor="pointer"
                    _hover={{ transform: 'scale(1.08)' }}
                    transition="transform 0.2s"
                    onClick={() => {
                        if (mood === 'sleeping') {
                            setMood('waking')
                            setMessage(t('nova.waking'))
                            setTimeout(() => {
                                setMood('happy')
                                setMessage('')
                            }, 2000)
                        } else {
                            setChatOpen(!chatOpen)
                        }
                        setLastInteraction(Date.now())
                    }}
                >
                    <NovaSVG mood={mood} size={110} />
                </Box>
            </MotionBox>

            <NovaGuide
                steps={guideSteps}
                isActive={guideActive}
                onComplete={() => {
                    setGuideActive(false)
                    setMood('celebrating') // Celebration after guidance!
                }}
            />
        </AnimatePresence >
    )
}
