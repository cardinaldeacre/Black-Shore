const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787'

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
}