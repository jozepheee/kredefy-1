'use client'

import { useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, FormControl, FormLabel, Input, Select,
    Switch, useToast, Avatar, Divider, Badge, Alert, AlertIcon
} from '@chakra-ui/react'
import { FiSave, FiLogOut, FiUser, FiGlobe, FiBell, FiLock } from 'react-icons/fi'
import AppLayout from '@/components/AppLayout'
import { authAPI } from '@/lib/api'
import { useMutation } from '@/hooks/useAPI'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

export default function SettingsPage() {
    const { user, logout, refreshUser } = useAuth()
    const { t } = useLanguage()
    const [fullName, setFullName] = useState(user?.full_name || '')
    const [language, setLanguage] = useState(user?.language || 'en')
    const [notifications, setNotifications] = useState(true)
    const toast = useToast()

    // Update profile mutation
    const updateMutation = useMutation(
        (data: { full_name?: string; language?: string }) => authAPI.updateProfile(data),
        {
            onSuccess: () => {
                toast({
                    title: t('settings.updateSuccess'),
                    status: 'success',
                    duration: 3000,
                })
                refreshUser()
            },
            onError: (error) => {
                toast({
                    title: t('settings.updateFailed'),
                    description: error.message,
                    status: 'error',
                    duration: 4000,
                })
            },
        }
    )

    const handleSave = () => {
        updateMutation.mutate({ full_name: fullName, language })
    }

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <VStack align="start" spacing={2} mb={6}>
                    <Heading size="lg" color="gray.800">{t('settings.title')}</Heading>
                    <Text color="gray.500">{t('settings.subtitle')}</Text>
                </VStack>

                <VStack spacing={6} align="stretch" maxW="600px">
                    {/* Profile Card */}
                    <Card borderRadius="2xl" bg="white" boxShadow="sm">
                        <CardBody p={6}>
                            <HStack spacing={4} mb={6}>
                                <Box p={2} bg="teal.100" borderRadius="lg" color="teal.600">
                                    <FiUser size={20} />
                                </Box>
                                <Text fontWeight="700" color="gray.800">{t('settings.profile.title')}</Text>
                            </HStack>

                            <VStack spacing={4} align="stretch">
                                <HStack spacing={4}>
                                    <Avatar
                                        size="xl"
                                        name={user?.full_name || 'User'}
                                        bg="teal.500"
                                    />
                                    <VStack align="start" spacing={1}>
                                        <Text fontWeight="600" color="gray.800">
                                            {user?.full_name || 'User'}
                                        </Text>
                                        <Text fontSize="sm" color="gray.500">
                                            {user?.phone}
                                        </Text>
                                        <Badge colorScheme="teal" borderRadius="full">
                                            {t('settings.profile.trustScore')}: {user?.trust_score ?? 0}
                                        </Badge>
                                    </VStack>
                                </HStack>

                                <Divider />

                                <FormControl>
                                    <FormLabel fontWeight="600">Full Name</FormLabel>
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        borderRadius="xl"
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontWeight="600">{t('settings.profile.phone')}</FormLabel>
                                    <Input
                                        value={user?.phone || ''}
                                        isReadOnly
                                        borderRadius="xl"
                                        bg="gray.50"
                                    />
                                    <Text fontSize="xs" color="gray.500" mt={1}>
                                        {t('settings.profile.phoneNote')}
                                    </Text>
                                </FormControl>

                                {user?.wallet_address && (
                                    <FormControl>
                                        <FormLabel fontWeight="600">{t('settings.profile.wallet')}</FormLabel>
                                        <Input
                                            value={user.wallet_address}
                                            isReadOnly
                                            borderRadius="xl"
                                            bg="gray.50"
                                            fontSize="xs"
                                        />
                                    </FormControl>
                                )}
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Language Card */}
                    <Card borderRadius="2xl" bg="white" boxShadow="sm">
                        <CardBody p={6}>
                            <HStack spacing={4} mb={6}>
                                <Box p={2} bg="blue.100" borderRadius="lg" color="blue.600">
                                    <FiGlobe size={20} />
                                </Box>
                                <Text fontWeight="700" color="gray.800">{t('settings.language.title')}</Text>
                            </HStack>

                            <FormControl>
                                <FormLabel fontWeight="600">{t('settings.language.label')}</FormLabel>
                                <Select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    borderRadius="xl"
                                >
                                    <option value="en">🇬🇧 English</option>
                                    <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                                    <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
                                    <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
                                </Select>
                                <Text fontSize="xs" color="gray.500" mt={1}>
                                    {t('settings.language.note')}
                                </Text>
                            </FormControl>
                        </CardBody>
                    </Card>

                    {/* Notifications Card */}
                    <Card borderRadius="2xl" bg="white" boxShadow="sm">
                        <CardBody p={6}>
                            <HStack spacing={4} mb={6}>
                                <Box p={2} bg="purple.100" borderRadius="lg" color="purple.600">
                                    <FiBell size={20} />
                                </Box>
                                <Text fontWeight="700" color="gray.800">{t('settings.notifications.title')}</Text>
                            </HStack>

                            <VStack spacing={4} align="stretch">
                                <HStack justify="space-between">
                                    <VStack align="start" spacing={0}>
                                        <Text fontWeight="600">{t('settings.notifications.whatsapp.title')}</Text>
                                        <Text fontSize="sm" color="gray.500">{t('settings.notifications.whatsapp.desc')}</Text>
                                    </VStack>
                                    <Switch
                                        colorScheme="teal"
                                        isChecked={notifications}
                                        onChange={(e) => setNotifications(e.target.checked)}
                                    />
                                </HStack>

                                <HStack justify="space-between">
                                    <VStack align="start" spacing={0}>
                                        <Text fontWeight="600">{t('settings.notifications.emi.title')}</Text>
                                        <Text fontSize="sm" color="gray.500">{t('settings.notifications.emi.desc')}</Text>
                                    </VStack>
                                    <Switch colorScheme="teal" defaultChecked />
                                </HStack>

                                <HStack justify="space-between">
                                    <VStack align="start" spacing={0}>
                                        <Text fontWeight="600">{t('settings.notifications.circle.title')}</Text>
                                        <Text fontSize="sm" color="gray.500">{t('settings.notifications.circle.desc')}</Text>
                                    </VStack>
                                    <Switch colorScheme="teal" defaultChecked />
                                </HStack>
                            </VStack>
                        </CardBody>
                    </Card>

                    {/* Security Card */}
                    <Card borderRadius="2xl" bg="white" boxShadow="sm">
                        <CardBody p={6}>
                            <HStack spacing={4} mb={6}>
                                <Box p={2} bg="orange.100" borderRadius="lg" color="orange.600">
                                    <FiLock size={20} />
                                </Box>
                                <Text fontWeight="700" color="gray.800">{t('settings.security.title')}</Text>
                            </HStack>

                            <Alert status="info" borderRadius="xl" mb={4}>
                                <AlertIcon />
                                <VStack align="start" spacing={0}>
                                    <Text fontWeight="600" fontSize="sm">{t('settings.security.status')}</Text>
                                    <Text fontSize="xs">{t('settings.security.method')}</Text>
                                </VStack>
                            </Alert>

                            <Button
                                w="full"
                                colorScheme="red"
                                variant="outline"
                                borderRadius="xl"
                                leftIcon={<FiLogOut />}
                                onClick={logout}
                            >
                                {t('settings.security.logout')}
                            </Button>
                        </CardBody>
                    </Card>

                    {/* Save Button */}
                    <Button
                        size="lg"
                        bg="linear-gradient(135deg, #0d9488 0%, #10b981 100%)"
                        color="white"
                        borderRadius="xl"
                        leftIcon={<FiSave />}
                        onClick={handleSave}
                        isLoading={updateMutation.isLoading}
                        _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                    >
                        {t('settings.saveChanges')}
                    </Button>
                </VStack>
            </Box>
        </AppLayout>
    )
}
