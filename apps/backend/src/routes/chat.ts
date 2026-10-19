import { Hono } from 'hono'
import type { Bindings } from '../index'
import { callAgentBrain } from '../lib/gemini'
import { createTransaksi, getSummary, listTransaksi } from '../lib/db'
import { getValidAccessToken, createGoogleDoc, updateGoogleDoc } from '../lib/google-docs'

export const chatRoutes = new Hono<{ Bindings: Bindings }>()

const BASE_SYSTEM_PROMPT = `Kamu adalah "Black Shore", agen AI cerdas di kantor virtual 3D yang berperan sebagai Bendahara (keuangan) dan Sekretaris (dokumen).
Gaya bicaramu luwes, cerdas, dan to-the-point.

Tugasmu adalah menganalisis pesan user dan mengekstrak intent.
KEMBALIKAN respons HANYA dalam format JSON dengan struktur:
{
  "intent": "catat_transaksi" | "tanya_saldo" | "minta_laporan" | "buat_dokumen" | "tanya_biasa",
  "reply_text": "Respons natural sesuai data konteks yang diberikan.",
  "metadata": {
    "tipe": "masuk" | "keluar",
    "nominal": 0,
    "kategori": "string",
    "deskripsi": "string",
    "judul_dokumen": "string"
  }
}

Aturan Metadata:
- Jika intent = "catat_transaksi": wajib isi "tipe" ("masuk" atau "keluar"), "nominal" (angka murni), "kategori", dan "deskripsi".
- Jika intent = "buat_dokumen" atau "minta_laporan": wajib isi "judul_dokumen".`

chatRoutes.post('/', async (c) => {
    const body = await c.req.json()
    const { message, userId } = body

    if (!message) {
        return c.json({ error: 'Pesannya mana bos?' }, 400)
    }

    const db = c.env.black_shore_db
    const bulanIni = new Date().toISOString().slice(0, 7)
    const hariIni = new Date().toISOString().slice(0, 10)

    try {
        const summary = await getSummary(db, bulanIni)
        const recentTx = await listTransaksi(db, { bulan: bulanIni, limit: 5 })

        const contextPrompt = `
[KONTEKS KEUANGAN BULAN ${bulanIni}]
Ringkasan: ${JSON.stringify(summary)}
5 Transaksi Terakhir: ${JSON.stringify(recentTx)}
Tanggal Hari Ini: ${hariIni}
`
        const aiResponse = await callAgentBrain(
            c.env.GEMINI_API_KEY,
            c.env.AI,
            message,
            `${BASE_SYSTEM_PROMPT}\n${contextPrompt}`
        )

        let spreadsheetUrl: string | null = null
        let transactionData: any = null
        let documentUrl: string | null = null

        if (aiResponse.intent === 'buat_dokumen') {
            if (!userId || userId === '123' || userId === 'guest') {
                aiResponse.reply_text = 'Kamu belum konek akun Google nih! Klik tombol "Connect Google" di pojok kanan atas dulu ya biar aku bisa bikin Google Docs.'
            } else {
                let accessToken: string
                try {
                    accessToken = await getValidAccessToken(c.env, userId)
                } catch (e: any) {
                    console.error('[Black Shore] Token error:', e.message)
                    return c.json({
                        success: false,
                        needs_auth: true,
                        reply: 'Koneksi Google kamu belum valid atau sudah kedaluwarsa. Klik "Connect Google" lagi ya.',
                    }, 401)
                }
                const docTitle = aiResponse.metadata?.judul_dokumen || `Laporan Keuangan Black Shore - ${bulanIni}`

                const barisTransaksi = recentTx.length > 0
                    ? recentTx.map((t: any, i: number) => `${i + 1}. [${t.tanggal}] ${t.deskripsi} (${t.tipe.toUpperCase()}) - Rp ${Number(t.jumlah).toLocaleString('id-ID')}`).join('\n')
                    : 'Belum ada transaksi tercatat.'

                const docContent = [
                    `DOKUMEN BLACK SHORE: ${docTitle.toUpperCase()}`,
                    `Periode: ${bulanIni}`,
                    `Dibuat otomatis oleh Sekretaris AI pada: ${new Date().toLocaleString('id-ID')}\n`,
                    `--- RINGKASAN KEUANGAN ---`,
                    `Total Pemasukan  : Rp ${Number((summary as any)?.total_masuk || 0).toLocaleString('id-ID')}`,
                    `Total Pengeluaran: Rp ${Number((summary as any)?.total_keluar || 0).toLocaleString('id-ID')}`,
                    `Saldo Akhir      : Rp ${Number((summary as any)?.saldo || 0).toLocaleString('id-ID')}\n`,
                    `--- TRANSAKSI TERAKHIR ---`,
                    barisTransaksi
                ].join('\n')

                const newDoc = await createGoogleDoc(accessToken, docTitle)
                await updateGoogleDoc(accessToken, newDoc.documentId, docContent)

                await db.prepare(
                    `INSERT INTO dokumen (title, google_doc_id, doc_type, related_period, metadata) VALUES (?, ?, ?, ?, ?)`
                ).bind(newDoc.title, newDoc.documentId, 'laporan_keuangan', bulanIni, JSON.stringify({ url: newDoc.url, userId })).run()

                documentUrl = newDoc.url
            }
        }

        if (aiResponse.intent === 'catat_transaksi' && aiResponse.metadata?.nominal) {
            const txPayload = {
                tanggal: hariIni,
                deskripsi: aiResponse.metadata.deskripsi || message,
                jumlah: Number(aiResponse.metadata.nominal),
                tipe: (aiResponse.metadata.tipe === 'masuk' ? 'masuk' : 'keluar') as 'masuk' | 'keluar',
                kategori: aiResponse.metadata.kategori || 'lainnya',
            }

            transactionData = await createTransaksi(db, txPayload)
            spreadsheetUrl = `/api/spreadsheet?bulan=${bulanIni}`
        }

        if (aiResponse.intent === 'tanya_saldo' || aiResponse.intent === 'minta_laporan') {
            spreadsheetUrl = `/api/spreadsheet?bulan=${bulanIni}`
        }

        await db.prepare(
            `INSERT INTO percakapan (user_message, ai_reply, intent, metadata) VALUES (?, ?, ?, ?)`
        ).bind(
            message,
            aiResponse.reply_text,
            aiResponse.intent,
            JSON.stringify(aiResponse.metadata || {})
        ).run()

        return c.json({
            success: true,
            reply: aiResponse.reply_text,
            intent: aiResponse.intent,
            metadata: aiResponse.metadata,
            spreadsheet_url: spreadsheetUrl,
            document_url: documentUrl,
            transaction: transactionData,
        })

    } catch (error: any) {
        console.error('[Black Shore] Chat Error:', error)
        return c.json({ error: error.message }, 500)
    }
})