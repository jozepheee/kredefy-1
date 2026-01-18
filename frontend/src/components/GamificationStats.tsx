import { Box, HStack, VStack, Text, Icon, Tooltip, Badge, Progress } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FaFire, FaMedal, FaRocket, FaAnchor, FaPhoenixFramework, FaStar } from 'react-icons/fa'

interface GamificationStatsProps {
    streak: number
    badges: string[]
    xp: number
    level: string
}

const MotionBox = motion.create(Box)

export default function GamificationStats({ streak, badges, xp, level }: GamificationStatsProps) {

    const getBadgeIcon = (id: string) => {
        switch (id) {
            case 'the_anchor': return FaAnchor
            case 'comeback_kid': return FaPhoenixFramework
            case 'early_believer': return FaRocket
            default: return FaMedal
        }
    }

    const getBadgeName = (id: string) => {
        switch (id) {
            case 'the_anchor': return "The Anchor"
            case 'comeback_kid': return "Comeback Kid"
            case 'early_believer': return "Early Believer"
            default: return "Badge"
        }
    }

    const getBadgeColor = (id: string) => {
        switch (id) {
            case 'the_anchor': return "blue.400"
            case 'comeback_kid': return "orange.400"
            case 'early_believer': return "purple.400"
            default: return "gray.400"
        }
    }

    return (
        <Box bg="white" borderRadius="xl" p={4} boxShadow="sm" border="1px solid" borderColor="gray.100">
            <VStack spacing={4} align="stretch">

                {/* Header with Streak */}
                <HStack justify="space-between">
                    <Text fontWeight="bold" fontSize="md" color="gray.700">Your Achievements</Text>
                    <Tooltip label="Daily Bharosa Streak">
                        <HStack bg="orange.50" px={3} py={1} borderRadius="full">
                            <Icon as={FaFire} color="orange.500" />
                            <Text fontWeight="bold" color="orange.600">{streak} Day Streak</Text>
                        </HStack>
                    </Tooltip>
                </HStack>

                {/* Level / XP */}
                <Box>
                    <HStack justify="space-between" mb={1}>
                        <Text fontSize="xs" fontWeight="600" color="gray.500">Level: {level}</Text>
                        <Text fontSize="xs" fontWeight="600" color="teal.500">{xp} XP</Text>
                    </HStack>
                    <Progress value={(xp % 1000) / 10} size="xs" colorScheme="teal" borderRadius="full" />
                </Box>

                {/* Badges Layout */}
                <HStack spacing={2} wrap="wrap">
                    {badges.length === 0 ? (
                        <Text fontSize="xs" color="gray.400" fontStyle="italic">No badges yet. Start paying back loans!</Text>
                    ) : (
                        badges.map((badge, i) => (
                            <Tooltip key={i} label={getBadgeName(badge)}>
                                <MotionBox
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    p={2}
                                    bg={`${getBadgeColor(badge)}15`} // 15 = low opacity hex
                                    borderRadius="lg"
                                    color={getBadgeColor(badge)}
                                >
                                    <Icon as={getBadgeIcon(badge)} boxSize={5} />
                                </MotionBox>
                            </Tooltip>
                        ))
                    )}
                </HStack>

            </VStack>
        </Box>
    )
}
