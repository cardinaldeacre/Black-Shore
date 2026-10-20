import type { Transaksi, CreateTransaksiInput, SummaryKeuangan } from '@black-shore/shared'

export async function listTransaksi(
    db: any,
    options: { bulan?: string; limit?: number; userId: string }
): Promise<Transaksi[]> {
    const limit = options.limit ?? 100
    let query = 'SELECT * FROM transaksi WHERE user_id = ?'
    const params: (string | number)[] = [options.userId]

    if (options.bulan) {
        query += ' AND strftime("%Y-%m", tanggal) = ?'
        params.push(options.bulan)
    }

    query += ' ORDER BY tanggal DESC LIMIT ?'
    params.push(limit)

    const result = await db.prepare(query).bind(...params).all()
    return result.results as Transaksi[]
}

export async function createTransaksi(
    db: any,
    input: CreateTransaksiInput & { user_id: string }
): Promise<Transaksi> {
    const id = crypto.randomUUID()
    const result = await db
        .prepare(
            `INSERT INTO transaksi (id, user_id, tanggal, deskripsi, jumlah, tipe, kategori)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             RETURNING *`
        )
        .bind(
            id,
            input.user_id,
            input.tanggal,
            input.deskripsi,
            input.jumlah,
            input.tipe,
            input.kategori ?? 'lainnya'
        )
        .first()

    if (!result) throw new Error('Failed to create transaksi')
    return result as Transaksi
}

export async function getSummary(
    db: any,
    bulan: string,
    userId: string
): Promise<SummaryKeuangan> {
    const result = await db
        .prepare(
            `SELECT
        COALESCE(SUM(CASE WHEN tipe = 'masuk' THEN jumlah ELSE 0 END), 0) as totalMasuk,
        COALESCE(SUM(CASE WHEN tipe = 'keluar' THEN jumlah ELSE 0 END), 0) as totalKeluar,
        COUNT(*) as jumlahTransaksi
       FROM transaksi
       WHERE user_id = ? AND strftime('%Y-%m', tanggal) = ?`
        )
        .bind(userId, bulan)
        .first()

    const totalMasuk = (result?.totalMasuk as number) ?? 0
    const totalKeluar = (result?.totalKeluar as number) ?? 0

    return {
        periode: bulan,
        totalMasuk,
        totalKeluar,
        saldo: totalMasuk - totalKeluar,
        jumlahTransaksi: (result?.jumlahTransaksi as number) ?? 0,
    }
}

export async function logPercakapan(
    db: any,
    data: {
        user_id: string
        user_message: string
        ai_reply: string | null
        intent: string | null
        metadata?: Record<string, unknown> | null
    }
): Promise<void> {
    const id = crypto.randomUUID()
    await db
        .prepare(
            `INSERT INTO percakapan (id, user_id, user_message, ai_reply, intent, metadata)
             VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(
            id,
            data.user_id,
            data.user_message,
            data.ai_reply,
            data.intent,
            data.metadata ? JSON.stringify(data.metadata) : null
        )
        .run()
}

export async function getTransaksiByBulan(
    db: any,
    bulan: string,
    userId: string
): Promise<Transaksi[]> {
    const result = await db
        .prepare(
            `SELECT * FROM transaksi
             WHERE user_id = ? AND strftime('%Y-%m', tanggal) = ?
             ORDER BY tanggal ASC, created_at ASC`
        )
        .bind(userId, bulan)
        .all()

    return result.results as Transaksi[]
}

export async function getAvailableMonths(db: any, userId: string): Promise<string[]> {
    const result = await db
        .prepare(
            `SELECT DISTINCT strftime('%Y-%m', tanggal) as bulan
             FROM transaksi
             WHERE user_id = ?
             ORDER BY bulan DESC`
        )
        .bind(userId)
        .all()

    return result.results.map((r: any) => r.bulan)
}