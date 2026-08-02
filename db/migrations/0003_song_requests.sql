-- Mi Cancion manual Bizum passes. Incremental, transactional and limited to public.
BEGIN;
CREATE TABLE IF NOT EXISTS song_request_rounds (
 id UUID PRIMARY KEY, name TEXT NOT NULL CHECK(char_length(name)<=120), status TEXT NOT NULL CHECK(status IN ('open','paused','full','last_round','closed')),
 capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 1000), reserved_slots INTEGER NOT NULL DEFAULT 0 CHECK(reserved_slots>=0 AND reserved_slots<=capacity),
 message TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_round_active ON song_request_rounds ((true)) WHERE status IN ('open','paused','full','last_round');
CREATE TABLE IF NOT EXISTS song_requests (
 id UUID PRIMARY KEY, round_id UUID NOT NULL REFERENCES song_request_rounds(id), public_reference TEXT NOT NULL UNIQUE CHECK(public_reference ~ '^MC-[0-9]{3}$'),
 private_token_hash CHAR(64) NOT NULL UNIQUE, private_token_encrypted TEXT NOT NULL, bizum_name TEXT NOT NULL CHECK(char_length(bizum_name) BETWEEN 2 AND 100), whatsapp_number TEXT NOT NULL CHECK(whatsapp_number ~ '^\\+[1-9][0-9]{7,14}$'),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=100), reserved_song_count SMALLINT NOT NULL CHECK(reserved_song_count BETWEEN 1 AND 5), payment_mode TEXT NOT NULL DEFAULT 'manual_bizum' CHECK(payment_mode='manual_bizum'),
 status TEXT NOT NULL CHECK(status IN ('created','pending_manual_payment','payment_reported','paid','song_selection_open','songs_submitted','queued','played','payment_not_found','expired','cancelled','archived')),
 payment_reported_at TIMESTAMPTZ, paid_at TIMESTAMPTZ, confirmed_by TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS song_request_items (
 id UUID PRIMARY KEY, song_request_id UUID NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE, position SMALLINT NOT NULL CHECK(position BETWEEN 1 AND 5), title TEXT NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160), artist TEXT CHECK(artist IS NULL OR char_length(artist)<=160),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','played')), played_at TIMESTAMPTZ, spotify_track_id TEXT, spotify_track_url TEXT, artwork_url TEXT, version_label TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(song_request_id,position)
);
CREATE TABLE IF NOT EXISTS song_request_events (id UUID PRIMARY KEY, song_request_id UUID NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE, event_type TEXT NOT NULL, actor TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(song_request_id,event_type,actor));
CREATE INDEX IF NOT EXISTS idx_song_requests_round_status ON song_requests(round_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_song_items_request ON song_request_items(song_request_id,position);
COMMIT;
