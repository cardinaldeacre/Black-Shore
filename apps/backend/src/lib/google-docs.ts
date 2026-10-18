import type { Bindings } from '../index'

export async function getValidAccessToken(env: Bindings, userId: string): Promise<string> {
    const rawData = await env.OAUTH_KV.get(`oauth:google:${userId}`)
    if (!rawData) {
        throw new Error(`User ${userId} belum konek Google OAuth nih! Klik Connect Google dulu.`)
    }

    const { refresh_token } = JSON.parse(rawData)

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            refresh_token: refresh_token,
            grant_type: 'refresh_token',
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gagal refresh token Google: ${err}`)
    }

    const data: any = await res.json()
    return data.access_token
}

export async function createGoogleDoc(accessToken: string, title: string) {
    const res = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gagal membuat Google Docs: ${err}`)
    }

    const doc: any = await res.json()
    return {
        documentId: doc.documentId as string,
        title: doc.title as string,
        url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
    }
}

export async function updateGoogleDoc(accessToken: string, documentId: string, content: string) {
    const res = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                {
                    insertText: {
                        location: { index: 1 },
                        text: content,
                    },
                },
            ],
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gagal mengisi konten Google Docs: ${err}`)
    }

    return await res.json()
}