export async function callGemini(apiKey: string, prompt: string, systemInstruction: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                response_mime_type: "application/json",
            }
        })
    })

    if (!response.ok) {
        const err = await response.text()
        console.error('[Black Shore] Gemini API meledak:', err)
        throw new Error('Gagal manggil otak Gemini')
    }

    const data: any = await response.json()
    const text = data.candidates[0].content.parts[0].text

    return JSON.parse(text)
}