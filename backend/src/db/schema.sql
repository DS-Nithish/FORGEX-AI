-- AgentShield SQLite Schema
-- Safe to run repeatedly — all statements use IF NOT EXISTS.

-- 1. Tool Registry
CREATE TABLE IF NOT EXISTS tools (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  risk_level  TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Source / Provenance Origins
CREATE TABLE IF NOT EXISTS sources (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL CHECK (type IN ('EMAIL', 'PDF', 'WEB', 'DATABASE', 'USER', 'SYSTEM')),
  name        TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('TRUSTED', 'UNTRUSTED')),
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 3. Tool Requests (each tool call an agent wants to make)
CREATE TABLE IF NOT EXISTS tool_requests (
  id          TEXT PRIMARY KEY,
  agent_id    TEXT,
  tool_id     TEXT NOT NULL REFERENCES tools(id),
  arguments   TEXT NOT NULL DEFAULT '{}',
  tainted     INTEGER NOT NULL DEFAULT 0,
  risk_level  TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  decision    TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (decision IN ('ALLOW', 'CONFIRM', 'BLOCK', 'PENDING')),
  reason      TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'denied', 'allowed', 'blocked')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 4. Provenance Links (which sources influenced which requests)
CREATE TABLE IF NOT EXISTS provenance_links (
  id            TEXT PRIMARY KEY,
  request_id    TEXT NOT NULL REFERENCES tool_requests(id),
  source_id     TEXT NOT NULL REFERENCES sources(id),
  relationship  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 5. Human-in-the-loop Approvals
CREATE TABLE IF NOT EXISTS approvals (
  id          TEXT PRIMARY KEY,
  request_id  TEXT NOT NULL REFERENCES tool_requests(id),
  status      TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'APPROVED', 'DENIED')),
  approved_by TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);

-- 6. Security Event Log (Append-only immutable audit trail)
CREATE TABLE IF NOT EXISTS security_events (
  id              TEXT PRIMARY KEY,
  request_id      TEXT REFERENCES tool_requests(id),
  event_type      TEXT NOT NULL,
  tool_name       TEXT NOT NULL DEFAULT '',
  args            TEXT NOT NULL DEFAULT '{}',
  provenance      TEXT NOT NULL DEFAULT '[]',
  taint           TEXT NOT NULL DEFAULT '{}',
  risk            TEXT NOT NULL DEFAULT '{}',
  matched_rule    TEXT NOT NULL DEFAULT '',
  reasoning       TEXT NOT NULL DEFAULT '',
  user_authorized INTEGER NOT NULL DEFAULT 0,
  severity        TEXT DEFAULT 'INFO',
  reason          TEXT DEFAULT '',
  metadata        TEXT,
  timestamp       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

