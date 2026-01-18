-- OTP Codes table for persistent OTP storage
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    otp TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by phone
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);

-- Enable RLS but allow service role full access
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "Service role full access" ON otp_codes
    FOR ALL
    USING (true)
    WITH CHECK (true);
