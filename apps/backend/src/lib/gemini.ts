import { GoogleGenAI } from "@google/genai";

export async function callGemini(apiKey: string, prompt: string, systemInstruction: string) {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const intentSchema = {
        type: "object",
        properties: {
            intent: { type: "string" },
            reply_text: { type: "string" },
            metadata: { type: "object" }
        },
        required: ["intent", "reply_text", "metadata"]
    };

    try {
        const interaction = await ai.interactions.create({
            model: "gemini-3.8-flash",
            input: `${systemInstruction}\n\n[Pesan User]: ${prompt}`,
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: intentSchema
            }
        });

        if (typeof interaction.output_text !== "string") {
            throw new Error("Gemini tidak mengembalikan output teks");
        }

        return JSON.parse(interaction.output_text);

    } catch (error: any) {
        console.error('[Black Shore] Gemini 3.8 Error:', error);
        throw new Error('Gagal manggil otak Gemini terbaru');
    }
}