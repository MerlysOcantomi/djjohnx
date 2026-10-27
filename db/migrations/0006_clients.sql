-- Fichas reutilizables sin reescribir trabajos ni facturas existentes.
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'person' CHECK (kind IN ('person', 'company')),
  display_name TEXT NOT NULL CHECK (length(btrim(display_name)) > 0),
  legal_name TEXT, contact_name TEXT, tax_id TEXT,
  address TEXT, postal_code TEXT, city TEXT, province TEXT, country TEXT,
  email TEXT, phone TEXT,
  bank_holder TEXT, bank_iban TEXT, bank_bic TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clients_display_name ON clients (lower(display_name));
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tax_id_unique
  ON clients (upper(btrim(tax_id))) WHERE tax_id IS NOT NULL AND btrim(tax_id) <> '';
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id);
