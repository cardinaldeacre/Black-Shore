-- Hapus tabel lama (karena kita rombak skema untuk multi-user)
DROP TABLE IF EXISTS transaksi;

DROP TABLE IF EXISTS percakapan;

DROP TABLE IF EXISTS aturan;

DROP TABLE IF EXISTS memori;

DROP TABLE IF EXISTS dokumen;

-- ------------------------------------------------------------
-- Tabel transaksi (bendahara)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi (
  id TEXT PRIMARY KEY DEFAULT (lower(hex (randomblob (16)))),
  user_id TEXT NOT NULL,
  tanggal TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  jumlah REAL NOT NULL,
  tipe TEXT CHECK (tipe IN ('masuk', 'keluar')) NOT NULL,
  kategori TEXT,
  created_at TEXT DEFAULT (datetime ('now'))
);

CREATE INDEX IF NOT EXISTS idx_transaksi_user_tanggal ON transaksi (user_id, tanggal);

-- ------------------------------------------------------------
-- Tabel percakapan (riwayat chat)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS percakapan (
  id TEXT PRIMARY KEY DEFAULT (lower(hex (randomblob (16)))),
  user_id TEXT NOT NULL,
  user_message TEXT NOT NULL,
  ai_reply TEXT,
  intent TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime ('now'))
);

CREATE INDEX IF NOT EXISTS idx_percakapan_user_created ON percakapan (user_id, created_at);

-- ------------------------------------------------------------
-- Tabel aturan (rules bendahara)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aturan (
  id TEXT PRIMARY KEY DEFAULT (lower(hex (randomblob (16)))),
  user_id TEXT NOT NULL,
  kategori TEXT NOT NULL,
  batas REAL,
  catatan TEXT,
  created_at TEXT DEFAULT (datetime ('now'))
);

-- ------------------------------------------------------------
-- Tabel memori (long-term memory)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memori (
  id TEXT PRIMARY KEY DEFAULT (lower(hex (randomblob (16)))),
  user_id TEXT NOT NULL,
  topik TEXT NOT NULL,
  konten TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime ('now'))
);

-- ------------------------------------------------------------
-- Tabel dokumen (sekretaris)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dokumen (
  id TEXT PRIMARY KEY DEFAULT (lower(hex (randomblob (16)))),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  google_doc_id TEXT UNIQUE NOT NULL,
  doc_type TEXT,
  related_period TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime ('now')),
  updated_at TEXT DEFAULT (datetime ('now'))
);

CREATE INDEX IF NOT EXISTS idx_dokumen_user_period ON dokumen (user_id, related_period);