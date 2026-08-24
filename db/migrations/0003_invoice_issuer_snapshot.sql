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

CREATE OR REPLACE FUNCTION snapshot_invoice_issuer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  settings_data jsonb;
  profile_data jsonb;
BEGIN
  -- Solo capturamos una vez: cuando la factura entra por primera vez en estado issued.
  IF NEW.status = 'issued'
     AND (OLD.status IS DISTINCT FROM 'issued')
     AND NEW.issuer_legal_name IS NULL
     AND NEW.issuer_artist_name IS NULL THEN
    SELECT data INTO settings_data FROM site_settings WHERE id = 1;
    profile_data := COALESCE(settings_data->'profile', '{}'::jsonb);

    NEW.issuer_artist_name := NULLIF(BTRIM(profile_data->>'artistName'), '');
    NEW.issuer_legal_name := NULLIF(BTRIM(profile_data->>'legalName'), '');
    NEW.issuer_tax_id := NULLIF(BTRIM(profile_data->>'taxId'), '');
    NEW.issuer_address := NULLIF(BTRIM(profile_data->>'address'), '');
    NEW.issuer_postal_code := NULLIF(BTRIM(profile_data->>'postalCode'), '');
    NEW.issuer_city := NULLIF(BTRIM(profile_data->>'city'), '');
    NEW.issuer_province := NULLIF(BTRIM(profile_data->>'province'), '');
    NEW.issuer_country := NULLIF(BTRIM(profile_data->>'country'), '');
    NEW.issuer_phone := NULLIF(BTRIM(profile_data->>'phone'), '');
    NEW.issuer_email := NULLIF(BTRIM(profile_data->>'email'), '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_invoice_issuer ON invoices;
CREATE TRIGGER trg_snapshot_invoice_issuer
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION snapshot_invoice_issuer();

-- Facturas que se crean y emiten en un solo INSERT tambien deben capturar snapshot.
CREATE OR REPLACE FUNCTION snapshot_invoice_issuer_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  settings_data jsonb;
  profile_data jsonb;
BEGIN
  IF NEW.status = 'issued'
     AND NEW.issuer_legal_name IS NULL
     AND NEW.issuer_artist_name IS NULL THEN
    SELECT data INTO settings_data FROM site_settings WHERE id = 1;
    profile_data := COALESCE(settings_data->'profile', '{}'::jsonb);

    NEW.issuer_artist_name := NULLIF(BTRIM(profile_data->>'artistName'), '');
    NEW.issuer_legal_name := NULLIF(BTRIM(profile_data->>'legalName'), '');
    NEW.issuer_tax_id := NULLIF(BTRIM(profile_data->>'taxId'), '');
    NEW.issuer_address := NULLIF(BTRIM(profile_data->>'address'), '');
    NEW.issuer_postal_code := NULLIF(BTRIM(profile_data->>'postalCode'), '');
    NEW.issuer_city := NULLIF(BTRIM(profile_data->>'city'), '');
    NEW.issuer_province := NULLIF(BTRIM(profile_data->>'province'), '');
    NEW.issuer_country := NULLIF(BTRIM(profile_data->>'country'), '');
    NEW.issuer_phone := NULLIF(BTRIM(profile_data->>'phone'), '');
    NEW.issuer_email := NULLIF(BTRIM(profile_data->>'email'), '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_invoice_issuer_insert ON invoices;
CREATE TRIGGER trg_snapshot_invoice_issuer_insert
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION snapshot_invoice_issuer_insert();
