# Kredefy

Trust-based P2P lending platform for India's 400M underbanked population.

## Tech Stack

- **Backend**: FastAPI + Supabase + Docker
- **Blockchain**: Polygon (Amoy/Mainnet) - Solidity smart contracts
- **Payments**: Dodo Payments (real UPI integration)
- **AI**: Groq LLM + ElevenLabs TTS
- **Messaging**: Twilio WhatsApp

## Quick Start

### 1. Setup Environment

```bash
cp .env.example .env
# Fill in all API keys
```

### 2. Run with Docker

```bash
docker-compose up --build
```

### 3. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure

```
kredefy/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API routers
│   │   ├── models/          # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── main.py          # FastAPI app
│   └── contracts/           # Solidity smart contracts
├── frontend/                # Next.js app
├── mastra/                  # AI agents
└── docker-compose.yml
```

## Smart Contracts

| Contract | Purpose |
|----------|---------|
| SaathiToken | ERC-20 + Staking for vouching |
| TrustScore | Soulbound NFT (ERC-5192) |
| LoanRegistry | Immutable loan records |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /api/v1/auth/register | Phone+OTP registration |
| POST /api/v1/circles | Create trust circle |
| POST /api/v1/vouches | Stake SAATHI to vouch |
| POST /api/v1/loans | Request loan |
| POST /api/v1/payments/webhook | Dodo payment webhook |
| POST /api/v1/emergency/request | Turant Paisa |
| POST /api/v1/nova/chat | Nova AI assistant |

## Environment Variables

See `.env.example` for all required variables:

- Supabase credentials
- Dodo Payments API key
- Twilio credentials
- Groq API key
- Polygon RPC URL

## License

MIT
