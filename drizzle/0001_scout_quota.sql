CREATE TABLE IF NOT EXISTS scout_quota (
  client_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0),
  PRIMARY KEY (client_key, window_start)
) WITHOUT ROWID;
