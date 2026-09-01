-- ZeroShare v2 Migration — Full Implementation Flow
-- Run once: psql -U postgres -h localhost -d zeroshare -f database/migrate_v2.sql

-- ── Applications (third-party simulators) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(100) NOT NULL DEFAULT 'app',
  description TEXT,
  trust_score NUMERIC(4,2) DEFAULT 0.5,
  status      VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
  api_key     VARCHAR(255) UNIQUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── data_assets (replaces/extends user_data with sensitivity) ───────────────
ALTER TABLE user_data ADD COLUMN IF NOT EXISTS sensitivity_level VARCHAR(20) DEFAULT 'MEDIUM';
-- sensitivity_level: LOW | MEDIUM | HIGH | VERY_HIGH

-- ── consent_assets (fine-grained per-field permissions) ─────────────────────
CREATE TABLE IF NOT EXISTS consent_assets (
  id         SERIAL PRIMARY KEY,
  consent_id INTEGER NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  asset_id   INTEGER NOT NULL REFERENCES user_data(id) ON DELETE CASCADE,
  permission VARCHAR(20) NOT NULL DEFAULT 'READ',
  status     VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  UNIQUE(consent_id, asset_id)
);

-- ── access_tokens (scoped tokens issued after consent approval) ──────────────
CREATE TABLE IF NOT EXISTS access_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id     INTEGER NOT NULL REFERENCES consents(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  scope          JSONB NOT NULL DEFAULT '[]',
  purpose        TEXT,
  issued_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at     TIMESTAMP WITH TIME ZONE,
  revoked_at     TIMESTAMP WITH TIME ZONE,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

-- ── access_logs (every data access attempt) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS access_logs (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  consent_id     INTEGER REFERENCES consents(id) ON DELETE SET NULL,
  asset_id       INTEGER REFERENCES user_data(id) ON DELETE SET NULL,
  action         VARCHAR(50) NOT NULL DEFAULT 'READ',
  purpose        TEXT,
  result         VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  denial_reason  VARCHAR(255),
  ip_address     VARCHAR(45),
  device         TEXT,
  timestamp      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── risk_assessments (ML model output per consent) ───────────────────────────
CREATE TABLE IF NOT EXISTS risk_assessments (
  id            SERIAL PRIMARY KEY,
  consent_id    INTEGER REFERENCES consents(id) ON DELETE CASCADE,
  model_version VARCHAR(50) NOT NULL DEFAULT 'rule-based-v1',
  risk_score    INTEGER NOT NULL,
  risk_level    VARCHAR(20) NOT NULL,
  features      JSONB,
  recommendation JSONB,
  confidence    VARCHAR(50),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── anomaly_events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anomaly_events (
  id             SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  access_log_id  INTEGER REFERENCES access_logs(id) ON DELETE SET NULL,
  anomaly_score  NUMERIC(5,2),
  severity       VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  reason         TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Hash-chain audit (tamper-evident) ────────────────────────────────────────
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS previous_hash VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS current_hash  VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address    VARCHAR(45);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device        TEXT;

-- ── Seed 5 demo applications ─────────────────────────────────────────────────
INSERT INTO applications (name, type, description, trust_score, api_key) VALUES
  ('JobPortal',       'app',     'Recruitment platform requesting resume and education data', 0.75, 'demo-key-jobportal'),
  ('BankKYC',         'app',     'Banking KYC verification service',                          0.85, 'demo-key-bankkyc'),
  ('HealthcareApp',   'app',     'Personal health monitoring application',                    0.60, 'demo-key-healthcare'),
  ('EducationPortal', 'website', 'Online learning platform',                                  0.70, 'demo-key-education'),
  ('MarketingCo',     'app',     'Digital marketing analytics service',                       0.30, 'demo-key-marketing')
ON CONFLICT DO NOTHING;
