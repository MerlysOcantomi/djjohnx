ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS issuer_artist_name TEXT,
  ADD COLUMN IF NOT EXISTS issuer_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS issuer_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS issuer_address TEXT,
  ADD COLUMN IF NOT EXISTS issuer_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS issuer_city TEXT,
  ADD COLUMN IF NOT EXISTS issuer_province TEXT,
  ADD COLUMN IF NOT EXISTS issuer_country TEXT,
  ADD COLUMN IF NOT EXISTS issuer_phone TEXT,
  ADD COLUMN IF NOT EXISTS issuer_email TEXT;
