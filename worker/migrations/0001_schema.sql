CREATE TABLE IF NOT EXISTS workspaces (
 id TEXT PRIMARY KEY,
 version INTEGER NOT NULL DEFAULT 1,
 data TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS devices (
 id TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 token_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 created_at TEXT NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_devices_workspace ON devices(workspace_id,revoked);
CREATE TABLE IF NOT EXISTS pairings (
 code_hash TEXT PRIMARY KEY,
 workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 issuer_id TEXT NOT NULL REFERENCES devices(id),
 expires_at TEXT NOT NULL,
 consumed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pairings_expiry ON pairings(expires_at);
