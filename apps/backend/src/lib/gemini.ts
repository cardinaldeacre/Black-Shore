import { GoogleGenAI } from "@google/genai";

const intentSchema = {
    type: "object",
    properties: {
        intent: {
            type: "string",
            enum: ["catat_transaksi", "tanya_saldo", "minta_laporan", "buat_dokumen", "tanya_biasa"]
        },
        reply_text: { type: "string" },
        metadata: {
            type: "object",
            properties: {
                tipe: { type: "string" },
                nominal: { type: "number" },
                kategori: { type: "string" },
                deskripsi: { type: "string" },
                judul_dokumen: { type: "string" }
            }
        }
    },
    required: ["intent", "reply_text", "metadata"]
};

function cleanAndParseJson(raw: any) {
    if (typeof raw === "object" && raw !== null) return raw;
    const cleaned = String(raw)
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    return JSON.parse(cleaned);
}

export async function callAgentBrain(
    apiKey: string,
    cfAi: any,
    prompt: string,
    systemInstruction: string
) {
    const CF_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

    try {
        console.log(`[Black Shore] Memanggil Cloudflare AI (${CF_MODEL})...`);

        const cfResponse = await cfAi.run(CF_MODEL, {
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            response_format: {
                type: "json_schema",
                json_schema: intentSchema
            }
        });

        console.log("[Black Shore] Dijawab oleh: Cloudflare Workers AI ☁️");
        return cleanAndParseJson(cfResponse.response);

    } catch (cfError: any) {
        console.warn("[Black Shore] Cloudflare AI gagal, mencoba Gemini 3.8 Flash...", cfError.message);

        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const interaction = await ai.interactions.create({
            model: "gemini-3.8-flash",
            input: `${systemInstruction}\n\n[Pesan User]: ${prompt}`,
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: intentSchema
            }
        });

        console.log("[Black Shore] Dijawab oleh: Gemini 3.8 Flash 🧠");
        return cleanAndParseJson(interaction.output_text);
    }
}