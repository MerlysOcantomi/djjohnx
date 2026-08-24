CREATE TABLE IF NOT EXISTS free_song_requests (
  id BIGSERIAL PRIMARY KEY,
  requester_name TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist_name TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  request_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT free_song_requests_status_check CHECK (status IN ('pending','accepted','played','rejected'))
);

CREATE INDEX IF NOT EXISTS free_song_requests_created_at_idx
  ON free_song_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS free_song_requests_status_created_at_idx
  ON free_song_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS free_song_requests_request_key_created_at_idx
  ON free_song_requests (request_key, created_at DESC);
