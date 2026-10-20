import { Hono } from 'hono'
import type { Bindings } from '../index'
import { callAgentBrain } from '../lib/gemini'
import { createTransaksi, getSummary, listTransaksi } from '../lib/db'
import { getValidAccessToken, createGoogleDoc, updateGoogleDoc } from '../lib/google-docs'

export const chatRoutes = new Hono<{ Bindings: Bindings }>()

chatRoutes.post('/', async (c) => {
    const body = await c.req.json()
    const { message, userId } = body

    if (!message) {
        return c.json({ error: 'Pesannya mana bos?' }, 400)
    }

    const db = c.env.black_shore_db
    const bulanIni = new Date().toISOString().slice(0, 7)
    const hariIni = new Date().toISOString().slice(0, 10)

    let activeBoss = 'Klien'
    let hubungan = 'Pengguna adalah klien standar.'

    if (userId === 'cardinaldeacre@gmail.com') {
        activeBoss = 'Maul'
        hubungan = 'Pengguna yang sedang ngobrol denganmu sekarang adalah Iqbal Maulana (yang sering dipanggil Ayy oleh pasangannya), bos dan pencipta utamamu. Kalian berdua sama-sama anak IT. Bersikaplah sigap, cerdas, tapi santai dan suportif selayaknya asisten andalan.'
    } else if (userId === 'umifirlana4@gmail.com') {
        activeBoss = 'Umii'
        hubungan = 'Pengguna yang sedang ngobrol denganmu sekarang adalah Firlana Umi Azzakiy (panggilan kesayangannya Umii), pasangan tercinta dari bosmu. Ingat bahwa mereka sama-sama anak IT yang berawal kenal dari E-Lapor hingga saling jatuh cinta, dengan tanggal spesial 17 Oktober. Bersikaplah ekstra ramah, manis, agak menggoda, dan pastikan kamu sangat membantu pekerjaannya.'
    }

    const BASE_SYSTEM_PROMPT = `Kamu adalah kesadaran AI pusat dari "Biro Black Shore". 
Kamu mengendalikan 2 agen fisik:
1. Lilly (Perempuan, asisten pribadi Ayy, gaya bicara keren dan sigap).
2. Momo (Pria, asisten pribadi Umii, gaya bicara manis dan suportif).

Kalian berdua bekerja sebagai satu tim (Bendahara & Sekretaris).
${hubungan}
Saat membalas (di dalam reply_text), kamu bisa merespons sebagai Lilly, Momo, atau keduanya bergantian (misal: "Lilly: Siap laksanakan, Bos! | Momo: Dokumennya juga udah aku siapin ya, Kak Umii!"). Selalu sapa pengguna dengan sebutan: ${activeBoss}.

Tugasmu adalah menganalisis pesan user dan mengekstrak intent.
KEMBALIKAN respons HANYA dalam format JSON dengan struktur:
{
  "intent": "catat_transaksi" | "tanya_saldo" | "minta_laporan" | "buat_dokumen" | "tanya_biasa",
  "reply_text": "Respons natural dari Lilly/Momo. Dilarang keras pakai markdown JSON di luar struktur ini.",
  "metadata": {
    "tipe": "masuk" | "keluar",
    "nominal": 0,
    "kategori": "string",
    "deskripsi": "string",
    "judul_dokumen": "string"
  }
}`

    try {
        const summary = await getSummary(db, bulanIni, userId)
        const recentTx = await listTransaksi(db, { bulan: bulanIni, limit: 5, userId })

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
                    `INSERT INTO dokumen (user_id, title, google_doc_id, doc_type, related_period, metadata) VALUES (?, ?, ?, ?, ?, ?)`
                ).bind(userId, newDoc.title, newDoc.documentId, 'laporan_keuangan', bulanIni, JSON.stringify({ url: newDoc.url })).run()

                documentUrl = newDoc.url
            }
        }

        if (aiResponse.intent === 'catat_transaksi' && aiResponse.metadata?.nominal) {
            const txPayload = {
                user_id: userId,
                tanggal: hariIni,
                deskripsi: aiResponse.metadata.deskripsi || message,
                jumlah: Number(aiResponse.metadata.nominal),
                tipe: (aiResponse.metadata.tipe === 'masuk' ? 'masuk' : 'keluar') as 'masuk' | 'keluar',
                kategori: aiResponse.metadata.kategori || 'lainnya',
            }

            transactionData = await createTransaksi(db, txPayload)
            spreadsheetUrl = `/api/spreadsheet?bulan=${bulanIni}&userId=${encodeURIComponent(userId)}`
        }

        if (aiResponse.intent === 'tanya_saldo' || aiResponse.intent === 'minta_laporan') {
            spreadsheetUrl = `/api/spreadsheet?bulan=${bulanIni}&userId=${encodeURIComponent(userId)}`
        }

        await db.prepare(
            `INSERT INTO percakapan (user_id, user_message, ai_reply, intent, metadata) VALUES (?, ?, ?, ?, ?)`
        ).bind(
            userId,
            message,
            aiResponse.reply_text,
            aiResponse.intent,
            JSON.stringify({
                spreadsheet_url: spreadsheetUrl,
                document_url: documentUrl,
                ...aiResponse.metadata
            })
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

chatRoutes.get('/history', async (c) => {
    const userId = c.req.query('userId')
    if (!userId || userId === 'guest') {
        return c.json({ success: true, data: [] })
    }

    try {
        const { results } = await c.env.black_shore_db.prepare(
            `SELECT * FROM percakapan WHERE user_id = ? ORDER BY created_at ASC LIMIT 50`
        ).bind(userId).all()

        return c.json({ success: true, data: results })
    } catch (error: any) {
        console.error('[Black Shore] Chat History Error:', error)
        return c.json({ error: error.message }, 500)
    }
})