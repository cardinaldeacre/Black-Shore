-- ============================================================
-- Black Shore — Initial Schema
-- Migration: 0001_initial
-- ============================================================

-- ------------------------------------------------------------
-- Tabel transaksi (bendahara)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksi (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tanggal TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  jumlah REAL NOT NULL,
  tipe TEXT CHECK (tipe IN ('masuk', 'keluar')) NOT NULL,
  kategori TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_tipe ON transaksi(tipe);

-- ------------------------------------------------------------
-- Tabel percakapan (riwayat chat)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS percakapan (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_message TEXT NOT NULL,
  ai_reply TEXT,
  intent TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_percakapan_created ON percakapan(created_at);

-- ------------------------------------------------------------
-- Tabel aturan (rules bendahara)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aturan (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kategori TEXT NOT NULL,
  batas REAL,
  catatan TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- Tabel memori (long-term memory)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memori (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  topik TEXT NOT NULL,
  konten TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- Tabel dokumen (sekertaris)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dokumen (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  google_doc_id TEXT UNIQUE NOT NULL,
  doc_type TEXT,
  related_period TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dokumen_period ON dokumen(related_period);