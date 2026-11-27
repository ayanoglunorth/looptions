-- Translation cache and character counters. No user id, IP or per-request timestamp is stored.
CREATE TABLE IF NOT EXISTS translations (
  from_lang TEXT NOT NULL,
  to_lang   TEXT NOT NULL,
  text_key  TEXT NOT NULL,   -- the word, lower-cased
  result    TEXT NOT NULL,
  PRIMARY KEY (from_lang, to_lang, text_key)
);
-- period is 'm:YYYY-MM' for the month and 'd:YYYY-MM-DD' for the day.
CREATE TABLE IF NOT EXISTS usage (
  period TEXT PRIMARY KEY,
  chars  INTEGER NOT NULL DEFAULT 0
);
