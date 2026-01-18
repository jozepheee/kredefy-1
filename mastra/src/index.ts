/**
 * Kredefy Mastra Service
 * Express server that exposes Mastra agents via HTTP API
 */

import express from 'express';
import cors from 'cors';
import { mastra, novaAgent, riskOracleAgent, fraudGuardAgent } from './agents/index.js';
import 'dotenv/config';

const app = express();
const PORT = process.env.MASTRA_PORT || 4000;

app.use(cors());
app.use(express.json());

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'kredefy-mastra',
        agents: ['nova', 'riskOracle', 'fraudGuard'],
        version: '1.0.0',
    });
});

// ============================================
// Nova Agent - Chat
// ============================================

app.post('/agents/nova/chat', async (req, res) => {
    try {
        const { message, language = 'en', userId, context = {} } = req.body;

        const result = await novaAgent.generate(
            `User message (language: ${language}): "${message}"
      
User context:
- User ID: ${userId}
- Trust Score: ${context.trustScore || 'unknown'}
- Language: ${language}

Generate a helpful, empathetic response in ${language === 'hi' ? 'Hindi' : language === 'ml' ? 'Malayalam' : 'English'}.
Keep it short (2-3 sentences).`,
            { output: 'text' }
        );

        res.json({
            success: true,
            response: result.text,
            agentName: 'Nova',
            reasoning: result.toolCalls?.map(tc => ({
                tool: tc.toolName,
                input: tc.toolCallId,
                output: tc.result,
            })) || [],
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Risk Oracle Agent - Risk Assessment
// ============================================

app.post('/agents/risk-oracle/assess', async (req, res) => {
    try {
        const { userId, loanAmount, userData } = req.body;

        const result = await riskOracleAgent.generate(
            `Assess credit risk for loan request:
      
Loan Details:
- User ID: ${userId}
- Amount Requested: ₹${loanAmount}

User Data:
- Trust Score: ${userData.trustScore}/100
- Completed Loans: ${userData.completedLoans}
- Defaulted Loans: ${userData.defaultedLoans}
- Active Vouches: ${userData.activeVouches}

Use the analyzeRisk tool to calculate risk score and category.
Explain your reasoning step by step.`,
            { output: 'text' }
        );

        res.json({
            success: true,
            assessment: result.text,
            agentName: 'RiskOracle',
            toolResults: result.toolCalls?.map(tc => ({
                tool: tc.toolName,
                result: tc.result,
            })) || [],
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Fraud Guard Agent - Fraud Detection
// ============================================

app.post('/agents/fraud-guard/check', async (req, res) => {
    try {
        const { userData, patterns = [] } = req.body;

        const result = await fraudGuardAgent.generate(
            `Check for fraud patterns:

User Activity:
- Recent Loan Requests (24h): ${userData.recentRequests}
- Account Age: ${userData.accountAgeDays} days
- Suspicious Patterns Detected: ${patterns.join(', ') || 'none'}

Use the detectFraud tool to analyze risk.
Explain any red flags you find.`,
            { output: 'text' }
        );

        res.json({
            success: true,
            analysis: result.text,
            agentName: 'FraudGuard',
            toolResults: result.toolCalls?.map(tc => ({
                tool: tc.toolName,
                result: tc.result,
            })) || [],
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Workflow - Full Loan Request Pipeline
// ============================================

app.post('/workflows/loan-request', async (req, res) => {
    try {
        const { userId, loanAmount, purpose, userData } = req.body;

        // Execute the full loan request workflow
        const workflow = mastra.getWorkflow('loanRequest');

        if (!workflow) {
            throw new Error('Loan request workflow not found');
        }

        const run = workflow.createRun();

        const result = await run.start({
            triggerData: {
                userId,
                loanAmount,
                purpose,
                userData,
            },
        });

        res.json({
            success: true,
            workflowId: 'loan-request',
            result,
            steps: [
                { step: 'fraud-check', agent: 'FraudGuard' },
                { step: 'risk-assessment', agent: 'RiskOracle' },
                { step: 'generate-response', agent: 'Nova' },
            ],
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Get All Reasoning Traces
// ============================================

app.get('/traces', async (req, res) => {
    // In production, would fetch from Mastra's trace storage
    res.json({
        traces: [],
        message: 'Connect to Mastra trace storage for full history',
    });
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Kredefy Mastra Service running on port ${PORT}`);
    console.log(`📊 Agents available: Nova, RiskOracle, FraudGuard`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
