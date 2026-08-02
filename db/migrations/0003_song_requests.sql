-- Mi Cancion: cola de peticiones, configuracion de la noche e idempotencia de pagos.
-- Migracion incremental; no modifica ni elimina datos existentes.
BEGIN;

CREATE TABLE IF NOT EXISTS song_request_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  service_status TEXT NOT NULL DEFAULT 'open' CHECK (service_status IN ('open','paused','closed')),
  free_requests BOOLEAN NOT NULL DEFAULT false,
  price_cents INTEGER NOT NULL DEFAULT 100 CHECK (price_cents BETWEEN 0 AND 100000),
  currency CHAR(3) NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  event_name TEXT NOT NULL DEFAULT 'Noche DJ John' CHECK (char_length(event_name) <= 120),
  event_id TEXT NOT NULL DEFAULT 'current' CHECK (char_length(event_id) <= 80),
  public_message TEXT NOT NULL DEFAULT '',
  peak_mode BOOLEAN NOT NULL DEFAULT false,
  peak_message TEXT NOT NULL DEFAULT 'Estamos en hora punta. DJ John recibirá tu canción y decidirá el mejor momento.',
  last_round BOOLEAN NOT NULL DEFAULT false,
  dedications_enabled BOOLEAN NOT NULL DEFAULT true,
  active_request_limit INTEGER CHECK (active_request_limit IS NULL OR active_request_limit BETWEEN 1 AND 10000),
  queue_status TEXT NOT NULL DEFAULT '',
  blocked_genres TEXT NOT NULL DEFAULT '',
  payment_provider TEXT NOT NULL DEFAULT 'test',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO song_request_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS song_requests (
  id UUID PRIMARY KEY,
  event_id TEXT NOT NULL,
  song_title TEXT NOT NULL CHECK (char_length(song_title) BETWEEN 1 AND 160),
  artist_name TEXT CHECK (artist_name IS NULL OR char_length(artist_name) <= 160),
  requester_name TEXT CHECK (requester_name IS NULL OR char_length(requester_name) <= 80),
  location_label TEXT CHECK (location_label IS NULL OR char_length(location_label) <= 80),
  dedication TEXT CHECK (dedication IS NULL OR char_length(dedication) <= 240),
  request_status TEXT NOT NULL CHECK (request_status IN ('pending_payment','paid','accepted','played','rejected','refunded','expired','archived')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('not_required','pending','processing','paid','failed','cancelled','refunded','partially_refunded','expired')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents BETWEEN 0 AND 100000),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  payment_provider TEXT NOT NULL,
  payment_reference TEXT NOT NULL UNIQUE,
  checkout_session_id TEXT UNIQUE,
  payment_transaction_id TEXT UNIQUE,
  client_request_id UUID NOT NULL UNIQUE,
  paid_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS song_request_webhook_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_song_requests_queue ON song_requests (request_status, paid_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_requests_payment ON song_requests (payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_requests_event ON song_requests (event_id, created_at DESC);
COMMIT;
