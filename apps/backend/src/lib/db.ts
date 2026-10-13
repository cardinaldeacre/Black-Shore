import type { Transaksi, CreateTransaksiInput, SummaryKeuangan } from '@black-shore/shared'

export async function listTransaksi(
    db: D1Database,
    options?: { bulan?: string; limit?: number }
): Promise<Transaksi[]> {
    const limit = options?.limit ?? 100
    let query = 'SELECT * FROM transaksi'
    const params: string[] = []

    if (options?.bulan) {
        query += ' WHERE strftime("%Y-%m", tanggal) = ?'
        params.push(options.bulan)
    }

    query += ' ORDER BY tanggal DESC LIMIT ?'
    params.push(String(limit))

    const result = await db.prepare(query).bind(...params).all<Transaksi>()
    return result.results
}

export async function createTransaksi(
    db: D1Database,
    input: CreateTransaksiInput
): Promise<Transaksi> {
    const result = await db
        .prepare(
            `INSERT INTO transaksi (tanggal, deskripsi, jumlah, tipe, kategori)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`
        )
        .bind(input.tanggal, input.deskripsi, input.jumlah, input.tipe, input.kategori ?? null)
        .first<Transaksi>()

    if (!result) throw new Error('Failed to create transaksi')
    return result
}

export async function getSummary(
    db: D1Database,
    bulan: string // 'YYYY-MM'
): Promise<SummaryKeuangan> {
    const result = await db
        .prepare(
            `SELECT
        COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) as totalMasuk,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) as totalKeluar,
        COUNT(*) as jumlahTransaksi
       FROM transaksi
       WHERE strftime('%Y-%m', tanggal) = ?`
        )
        .bind(bulan)
        .first<{ totalMasuk: number; totalKeluar: number; jumlahTransaksi: number }>()

    const totalMasuk = result?.totalMasuk ?? 0
    const totalKeluar = result?.totalKeluar ?? 0

    return {
        periode: bulan,
        totalMasuk,
        totalKeluar,
        saldo: totalMasuk - totalKeluar,
        jumlahTransaksi: result?.jumlahTransaksi ?? 0,
    }
}

export async function logPercakapan(
    db: D1Database,
    data: {
        user_message: string
        ai_reply: string | null
        intent: string | null
        metadata?: Record<string, unknown> | null
    }
): Promise<void> {
    await db
        .prepare(
            `INSERT INTO percakapan (user_message, ai_reply, intent, metadata)
       VALUES (?, ?, ?, ?)`
        )
        .bind(
            data.user_message,
            data.ai_reply,
            data.intent,
            data.metadata ? JSON.stringify(data.metadata) : null
        )
        .run()
}