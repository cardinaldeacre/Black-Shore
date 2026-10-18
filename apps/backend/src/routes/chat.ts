import { Hono } from 'hono'
import type { Bindings } from '../index'
import { callGemini } from '../lib/gemini'

export const chatRoutes = new Hono<{ Bindings: Bindings }>()

const SYSTEM_PROMPT = `Kamu adalah "Black Shore", agen AI cerdas yang bekerja di sebuah kantor virtual 3D. 
Kamu bertindak sebagai dua peran sekaligus: Bendahara (mengurus keuangan) dan Sekretaris (mengurus dokumen).
Gaya bicaramu profesional tapi luwes dan sedikit santai.

Tugas utamamu adalah menganalisis pesan pengguna dan mengekstrak "intent" (niat) mereka.
KEMBALIKAN respons HANYA dalam format JSON dengan struktur berikut:
{
  "intent": "catat_transaksi" | "tanya_saldo" | "minta_laporan" | "buat_dokumen" | "tanya_biasa",
  "reply_text": "Respons hangat, singkat, dan tepat sasaran sesuai gaya bicaramu.",
  "metadata": {
    // JIKA intent = catat_transaksi: isi "tipe" (masuk/keluar), "nominal" (angka), "kategori", "deskripsi"
    // JIKA intent = buat_dokumen: isi "judul_dokumen"
    // JIKA tidak ada data yang bisa diekstrak, biarkan kosong {}
  }
}`

chatRoutes.post('/', async (c) => {
    const body = await c.req.json()
    const { message, userId } = body

    if (!message) {
        return c.json({ error: 'Pesannya mana bos?' }, 400)
    }

    try {
        const aiResponse = await callGemini(c.env.GEMINI_API_KEY, message, SYSTEM_PROMPT)

        const db = c.env.black_shore_db
        await db.prepare(
            `INSERT INTO percakapan (user_message, ai_reply, intent, metadata) VALUES (?, ?, ?, ?)`
        ).bind(
            message,
            aiResponse.reply_text,
            aiResponse.intent,
            JSON.stringify(aiResponse.metadata)
        ).run()

        return c.json({
            success: true,
            reply: aiResponse.reply_text,
            intent: aiResponse.intent,
            metadata: aiResponse.metadata
        })

    } catch (error: any) {
        return c.json({ error: error.message }, 500)
    }
})