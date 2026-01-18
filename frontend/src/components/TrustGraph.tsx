'use client'

import { Box, Text, VStack, HStack, Badge, useColorModeValue } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'

interface TrustNode {
    id: string
    name: string
    trustScore: number
    x: number
    y: number
    connections: string[]
}

interface TrustGraphProps {
    userId?: string
    nodes?: TrustNode[]
}

const MotionBox = motion.create(Box)

// Generate mock trust network data
const generateMockNodes = (centerUserId: string): TrustNode[] => {
    const nodes: TrustNode[] = [
        { id: centerUserId, name: 'You', trustScore: 78, x: 200, y: 150, connections: ['2', '3', '4'] },
        { id: '2', name: 'Lakshmi', trustScore: 85, x: 80, y: 80, connections: [centerUserId, '5'] },
        { id: '3', name: 'Ravi', trustScore: 72, x: 320, y: 80, connections: [centerUserId, '6'] },
        { id: '4', name: 'Priya', trustScore: 91, x: 200, y: 280, connections: [centerUserId, '5', '6'] },
        { id: '5', name: 'Suresh', trustScore: 68, x: 50, y: 200, connections: ['2', '4'] },
        { id: '6', name: 'Meena', trustScore: 88, x: 350, y: 200, connections: ['3', '4'] },
    ]
    return nodes
}

export default function TrustGraph({ userId = '1', nodes }: TrustGraphProps) {
    const [graphNodes, setGraphNodes] = useState<TrustNode[]>([])
    const [selectedNode, setSelectedNode] = useState<string | null>(null)
    const [animatedEdges, setAnimatedEdges] = useState<Set<string>>(new Set())
    const svgRef = useRef<SVGSVGElement>(null)

    useEffect(() => {
        setGraphNodes(nodes || generateMockNodes(userId))

        // Animate edges appearing one by one
        const edges = new Set<string>()
        let delay = 0
        generateMockNodes(userId).forEach(node => {
            node.connections.forEach(conn => {
                const edgeId = [node.id, conn].sort().join('-')
                if (!edges.has(edgeId)) {
                    setTimeout(() => {
                        setAnimatedEdges(prev => new Set([...prev, edgeId]))
                    }, delay * 200)
                    edges.add(edgeId)
                    delay++
                }
            })
        })
    }, [userId, nodes])

    const getNodeColor = (score: number) => {
        if (score >= 80) return '#10b981'
        if (score >= 60) return '#f59e0b'
        return '#ef4444'
    }

    const getEdgeOpacity = (node1: TrustNode, node2: TrustNode) => {
        const avgScore = (node1.trustScore + node2.trustScore) / 2
        return 0.3 + (avgScore / 100) * 0.7
    }

    return (
        <Box
            bg="linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
            borderRadius="2xl"
            p={4}
            position="relative"
            overflow="hidden"
        >
            {/* Header */}
            <HStack justify="space-between" mb={4}>
                <VStack align="start" spacing={0}>
                    <Text fontSize="lg" fontWeight="800" color="white">
                        Trust Graph Network
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                        Real-time trust connections
                    </Text>
                </VStack>
                <Badge colorScheme="green" variant="solid" fontSize="xs">
                    LIVE
                </Badge>
            </HStack>

            {/* SVG Graph */}
            <Box position="relative" h="300px">
                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 320"
                    style={{ overflow: 'visible' }}
                >
                    {/* Animated Background Circles */}
                    <defs>
                        <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </radialGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Connection Lines */}
                    {graphNodes.map(node =>
                        node.connections.map(connId => {
                            const connNode = graphNodes.find(n => n.id === connId)
                            if (!connNode) return null
                            const edgeId = [node.id, connId].sort().join('-')
                            if (!animatedEdges.has(edgeId)) return null

                            return (
                                <motion.line
                                    key={`${node.id}-${connId}`}
                                    x1={node.x}
                                    y1={node.y}
                                    x2={connNode.x}
                                    y2={connNode.y}
                                    stroke={`rgba(16, 185, 129, ${getEdgeOpacity(node, connNode)})`}
                                    strokeWidth="2"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                />
                            )
                        })
                    )}

                    {/* Trust Flow Animation */}
                    {graphNodes.map(node =>
                        node.connections.map(connId => {
                            const connNode = graphNodes.find(n => n.id === connId)
                            if (!connNode) return null
                            const edgeId = [node.id, connId].sort().join('-')
                            if (!animatedEdges.has(edgeId)) return null

                            return (
                                <motion.circle
                                    key={`flow-${node.id}-${connId}`}
                                    r="3"
                                    fill="#10b981"
                                    filter="url(#glow)"
                                    initial={{ cx: node.x, cy: node.y }}
                                    animate={{
                                        cx: [node.x, connNode.x, node.x],
                                        cy: [node.y, connNode.y, node.y]
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "linear",
                                        delay: Math.random() * 2
                                    }}
                                />
                            )
                        })
                    )}

                    {/* Nodes */}
                    {graphNodes.map((node, index) => (
                        <motion.g
                            key={node.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.1, type: "spring" }}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedNode(node.id)}
                        >
                            {/* Glow effect */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.id === userId ? 35 : 28}
                                fill="url(#nodeGlow)"
                                opacity={0.5}
                            />

                            {/* Node circle */}
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={node.id === userId ? 28 : 22}
                                fill={getNodeColor(node.trustScore)}
                                stroke="white"
                                strokeWidth={node.id === selectedNode ? 3 : 1}
                                filter="url(#glow)"
                            />

                            {/* Trust Score */}
                            <text
                                x={node.x}
                                y={node.y + 4}
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                fontWeight="bold"
                            >
                                {node.trustScore}
                            </text>

                            {/* Name */}
                            <text
                                x={node.x}
                                y={node.y + (node.id === userId ? 45 : 38)}
                                textAnchor="middle"
                                fill="#94a3b8"
                                fontSize="10"
                            >
                                {node.name}
                            </text>
                        </motion.g>
                    ))}
                </svg>
            </Box>

            {/* Legend */}
            <HStack justify="center" spacing={4} mt={2}>
                <HStack spacing={1}>
                    <Box w={3} h={3} borderRadius="full" bg="#10b981" />
                    <Text fontSize="xs" color="gray.400">High Trust (80+)</Text>
                </HStack>
                <HStack spacing={1}>
                    <Box w={3} h={3} borderRadius="full" bg="#f59e0b" />
                    <Text fontSize="xs" color="gray.400">Medium (60-79)</Text>
                </HStack>
                <HStack spacing={1}>
                    <Box w={3} h={3} borderRadius="full" bg="#ef4444" />
                    <Text fontSize="xs" color="gray.400">Low (&lt;60)</Text>
                </HStack>
            </HStack>

            {/* Floating particles effect */}
            {[...Array(5)].map((_, i) => (
                <MotionBox
                    key={i}
                    position="absolute"
                    w={2}
                    h={2}
                    borderRadius="full"
                    bg="teal.400"
                    opacity={0.3}
                    initial={{ x: Math.random() * 400, y: Math.random() * 300 }}
                    animate={{
                        x: [Math.random() * 400, Math.random() * 400],
                        y: [Math.random() * 300, Math.random() * 300],
                    }}
                    transition={{
                        duration: 10 + Math.random() * 10,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />
            ))}
        </Box>
    )
}
