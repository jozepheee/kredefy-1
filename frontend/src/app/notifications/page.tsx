'use client'

import { useEffect, useState } from 'react'
import {
    Box, Heading, Text, VStack, HStack, Card, CardBody,
    Button, Badge, Avatar, Skeleton, Alert, AlertIcon,
    Icon, Divider, useToast
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiBell, FiCheck, FiDollarSign, FiUsers, FiHeart, FiShield } from 'react-icons/fi'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { authAPI } from '@/lib/api'
import { useAPI, useMutation } from '@/hooks/useAPI'

const MotionCard = motion.create(Card)

interface Notification {
    id: string
    type: 'loan_request' | 'vote_needed' | 'payment_due' | 'vouch_received' | 'loan_approved' | 'circle_invite' | 'achievement'
    title: string
    message: string
    read: boolean
    action_url?: string
    created_at: string
}

export default function NotificationsPage() {
    const toast = useToast()

    // Fetch notifications
    const {
        data: notifications,
        isLoading,
        error,
        execute: fetchNotifications
    } = useAPI<Notification[]>(authAPI.getNotifications)

    // Mark as read mutation
    const markReadMutation = useMutation(
        (notificationId: string) => authAPI.markNotificationRead(notificationId),
        {
            onSuccess: () => {
                fetchNotifications()
            },
        }
    )

    // Mark all as read
    const markAllReadMutation = useMutation(
        () => authAPI.markAllNotificationsRead(),
        {
            onSuccess: () => {
                toast({ title: 'All marked as read', status: 'success', duration: 2000 })
                fetchNotifications()
            },
        }
    )

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'loan_request':
            case 'loan_approved': return { icon: FiDollarSign, color: 'blue', bg: 'blue.100' }
            case 'vote_needed': return { icon: FiUsers, color: 'purple', bg: 'purple.100' }
            case 'payment_due': return { icon: FiDollarSign, color: 'orange', bg: 'orange.100' }
            case 'vouch_received': return { icon: FiHeart, color: 'pink', bg: 'pink.100' }
            case 'circle_invite': return { icon: FiUsers, color: 'teal', bg: 'teal.100' }
            case 'achievement': return { icon: FiShield, color: 'yellow', bg: 'yellow.100' }
            default: return { icon: FiBell, color: 'gray', bg: 'gray.100' }
        }
    }

    const getEmoji = (type: string) => {
        switch (type) {
            case 'loan_request': return '💰'
            case 'loan_approved': return '✅'
            case 'vote_needed': return '🗳️'
            case 'payment_due': return '⏰'
            case 'vouch_received': return '💚'
            case 'circle_invite': return '👥'
            case 'achievement': return '🏆'
            default: return '🔔'
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()

        if (diff < 60000) return 'Just now'
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    }

    const unreadCount = notifications?.filter(n => !n.read).length || 0

    return (
        <AppLayout>
            <Box minH="100vh" pb={16}>
                {/* Header */}
                <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
                    <VStack align="start" spacing={1}>
                        <HStack>
                            <Heading size="lg" color="gray.800">Notifications</Heading>
                            {unreadCount > 0 && (
                                <Badge colorScheme="red" borderRadius="full" px={2}>
                                    {unreadCount}
                                </Badge>
                            )}
                        </HStack>
                        <Text color="gray.500">Stay updated on your activity</Text>
                    </VStack>

                    {unreadCount > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            colorScheme="teal"
                            borderRadius="xl"
                            leftIcon={<FiCheck />}
                            onClick={() => markAllReadMutation.mutate(undefined)}
                            isLoading={markAllReadMutation.isLoading}
                        >
                            Mark All Read
                        </Button>
                    )}
                </HStack>

                {error && (
                    <Alert status="error" borderRadius="xl" mb={6}>
                        <AlertIcon />
                        Failed to load notifications.
                    </Alert>
                )}

                {isLoading ? (
                    <VStack spacing={3}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} height="80px" borderRadius="xl" w="100%" />
                        ))}
                    </VStack>
                ) : notifications && notifications.length > 0 ? (
                    <VStack spacing={3} align="stretch">
                        {notifications.map((notification, index) => {
                            const iconConfig = getNotificationIcon(notification.type)

                            return (
                                <MotionCard
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    borderRadius="2xl"
                                    bg={notification.read ? 'white' : 'teal.50'}
                                    border={notification.read ? '1px solid' : '2px solid'}
                                    borderColor={notification.read ? 'gray.100' : 'teal.200'}
                                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
                                    cursor="pointer"
                                    onClick={() => {
                                        if (!notification.read) {
                                            markReadMutation.mutate(notification.id)
                                        }
                                    }}
                                >
                                    <CardBody py={4} px={5}>
                                        <HStack spacing={4}>
                                            {/* Icon */}
                                            <Box
                                                p={3}
                                                borderRadius="xl"
                                                bg={iconConfig.bg}
                                                color={`${iconConfig.color}.600`}
                                            >
                                                <Text fontSize="2xl">{getEmoji(notification.type)}</Text>
                                            </Box>

                                            {/* Content */}
                                            <VStack align="start" spacing={1} flex={1}>
                                                <HStack justify="space-between" w="full">
                                                    <Text fontWeight="700" color="gray.800">
                                                        {notification.title}
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.500">
                                                        {formatTime(notification.created_at)}
                                                    </Text>
                                                </HStack>
                                                <Text color="gray.600" fontSize="sm">
                                                    {notification.message}
                                                </Text>
                                            </VStack>

                                            {/* Unread indicator */}
                                            {!notification.read && (
                                                <Box w={3} h={3} borderRadius="full" bg="teal.500" />
                                            )}
                                        </HStack>

                                        {/* Action button if applicable */}
                                        {notification.action_url && (
                                            <Box mt={3} pl={16}>
                                                <Link href={notification.action_url}>
                                                    <Button
                                                        size="sm"
                                                        colorScheme="teal"
                                                        borderRadius="xl"
                                                        variant="outline"
                                                    >
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </Box>
                                        )}
                                    </CardBody>
                                </MotionCard>
                            )
                        })}
                    </VStack>
                ) : (
                    <Card borderRadius="2xl" bg="white">
                        <CardBody py={12}>
                            <VStack spacing={4}>
                                <Text fontSize="4xl">🔔</Text>
                                <Heading size="md" color="gray.700">No notifications yet</Heading>
                                <Text color="gray.500" textAlign="center">
                                    You'll see updates about your loans, vouches, and circles here
                                </Text>
                            </VStack>
                        </CardBody>
                    </Card>
                )}
            </Box>
        </AppLayout>
    )
}
