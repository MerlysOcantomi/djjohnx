-- Migracion 0002 - JOHNX DJ
--
-- Objetivo:
--   1. Unificar los valores de estado a las claves canonicas en ingles.
--   2. Numeracion de facturas atomica y sin duplicados.
--   3. Anadir claves foraneas, indices y restricciones que faltaban.
--
-- Es idempotente: se puede ejecutar varias veces sin efectos adicionales.
-- NO contiene DROP TABLE, DROP SCHEMA, TRUNCATE ni DELETE.
-- Solo actua sobre el esquema public. No toca neon_auth.

BEGIN;

/* ============================================================
   1. Normalizacion de valores heredados
   ------------------------------------------------------------
   El esquema 0001 usaba etiquetas en espanol como valor por defecto
   ('Pendiente', 'No facturado', 'Borrador') y una version anterior de
   las Server Actions escribia un tercer juego ('pendiente', 'cobrado',
   'parcial'). Se convierten todos a las claves canonicas.
   Son UPDATE sobre columnas de estado: no se borra ninguna fila.
   ============================================================ */

UPDATE jobs SET job_status = CASE lower(trim(job_status))
  WHEN 'pendiente'   THEN 'pending'
  WHEN 'confirmado'  THEN 'confirmed'
  WHEN 'realizado'   THEN 'completed'
  WHEN 'completado'  THEN 'completed'
  WHEN 'cancelado'   THEN 'cancelled'
  ELSE lower(trim(job_status))
END
WHERE lower(trim(job_status)) NOT IN ('pending', 'confirmed', 'completed', 'cancelled');

UPDATE jobs SET payment_status = CASE lower(trim(payment_status))
  WHEN 'no facturado'        THEN 'not_invoiced'
  WHEN 'no_facturado'        THEN 'not_invoiced'
  WHEN 'pendiente'           THEN 'pending'
  WHEN 'pendiente de cobrar' THEN 'pending'
  WHEN 'parcial'             THEN 'partially_paid'
  WHEN 'parcialmente pagado' THEN 'partially_paid'
  WHEN 'cobrado'             THEN 'paid'
  WHEN 'pagado'              THEN 'paid'
  ELSE lower(trim(payment_status))
END
WHERE lower(trim(payment_status)) NOT IN ('not_invoiced', 'pending', 'partially_paid', 'paid');

UPDATE invoices SET status = CASE lower(trim(status))
  WHEN 'borrador'  THEN 'draft'
  WHEN 'emitida'   THEN 'issued'
  WHEN 'enviada'   THEN 'sent'
  WHEN 'pagada'    THEN 'paid'
  WHEN 'anulada'   THEN 'cancelled'
  WHEN 'cancelada' THEN 'cancelled'
  ELSE lower(trim(status))
END
WHERE lower(trim(status)) NOT IN ('draft', 'issued', 'sent', 'paid', 'cancelled');

-- Cualquier valor que siga sin ser reconocido pasa a un estado seguro.
UPDATE jobs SET job_status = 'pending'
  WHERE job_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');
UPDATE jobs SET payment_status = 'not_invoiced'
  WHERE payment_status NOT IN ('not_invoiced', 'pending', 'partially_paid', 'paid');
UPDATE invoices SET status = 'draft'
  WHERE status NOT IN ('draft', 'issued', 'sent', 'paid', 'cancelled');

/* ============================================================
   2. Valores por defecto canonicos
   ============================================================ */

ALTER TABLE jobs     ALTER COLUMN job_status     SET DEFAULT 'pending';
ALTER TABLE jobs     ALTER COLUMN payment_status SET DEFAULT 'not_invoiced';
ALTER TABLE invoices ALTER COLUMN status         SET DEFAULT 'draft';

/* ============================================================
   3. Restricciones CHECK sobre los estados
   ============================================================ */

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_job_status_check') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_job_status_check
      CHECK (job_status IN ('pending', 'confirmed', 'completed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_payment_status_check') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_payment_status_check
      CHECK (payment_status IN ('not_invoiced', 'pending', 'partially_paid', 'paid'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
      CHECK (status IN ('draft', 'issued', 'sent', 'paid', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_discount_type_check') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_discount_type_check
      CHECK (discount_type IS NULL OR discount_type IN ('none', 'percent', 'fixed'));
  END IF;
END $$;

/* ============================================================
   4. Claves foraneas entre trabajos y facturas
   ------------------------------------------------------------
   Antes se limpian las referencias huerfanas poniendolas a NULL
   (no se elimina ninguna fila) para que el ALTER pueda validar.
   ============================================================ */

UPDATE jobs SET invoice_id = NULL
  WHERE invoice_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.id = jobs.invoice_id);

UPDATE invoices SET job_id = NULL
  WHERE job_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.id = invoices.job_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_invoice_id_fkey') THEN
    ALTER TABLE jobs ADD CONSTRAINT jobs_invoice_id_fkey
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_job_id_fkey') THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

/* ============================================================
   5. Numeracion de facturas atomica
   ------------------------------------------------------------
   Un contador por prefijo y anio. La asignacion se hace con un unico
   INSERT ... ON CONFLICT DO UPDATE RETURNING, que es atomico, en lugar
   del anterior "leer el maximo y sumar uno" (sujeto a carreras).
   ============================================================ */

CREATE TABLE IF NOT EXISTS invoice_counters (
  prefix      TEXT    NOT NULL,
  year        INTEGER NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (prefix, year)
);

-- Siembra los contadores a partir de las facturas ya numeradas, para no
-- reutilizar numeros existentes. Solo actua sobre numeros con formato
-- PREFIJO-ANIO-NUMERO y nunca reduce un contador ya existente.
INSERT INTO invoice_counters (prefix, year, next_number)
SELECT
  split_part(number, '-', 1) AS prefix,
  split_part(number, '-', 2)::INTEGER AS year,
  MAX(split_part(number, '-', 3)::INTEGER) + 1 AS next_number
FROM invoices
WHERE number ~ '^[A-Za-z0-9]+-[0-9]{4}-[0-9]+$'
GROUP BY 1, 2
ON CONFLICT (prefix, year) DO UPDATE
  SET next_number = GREATEST(invoice_counters.next_number, EXCLUDED.next_number),
      updated_at = now();

-- Los borradores comparten el marcador 'BORRADOR', asi que la unicidad
-- solo se exige a las facturas ya numeradas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number_unique
  ON invoices (number)
  WHERE status <> 'draft';

/* ============================================================
   6. Columnas que faltaban
   ============================================================ */

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

/* ============================================================
   7. Indices de consulta
   ============================================================ */

CREATE INDEX IF NOT EXISTS idx_jobs_date          ON jobs (job_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_jobs_job_status    ON jobs (job_status);
CREATE INDEX IF NOT EXISTS idx_jobs_payment_status ON jobs (payment_status);
CREATE INDEX IF NOT EXISTS idx_jobs_invoice_id    ON jobs (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_job_id    ON invoices (job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices (issue_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_services_pub_order ON services (is_published, sort_order);
CREATE INDEX IF NOT EXISTS idx_events_pub_order   ON events (is_published, sort_order, event_date);
CREATE INDEX IF NOT EXISTS idx_gallery_category   ON gallery_images (category, sort_order);

COMMIT;
