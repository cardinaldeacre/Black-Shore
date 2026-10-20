import { Hono } from 'hono'
import type { Bindings } from '../index'
import { getValidAccessToken, createGoogleDoc, updateGoogleDoc } from '../lib/google-docs'
import { getSummary, listTransaksi } from '../lib/db'

export const documentsRoutes = new Hono<{ Bindings: Bindings }>()

// GET /api/documents — List semua dokumen dari D1
documentsRoutes.get('/', async (c) => {
    const { results } = await c.env.black_shore_db
        .prepare(`SELECT * FROM dokumen ORDER BY created_at DESC`)
        .all()
    return c.json({ data: results })
})

// POST /api/documents — Buat Google Docs baru
documentsRoutes.post('/', async (c) => {
    const body = await c.req.json()
    const { userId, title, content, docType = 'laporan_keuangan', bulan } = body

    if (!userId) {
        return c.json({ error: 'userId wajib dikirim untuk akses Google Docs' }, 400)
    }

    const targetBulan = bulan || new Date().toISOString().slice(0, 7)
    const docTitle = title || `Laporan Keuangan Black Shore - ${targetBulan}`

    try {
        const accessToken = await getValidAccessToken(c.env, userId)

        let finalContent = content
        if (!finalContent) {
            const summary: any = await getSummary(c.env.black_shore_db, targetBulan, userId)
            const listTx: any[] = await listTransaksi(c.env.black_shore_db, { userId, bulan: targetBulan })

            const barisTransaksi = listTx.length > 0
                ? listTx.map((t, i) => `${i + 1}. [${t.tanggal}] ${t.deskripsi} (${t.tipe.toUpperCase()}) - Rp ${Number(t.jumlah).toLocaleString('id-ID')}`).join('\n')
                : 'Belum ada transaksi tercatat pada periode ini.'

            finalContent = [
                `LAPORAN KEUANGAN BLACK SHORE`,
                `Periode: ${targetBulan}`,
                `Dibuat pada: ${new Date().toLocaleString('id-ID')}\n`,
                `--- RINGKASAN ---`,
                `Total Pemasukan : Rp ${Number(summary?.total_masuk || 0).toLocaleString('id-ID')}`,
                `Total Pengeluaran: Rp ${Number(summary?.total_keluar || 0).toLocaleString('id-ID')}`,
                `Saldo Akhir      : Rp ${Number(summary?.saldo || 0).toLocaleString('id-ID')}\n`,
                `--- DETAIL TRANSAKSI ---`,
                barisTransaksi,
                `\n--- Akhir Laporan ---`
            ].join('\n')
        }

        const newDoc = await createGoogleDoc(accessToken, docTitle)
        await updateGoogleDoc(accessToken, newDoc.documentId, finalContent)

        await c.env.black_shore_db.prepare(
            `INSERT INTO dokumen (title, google_doc_id, doc_type, related_period, metadata) VALUES (?, ?, ?, ?, ?)`
        ).bind(
            newDoc.title,
            newDoc.documentId,
            docType,
            targetBulan,
            JSON.stringify({ url: newDoc.url, createdBy: userId })
        ).run()

        return c.json({
            success: true,
            data: {
                title: newDoc.title,
                documentId: newDoc.documentId,
                url: newDoc.url,
                period: targetBulan
            }
        }, 201)

    } catch (err: any) {
        console.error('[Black Shore] Google Docs Error:', err)
        return c.json({ error: err.message }, 500)
    }
})