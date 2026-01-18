'use client'

import { useState } from 'react'
import {
    Box, VStack, HStack, Text, Icon, Flex, Avatar,
    Tooltip, Badge, Divider
} from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    FiHome, FiUsers, FiDollarSign, FiHeart, FiBook,
    FiAward, FiAlertCircle, FiChevronRight, FiChevronLeft,
    FiLogOut, FiSettings
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

const MotionBox = motion.create(Box)

const navItems = [
    { path: '/', labelKey: 'nav.dashboard', icon: FiHome },
    { path: '/circles', labelKey: 'nav.circles', icon: FiUsers },
    { path: '/loans', labelKey: 'nav.loans', icon: FiDollarSign },
    { path: '/vouch', labelKey: 'nav.vouch', icon: FiHeart },
    { path: '/wallet', labelKey: 'nav.wallet', icon: FiDollarSign },
    { path: '/diary', labelKey: 'nav.diary', icon: FiBook },
    { path: '/achievements', labelKey: 'nav.achievements', icon: FiAward },
    { path: '/emergency', labelKey: 'nav.emergency', icon: FiAlertCircle, highlight: true },
]

export default function Sidebar() {
    const [isExpanded, setIsExpanded] = useState(true)
    const pathname = usePathname()
    const router = useRouter()
    const { t } = useLanguage()
    const { user, trustScore, logout } = useAuth()

    const handleNavigate = (path: string) => {
        router.push(path)
    }

    const score = trustScore?.score ?? user?.trust_score ?? 0

    return (
        <MotionBox
            position="fixed"
            left={0}
            top={0}
            bottom={0}
            w={isExpanded ? '260px' : '70px'}
            bg="white"
            borderRight="1px solid"
            borderColor="gray.100"
            display="flex"
            flexDirection="column"
            zIndex={200}
            style={{ transition: 'width 0.3s ease' }}
            boxShadow="sm"
        >
            {/* Logo */}
            <Flex
                h="70px"
                align="center"
                px={isExpanded ? 5 : 3}
                justify={isExpanded ? 'flex-start' : 'center'}
                borderBottom="1px solid"
                borderColor="gray.100"
            >
                <HStack spacing={3}>
                    <Box
                        w="40px"
                        h="40px"
                        borderRadius="xl"
                        bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="white"
                        fontWeight="800"
                        fontSize="xl"
                        boxShadow="0 4px 12px rgba(16, 185, 129, 0.3)"
                    >
                        K
                    </Box>
                    {isExpanded && (
                        <Text
                            fontSize="xl"
                            fontWeight="800"
                            bgGradient="linear(to-r, teal.700, emerald.600)"
                            bgClip="text"
                        >
                            Kredefy
                        </Text>
                    )}
                </HStack>
            </Flex>

            {/* Navigation Items */}
            <VStack flex={1} py={4} spacing={1} align="stretch" px={2} overflowY="auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.path
                    return (
                        <Tooltip
                            key={item.path}
                            label={t(item.labelKey)}
                            placement="right"
                            isDisabled={isExpanded}
                            hasArrow
                        >
                            <Flex
                                align="center"
                                px={3}
                                py={3}
                                borderRadius="xl"
                                cursor="pointer"
                                bg={isActive ? 'emerald.50' : 'transparent'}
                                color={isActive ? 'emerald.700' : 'gray.600'}
                                _hover={{
                                    bg: isActive ? 'emerald.100' : 'gray.50',
                                    color: isActive ? 'emerald.800' : 'gray.800',
                                }}
                                transition="all 0.2s"
                                onClick={() => handleNavigate(item.path)}
                                justify={isExpanded ? 'flex-start' : 'center'}
                            >
                                <Icon
                                    as={item.icon}
                                    boxSize={5}
                                    color={item.highlight ? 'orange.500' : isActive ? 'emerald.600' : 'gray.500'}
                                />
                                {isExpanded && (
                                    <HStack flex={1} justify="space-between" ml={3}>
                                        <Text
                                            fontWeight={isActive ? '700' : '500'}
                                            fontSize="sm"
                                            color={item.highlight ? 'orange.600' : undefined}
                                        >
                                            {t(item.labelKey)}
                                        </Text>
                                        {item.highlight && (
                                            <Badge colorScheme="orange" borderRadius="full" fontSize="xs">
                                                🚨
                                            </Badge>
                                        )}
                                        {isActive && (
                                            <Box w="6px" h="6px" borderRadius="full" bg="emerald.500" />
                                        )}
                                    </HStack>
                                )}
                            </Flex>
                        </Tooltip>
                    )
                })}
            </VStack>

            <Divider />

            {/* User Profile Section - with real data */}
            <Box p={3}>
                {isExpanded ? (
                    <VStack spacing={3}>
                        {/* Trust Score Bar */}
                        <Box
                            w="full"
                            p={3}
                            borderRadius="xl"
                            bg="linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)"
                            border="1px solid"
                            borderColor="emerald.200"
                        >
                            <HStack justify="space-between" mb={2}>
                                <Text fontSize="xs" color="gray.600" fontWeight="600">{t('dashboard.bharosaMeter')}</Text>
                                <Badge
                                    colorScheme={score >= 60 ? 'green' : score >= 40 ? 'orange' : 'red'}
                                    borderRadius="full"
                                    fontSize="xs"
                                >
                                    {score >= 80 ? t('achievements.labels.excellent') : score >= 60 ? t('achievements.labels.good') : score >= 40 ? t('achievements.labels.building') : t('achievements.labels.starting')}
                                </Badge>
                            </HStack>
                            <Flex align="center" gap={2}>
                                <Box flex={1} h="6px" bg="gray.200" borderRadius="full" overflow="hidden">
                                    <Box
                                        h="full"
                                        w={`${score}%`}
                                        bg="linear-gradient(90deg, #10b981, #34d399)"
                                        borderRadius="full"
                                    />
                                </Box>
                                <Text fontSize="sm" fontWeight="800" color="emerald.700">{score}</Text>
                            </Flex>
                        </Box>

                        {/* User Info */}
                        <HStack
                            w="full"
                            p={3}
                            borderRadius="xl"
                            bg="gray.50"
                            cursor="pointer"
                            _hover={{ bg: 'gray.100' }}
                            onClick={() => router.push('/settings')}
                        >
                            <Avatar
                                size="sm"
                                name={user?.full_name || 'User'}
                                bg="teal.500"
                            />
                            <VStack align="start" spacing={0} flex={1}>
                                <Text fontSize="sm" fontWeight="600" color="gray.800">
                                    {user?.full_name || 'User'}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    {user?.phone?.replace('+91', '') || 'Account'}
                                </Text>
                            </VStack>
                            <Icon as={FiSettings} color="gray.400" boxSize={4} />
                        </HStack>
                    </VStack>
                ) : (
                    <VStack spacing={2}>
                        <Tooltip label={`Trust: ${score}`} placement="right" hasArrow>
                            <Box
                                w="40px"
                                h="40px"
                                borderRadius="full"
                                bg="emerald.100"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Text fontSize="xs" fontWeight="800" color="emerald.700">{score}</Text>
                            </Box>
                        </Tooltip>
                        <Tooltip label={user?.full_name || 'User'} placement="right" hasArrow>
                            <Avatar
                                size="sm"
                                name={user?.full_name || 'User'}
                                bg="teal.500"
                                cursor="pointer"
                                onClick={() => router.push('/settings')}
                            />
                        </Tooltip>
                    </VStack>
                )}
            </Box>

            {/* Collapse Toggle */}
            <Box
                position="absolute"
                right="-12px"
                top="50%"
                transform="translateY(-50%)"
                w="24px"
                h="24px"
                bg="white"
                borderRadius="full"
                border="1px solid"
                borderColor="gray.200"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onClick={() => setIsExpanded(!isExpanded)}
                _hover={{ bg: 'gray.50' }}
                boxShadow="sm"
                zIndex={10}
            >
                <Icon
                    as={isExpanded ? FiChevronLeft : FiChevronRight}
                    boxSize={3}
                    color="gray.500"
                />
            </Box>
        </MotionBox>
    )
}
