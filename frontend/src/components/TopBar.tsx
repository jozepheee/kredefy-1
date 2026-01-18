'use client'

import { useEffect } from 'react'
import {
    Box, Flex, HStack, VStack, Text, Icon, IconButton, Avatar,
    Menu, MenuButton, MenuList, MenuItem, Badge, Tooltip, Spinner, Button
} from '@chakra-ui/react'
import { usePathname, useRouter } from 'next/navigation'
import { FiBell, FiGlobe, FiHelpCircle, FiSettings, FiLogOut, FiRefreshCw } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { useLanguage, languageOptions } from '@/context/LanguageContext'

export default function TopBar() {
    const pathname = usePathname()
    const router = useRouter()
    const { user, saathiBalance, isLoading, logout, refreshUser, refreshSaathiBalance } = useAuth()
    const { language, setLanguage, t } = useLanguage()

    const getPageDetails = () => {
        switch (pathname) {
            case '/': return { title: t('nav.dashboard'), subtitle: t('dashboard.trustMessage') }
            case '/circles': return { title: t('nav.circles'), subtitle: t('circles.subtitle') }
            case '/loans': return { title: t('nav.loans'), subtitle: t('loans.subtitle') }
            case '/loans/apply': return { title: t('loans.apply'), subtitle: t('loans.subtitle') }
            case '/vouch': return { title: t('nav.vouch'), subtitle: t('vouch.subtitle') }
            case '/diary': return { title: t('nav.diary'), subtitle: t('diary.subtitle') }
            case '/emergency': return { title: t('nav.emergency'), subtitle: t('emergency.subtitle') }
            case '/achievements': return { title: t('nav.achievements'), subtitle: t('achievements.subtitle') }
            case '/settings': return { title: t('nav.settings'), subtitle: t('settings.subtitle') }
            case '/profile': return { title: t('nav.profile'), subtitle: t('settings.profile.title') }
            default: return { title: 'Kredefy', subtitle: '' }
        }
    }

    const { title, subtitle } = getPageDetails()

    const handleRefresh = async () => {
        await Promise.all([
            refreshUser(),
            refreshSaathiBalance(),
        ])
    }

    return (
        <Box
            position="fixed"
            top={0}
            right={0}
            left={{ base: 0, md: '70px', lg: '260px' }}
            h="70px"
            bg="white"
            borderBottom="1px solid"
            borderColor="gray.100"
            zIndex={100}
            px={6}
            transition="left 0.3s ease"
        >
            <Flex h="full" align="center" justify="space-between">
                {/* Page Title */}
                <VStack align="start" spacing={0}>
                    <Text fontSize="xl" fontWeight="800" color="gray.800">
                        {title}
                    </Text>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                        {subtitle}
                    </Text>
                </VStack>

                {/* Right Side Controls */}
                <HStack spacing={3}>
                    {/* SAATHI Token Balance */}
                    <HStack
                        bg="linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
                        px={4}
                        py={2}
                        borderRadius="full"
                        spacing={2}
                        cursor="pointer"
                        _hover={{ transform: 'scale(1.02)' }}
                        transition="all 0.2s"
                        onClick={() => router.push('/achievements')}
                    >
                        <Text fontSize="lg">🪙</Text>
                        {isLoading ? (
                            <Spinner size="xs" color="orange.600" />
                        ) : (
                            <Text fontWeight="800" color="orange.700">
                                {saathiBalance?.available ?? user?.saathi_balance ?? 0}
                            </Text>
                        )}
                        <Text fontSize="xs" color="orange.600" fontWeight="600">{t('dashboard.saathiTokens').split(' ')[0]}</Text>
                    </HStack>

                    {/* Refresh Button */}
                    <Tooltip label={t('settings.refresh')} hasArrow>
                        <IconButton
                            aria-label="Refresh"
                            icon={<FiRefreshCw />}
                            variant="ghost"
                            size="sm"
                            borderRadius="full"
                            onClick={handleRefresh}
                            isLoading={isLoading}
                        />
                    </Tooltip>

                    {/* Language Selector */}
                    <Menu>
                        <MenuButton
                            as={IconButton}
                            aria-label="Language"
                            icon={<FiGlobe />}
                            variant="ghost"
                            size="sm"
                            borderRadius="full"
                        />
                        <MenuList borderRadius="xl" boxShadow="lg">
                            {languageOptions.map((opt) => (
                                <MenuItem
                                    key={opt.value}
                                    borderRadius="lg"
                                    onClick={() => setLanguage(opt.value)}
                                    fontWeight={language === opt.value ? '800' : '400'}
                                    color={language === opt.value ? 'blue.600' : 'gray.700'}
                                    bg={language === opt.value ? 'blue.50' : 'transparent'}
                                >
                                    {opt.value === 'en' ? '🇬🇧' : '🇮🇳'} {opt.nativeLabel}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>

                    {/* User Profile Menu */}
                    <Menu>
                        <MenuButton>
                            <HStack
                                spacing={2}
                                p={1}
                                pr={3}
                                borderRadius="full"
                                bg="gray.50"
                                _hover={{ bg: 'gray.100' }}
                                transition="all 0.2s"
                            >
                                <Avatar
                                    size="sm"
                                    name={user?.full_name || 'User'}
                                    bg="teal.500"
                                />
                                <VStack align="start" spacing={0} display={{ base: 'none', md: 'flex' }}>
                                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                                        {user?.full_name || 'User'}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                        {t('settings.profile.trustScore')}: {user?.trust_score ?? 0}
                                    </Text>
                                </VStack>
                            </HStack>
                        </MenuButton>
                        <MenuList borderRadius="xl" boxShadow="lg">
                            <MenuItem
                                borderRadius="lg"
                                icon={<FiSettings />}
                                onClick={() => router.push('/settings')}
                            >
                                {t('nav.settings')}
                            </MenuItem>
                            <MenuItem
                                borderRadius="lg"
                                icon={<FiHelpCircle />}
                            >
                                {t('settings.help')}
                            </MenuItem>
                            <MenuItem
                                borderRadius="lg"
                                icon={<FiLogOut />}
                                color="red.500"
                                onClick={logout}
                            >
                                {t('nav.logout')}
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </HStack>
            </Flex>
        </Box>
    )
}
