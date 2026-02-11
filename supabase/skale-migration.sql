-- SKALE Chain Migration for Supabase
-- Add SKALE-specific columns to existing tables

-- Update receipts table for SKALE transactions
ALTER TABLE IF EXISTS receipts
ADD COLUMN IF NOT EXISTS chain_id INTEGER DEFAULT 324705682,
ADD COLUMN IF NOT EXISTS facilitator_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS settlement_status TEXT CHECK (settlement_status IN ('pending', 'settled', 'failed'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_receipts_chain_id ON receipts(chain_id);
CREATE INDEX IF NOT EXISTS idx_receipts_settlement_status ON receipts(settlement_status);
CREATE INDEX IF NOT EXISTS idx_receipts_facilitator_tx ON receipts(facilitator_tx_hash);

-- Add comments for documentation
COMMENT ON COLUMN receipts.chain_id IS 'Chain ID where the transaction occurred (324705682 for SKALE Base Sepolia)';
COMMENT ON COLUMN receipts.facilitator_tx_hash IS 'Transaction hash from the x402 facilitator';
COMMENT ON COLUMN receipts.settlement_status IS 'Status of payment settlement: pending, settled, or failed';

-- Optional: Create a view for SKALE-specific receipts
CREATE OR REPLACE VIEW skale_receipts AS
SELECT *
FROM receipts
WHERE chain_id = 324705682;

COMMENT ON VIEW skale_receipts IS 'View of all receipts from SKALE chain';
