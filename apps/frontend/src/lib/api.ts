const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL
console.log('BACKEND_URL:', BACKEND_URL)
if (!BACKEND_URL) {
    throw new Error('NEXT_PUBLIC_BACKEND_URL is not defined')
}
export interface RawChatResponse {
    success: boolean
    reply: string
    intent: string
    metadata?: Record<string, any>
    spreadsheet_url?: string | null
    document_url?: string | null
    transaction?: any
    error?: string
}

export const apiService = {
    getGoogleSignInUrl(): string {
        return `${BACKEND_URL}/auth/google/signin`
    },

    resolveBackendUrl(relativePath?: string | null): string | null {
        if (!relativePath) return null
        return relativePath.startsWith('http') ? relativePath : `${BACKEND_URL}${relativePath}`
    },

    getStatus(userId: string): Promise<{ connected: boolean }> {
        return fetch(`${BACKEND_URL}/auth/status?userId=${encodeURIComponent(userId)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!data || typeof data.connected !== 'boolean') {
                    throw new Error('Invalid response from server')
                }
                return data
            })
    },

    async sendChat(message: string, userId: string): Promise<RawChatResponse> {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, userId }),
        })

        const data = await res.json()
        if (!res.ok) {
            throw new Error(data.error || 'Gagal menghubungi Agent Black Shore')
        }
        return data
    },

    async disconnectGoogle(userId: string): Promise<void> {
        await fetch(`${BACKEND_URL}/auth/disconnect?userId=${encodeURIComponent(userId)}`, {
            method: 'POST',
        })
    },

    async getChatHistory(userId: string) {
        if (!userId || userId === 'guest') {
            return []
        }

        const res = await fetch(`${BACKEND_URL}/api/chat/history?userId=${encodeURIComponent(userId)}`)
        const data = await res.json()

        if (!res.ok) {
            throw new Error('Gagal mengambil riwayat percakapan')
        }

        return data.data
    }
}