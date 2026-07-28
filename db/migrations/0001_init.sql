-- Migracion inicial JOHNX DJ
-- Ejecutada en Neon via MCP. Este archivo es la referencia canonica del esquema.

CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS site_sections (
  id TEXT PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  content TEXT,
  image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  extra JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_minor INTEGER,
  price_note TEXT,
  button_text TEXT,
  button_link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE,
  event_time TEXT,
  venue TEXT,
  city TEXT,
  description TEXT,
  image_url TEXT,
  tickets_link TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  blob_url TEXT NOT NULL,
  blob_pathname TEXT,
  title TEXT,
  description TEXT,
  alt_text TEXT,
  category TEXT NOT NULL DEFAULT 'Otros',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  job_date DATE,
  client_name TEXT NOT NULL,
  company TEXT,
  venue TEXT,
  address TEXT,
  concept TEXT,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  amount_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  paid_minor INTEGER NOT NULL DEFAULT 0,
  job_status TEXT NOT NULL DEFAULT 'Pendiente',
  payment_status TEXT NOT NULL DEFAULT 'No facturado',
  invoice_id INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Borrador',
  issue_date DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  client_name TEXT,
  client_tax_id TEXT,
  client_address TEXT,
  client_postal_code TEXT,
  client_city TEXT,
  client_province TEXT,
  client_country TEXT,
  client_email TEXT,
  client_phone TEXT,
  discount_type TEXT,
  discount_value_minor INTEGER NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  vat_enabled BOOLEAN NOT NULL DEFAULT true,
  vat_percent NUMERIC NOT NULL DEFAULT 21,
  irpf_enabled BOOLEAN NOT NULL DEFAULT false,
  irpf_percent NUMERIC NOT NULL DEFAULT 15,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  base_minor INTEGER NOT NULL DEFAULT 0,
  vat_minor INTEGER NOT NULL DEFAULT 0,
  irpf_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_holder TEXT,
  payment_iban TEXT,
  payment_bic TEXT,
  payment_reference TEXT,
  payment_terms TEXT,
  client_notes TEXT,
  internal_notes TEXT,
  job_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_date DATE,
  concept TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_gallery_pub_order ON gallery_images (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id, sort_order);
