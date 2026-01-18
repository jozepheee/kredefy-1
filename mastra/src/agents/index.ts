/**
 * Kredefy Mastra Agents
 * Using @mastra/core for multi-agent orchestration with visible reasoning
 */

import { Mastra, Agent, Step, Workflow } from '@mastra/core';
import { createTool } from '@mastra/core';
import { z } from 'zod';

// ============================================
// TOOLS - Actions agents can take
// ============================================

const analyzeRiskTool = createTool({
    id: 'analyze-risk',
    description: 'Analyze credit risk for a loan request',
    inputSchema: z.object({
        userId: z.string(),
        loanAmount: z.number(),
        trustScore: z.number(),
        completedLoans: z.number(),
        defaultedLoans: z.number(),
        activeVouches: z.number(),
    }),
    execute: async ({ context }) => {
        const { trustScore, completedLoans, defaultedLoans, activeVouches } = context;

        // Calculate risk factors
        const trustFactor = trustScore / 100;
        const historyFactor = completedLoans > 0
            ? completedLoans / (completedLoans + defaultedLoans)
            : 0.5;
        const vouchFactor = Math.min(activeVouches / 5, 1);

        const riskScore = (trustFactor * 0.4 + historyFactor * 0.35 + vouchFactor * 0.25);

        let category: string;
        if (riskScore >= 0.8) category = 'LOW_RISK';
        else if (riskScore >= 0.6) category = 'MODERATE_RISK';
        else if (riskScore >= 0.4) category = 'ELEVATED_RISK';
        else category = 'HIGH_RISK';

        return {
            riskScore: Math.round(riskScore * 100),
            category,
            maxLoan: category === 'LOW_RISK' ? 50000
                : category === 'MODERATE_RISK' ? 25000
                    : category === 'ELEVATED_RISK' ? 10000
                        : 5000,
        };
    },
});

const detectFraudTool = createTool({
    id: 'detect-fraud',
    description: 'Check for fraud patterns',
    inputSchema: z.object({
        recentLoanRequests: z.number(),
        accountAgeDays: z.number(),
        suspiciousPatterns: z.array(z.string()).optional(),
    }),
    execute: async ({ context }) => {
        const { recentLoanRequests, accountAgeDays, suspiciousPatterns = [] } = context;

        let riskLevel = 0;
        const signals: string[] = [];

        // Velocity check
        if (recentLoanRequests > 3) {
            riskLevel += 0.3;
            signals.push('High velocity: ' + recentLoanRequests + ' requests in 24h');
        }

        // New account check
        if (accountAgeDays < 7) {
            riskLevel += 0.2;
            signals.push('New account: ' + accountAgeDays + ' days old');
        }

        // Pattern matching
        if (suspiciousPatterns.length > 0) {
            riskLevel += suspiciousPatterns.length * 0.15;
            signals.push(...suspiciousPatterns);
        }

        return {
            verdict: riskLevel >= 0.8 ? 'BLOCK'
                : riskLevel >= 0.5 ? 'REVIEW'
                    : riskLevel >= 0.3 ? 'WARN'
                        : 'CLEAR',
            riskLevel: Math.round(riskLevel * 100),
            signals,
        };
    },
});

const generateResponseTool = createTool({
    id: 'generate-response',
    description: 'Generate user-friendly response in specified language',
    inputSchema: z.object({
        message: z.string(),
        language: z.enum(['en', 'hi', 'ml']),
        context: z.object({
            userName: z.string().optional(),
            trustScore: z.number().optional(),
        }).optional(),
    }),
    execute: async ({ context }) => {
        // In production, this would call Groq/OpenAI
        return {
            response: `Hey ${context.context?.userName || 'there'}! ${context.message}`,
            language: context.language,
        };
    },
});

// ============================================
// AGENTS - Specialized AI workers
// ============================================

export const novaAgent = new Agent({
    name: 'Nova',
    instructions: `You are Nova, a friendly AI financial assistant for Kredefy.
You help India's underbanked population manage money and get loans.
Speak simply, avoid jargon, be encouraging.
Languages: English, Hindi, Malayalam.`,
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o-mini',
    },
    tools: { generateResponse: generateResponseTool },
});

export const riskOracleAgent = new Agent({
    name: 'RiskOracle',
    instructions: `You are a credit risk assessment oracle.
Analyze user data and provide risk scores for loan decisions.
Your output feeds directly to blockchain smart contracts.
Be precise and show your reasoning.`,
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o-mini',
    },
    tools: { analyzeRisk: analyzeRiskTool },
});

export const fraudGuardAgent = new Agent({
    name: 'FraudGuard',
    instructions: `You are a fraud detection system.
Analyze patterns for velocity abuse, collusion, and Sybil attacks.
Your decisions protect the community from bad actors.
Be vigilant but fair.`,
    model: {
        provider: 'OPEN_AI',
        name: 'gpt-4o-mini',
    },
    tools: { detectFraud: detectFraudTool },
});

// ============================================
// WORKFLOWS - Multi-agent collaboration
// ============================================

const loanRequestWorkflow = new Workflow({
    name: 'loan-request',
    triggerSchema: z.object({
        userId: z.string(),
        loanAmount: z.number(),
        purpose: z.string(),
        userData: z.object({
            trustScore: z.number(),
            completedLoans: z.number(),
            defaultedLoans: z.number(),
            activeVouches: z.number(),
            recentRequests: z.number(),
            accountAgeDays: z.number(),
        }),
    }),
});

// Step 1: Fraud Check
loanRequestWorkflow.step(fraudGuardAgent.createStep({
    id: 'fraud-check',
    description: 'Check for fraud patterns before processing loan',
    inputSchema: z.object({
        recentLoanRequests: z.number(),
        accountAgeDays: z.number(),
    }),
}));

// Step 2: Risk Assessment (only if fraud check passes)
loanRequestWorkflow.step(riskOracleAgent.createStep({
    id: 'risk-assessment',
    description: 'Assess credit risk and determine loan eligibility',
    inputSchema: z.object({
        userId: z.string(),
        loanAmount: z.number(),
        trustScore: z.number(),
        completedLoans: z.number(),
        defaultedLoans: z.number(),
        activeVouches: z.number(),
    }),
})).after('fraud-check');

// Step 3: Generate Response
loanRequestWorkflow.step(novaAgent.createStep({
    id: 'generate-response',
    description: 'Generate user-friendly response based on assessment',
})).after('risk-assessment');

loanRequestWorkflow.commit();

// ============================================
// MASTRA INSTANCE
// ============================================

export const mastra = new Mastra({
    agents: {
        nova: novaAgent,
        riskOracle: riskOracleAgent,
        fraudGuard: fraudGuardAgent,
    },
    workflows: {
        loanRequest: loanRequestWorkflow,
    },
});

export default mastra;
