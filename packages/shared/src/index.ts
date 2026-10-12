// ============================================================
// Black Shore — Shared Types
// ============================================================

// ------------------------------------------------------------
// Transaksi (Bendahara)
// ------------------------------------------------------------
export type TipeTransaksi = 'masuk' | 'keluar'

export interface Transaksi {
    id: string
    tanggal: string // ISO date: YYYY-MM-DD
    deskripsi: string
    jumlah: number
    tipe: TipeTransaksi
    kategori?: string
    created_at: string
}

export interface CreateTransaksiInput {
    tanggal: string
    deskripsi: string
    jumlah: number
    tipe: TipeTransaksi
    kategori?: string
}

// ------------------------------------------------------------
// Percakapan (Chat)
// ------------------------------------------------------------
export type Intent =
    | 'catat_transaksi'
    | 'tanya_saldo'
    | 'minta_laporan'
    | 'buat_dokumen'
    | 'edit_dokumen'
    | 'chat_biasa'

export interface Percakapan {
    id: string
    user_message: string
    ai_reply: string | null
    intent: Intent | null
    metadata: Record<string, unknown> | null
    created_at: string
}

// ------------------------------------------------------------
// Dokumen (Sekertaris)
// ------------------------------------------------------------
export type DocType = 'laporan' | 'draft' | 'notulen' | 'lainnya'

export interface Dokumen {
    id: string
    title: string
    google_doc_id: string
    doc_type: DocType
    related_period?: string // 'YYYY-MM'
    metadata?: Record<string, unknown>
    created_at: string
    updated_at: string
}

// ------------------------------------------------------------
// API Request/Response
// ------------------------------------------------------------
export interface ChatRequest {
    message: string
    userId: string
    sessionId?: string
}

export interface ChatResponse {
    reply: string
    intent: Intent
    metadata?: {
        iframeUrl?: string
        documentUrl?: string
        documentId?: string
        spreadsheetUrl?: string
    }
}

export interface ApiError {
    error: string
    message: string
    statusCode: number
}

// ------------------------------------------------------------
// Aturan (Bendahara)
// ------------------------------------------------------------
export interface Aturan {
    id: string
    kategori: string
    batas?: number
    catatan?: string
    created_at: string
}

// ------------------------------------------------------------
// Memori (Long-term Memory)
// ------------------------------------------------------------
export interface Memori {
    id: string
    topik: string
    konten: string
    created_at: string
}

// ------------------------------------------------------------
// Summary Keuangan
// ------------------------------------------------------------
export interface SummaryKeuangan {
    periode: string // 'YYYY-MM'
    totalMasuk: number
    totalKeluar: number
    saldo: number
    jumlahTransaksi: number
}