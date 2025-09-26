-- Add pot_amount column to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS pot_amount INTEGER DEFAULT 0;

-- Update existing leagues to have a pot amount
UPDATE leagues SET pot_amount = 0 WHERE pot_amount IS NULL;
