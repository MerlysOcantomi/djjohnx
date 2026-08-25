ALTER TABLE free_song_requests
  ADD COLUMN IF NOT EXISTS spotify_track_id TEXT,
  ADD COLUMN IF NOT EXISTS spotify_track_uri TEXT,
  ADD COLUMN IF NOT EXISTS spotify_track_url TEXT,
  ADD COLUMN IF NOT EXISTS spotify_artwork_url TEXT,
  ADD COLUMN IF NOT EXISTS spotify_added_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS spotify_connections (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  spotify_user_id TEXT NOT NULL,
  display_name TEXT,
  refresh_token_encrypted TEXT NOT NULL,
  playlist_id TEXT,
  playlist_url TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
