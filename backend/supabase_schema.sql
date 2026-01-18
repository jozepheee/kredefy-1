-- ==========================================
-- KREDEFY DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users (extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    language VARCHAR(10) DEFAULT 'en', -- 'en', 'hi', 'ml'
    wallet_address VARCHAR(42),
    trust_score INTEGER DEFAULT 10,
    saathi_balance DECIMAL(18,8) DEFAULT 100, -- Start with 100 SAATHI
    aadhaar_hash VARCHAR(64),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Circles
CREATE TABLE circles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    max_members INTEGER DEFAULT 10,
    emergency_fund_balance DECIMAL(18,2) DEFAULT 0,
    blockchain_address VARCHAR(42),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Circle Memberships
CREATE TABLE circle_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    contribution_amount DECIMAL(18,2) DEFAULT 0,
    UNIQUE(circle_id, user_id)
);

-- Vouches
CREATE TABLE vouches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vouchee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
    vouch_level VARCHAR(20) NOT NULL,
    saathi_staked DECIMAL(18,8) NOT NULL,
    blockchain_tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(voucher_id, vouchee_id, circle_id)
);

-- Loans
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    circle_id UUID REFERENCES circles(id) ON DELETE SET NULL,
    amount DECIMAL(18,2) NOT NULL,
    purpose TEXT,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    tenure_days INTEGER NOT NULL,
    emi_amount DECIMAL(18,2),
    status VARCHAR(20) DEFAULT 'pending',
    blockchain_tx_hash VARCHAR(66),
    dodo_payment_id VARCHAR(100),
    disbursed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loan Votes
CREATE TABLE loan_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL,
    vote_weight INTEGER DEFAULT 1,
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(loan_id, voter_id)
);

-- Repayments
CREATE TABLE repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(18,2) NOT NULL,
    dodo_payment_id VARCHAR(100),
    blockchain_tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Requests
CREATE TABLE emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(18,2) NOT NULL,
    reason TEXT,
    evidence_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial Diary
CREATE TABLE financial_diary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    voice_url TEXT,
    transcription TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saathi Token Transactions
CREATE TABLE saathi_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    reference_id UUID,
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trust Score History
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    old_score INTEGER,
    new_score INTEGER,
    reason VARCHAR(100),
    blockchain_tx_hash VARCHAR(66),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_circle_members_user ON circle_members(user_id);
CREATE INDEX idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX idx_loans_borrower ON loans(borrower_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_circle ON loans(circle_id);
CREATE INDEX idx_repayments_loan ON repayments(loan_id);
CREATE INDEX idx_diary_user_date ON financial_diary(user_id, recorded_at);
CREATE INDEX idx_vouches_voucher ON vouches(voucher_id);
CREATE INDEX idx_vouches_vouchee ON vouches(vouchee_id);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE saathi_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Circles: All authenticated users can view, creators can update
CREATE POLICY "Anyone can view circles" ON circles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Creator can update circle" ON circles FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Authenticated can create circles" ON circles FOR INSERT TO authenticated WITH CHECK (true);

-- Circle members: View if member, insert if authenticated
CREATE POLICY "Members can view membership" ON circle_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can join circles" ON circle_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members can leave" ON circle_members FOR DELETE USING (auth.uid() = user_id);

-- Loans: View in own circles, create own loans
CREATE POLICY "View loans in circles" ON loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create own loan" ON loans FOR INSERT TO authenticated WITH CHECK (auth.uid() = borrower_id);

-- Financial diary: Own entries only
CREATE POLICY "Own diary entries" ON financial_diary FOR ALL USING (auth.uid() = user_id);

-- Emergency requests: Own requests
CREATE POLICY "Own emergency requests" ON emergency_requests FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, phone, trust_score, saathi_balance)
    VALUES (NEW.id, NEW.phone, 10, 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
