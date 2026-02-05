-- Add claim_amount column to cases table
ALTER TABLE public.cases
ADD COLUMN claim_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.cases.claim_amount IS 'Estimated claim amount or revenue at risk (USD)';
