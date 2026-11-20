CREATE TABLE IF NOT EXISTS phone_numbers (
  phone VARCHAR(20) PRIMARY KEY,
  country_code VARCHAR(6) NOT NULL DEFAULT '40',
  country_name VARCHAR(80) NOT NULL DEFAULT 'România',
  views BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_votes (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL REFERENCES phone_numbers(phone) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL,
  voter_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phone, voter_key)
);

CREATE TABLE IF NOT EXISTS phone_comments (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL REFERENCES phone_numbers(phone) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_phone_created
  ON phone_comments (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_country
  ON phone_numbers (country_code, views DESC);
