'use client'

import { Box, HStack, Text, Icon, Link, Badge, Tooltip } from '@chakra-ui/react'
import { FaExternalLinkAlt, FaCube, FaCheckCircle, FaSpinner } from 'react-icons/fa'

interface BlockchainLinkProps {
    txHash: string
    label?: string
    status?: 'pending' | 'confirmed' | 'failed'
    chainId?: number
}

export default function BlockchainLink({ txHash, label, status = 'confirmed', chainId = 80002 }: BlockchainLinkProps) {
    if (!txHash) return null

    // Determine explorer URL based on chain
    const getExplorerUrl = () => {
        if (chainId === 80002) {
            return `https://amoy.polygonscan.com/tx/${txHash}`
        } else if (chainId === 137) {
            return `https://polygonscan.com/tx/${txHash}`
        }
        return `https://polygonscan.com/tx/${txHash}`
    }

    const statusColors = {
        pending: 'yellow',
        confirmed: 'green',
        failed: 'red',
    }

    const statusIcons = {
        pending: FaSpinner,
        confirmed: FaCheckCircle,
        failed: FaCheckCircle,
    }

    return (
        <Box
            p={2}
            bg="blue.50"
            borderRadius="lg"
            border="1px solid"
            borderColor="blue.100"
            mt={2}
        >
            <HStack justify="space-between">
                <HStack spacing={2}>
                    <Icon as={FaCube} color="blue.500" />
                    <Text fontSize="xs" color="gray.600">
                        {label || 'Blockchain Transaction'}
                    </Text>
                    <Tooltip label={status === 'pending' ? 'Transaction pending...' : 'Transaction confirmed'}>
                        <Badge colorScheme={statusColors[status]} fontSize="xx-small">
                            <HStack spacing={1}>
                                <Icon as={statusIcons[status]} />
                                <Text>{status}</Text>
                            </HStack>
                        </Badge>
                    </Tooltip>
                </HStack>
                <Link
                    href={getExplorerUrl()}
                    isExternal
                    color="blue.600"
                    fontSize="xs"
                    fontWeight="500"
                    _hover={{ textDecor: 'underline' }}
                >
                    <HStack spacing={1}>
                        <Text>{txHash.slice(0, 8)}...{txHash.slice(-6)}</Text>
                        <Icon as={FaExternalLinkAlt} boxSize={3} />
                    </HStack>
                </Link>
            </HStack>
        </Box>
    )
}
