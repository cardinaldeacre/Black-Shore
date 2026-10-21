import { Hono } from 'hono'
import type { Bindings } from '../index'

export const authRoutes = new Hono<{ Bindings: Bindings }>()

authRoutes.get('/google/signin', (c) => {
    const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=email profile https://www.googleapis.com/auth/documents&access_type=offline&prompt=consent`
    return c.redirect(url)
})

authRoutes.get('/google/callback', async (c) => {
    const code = c.req.query('code')
    if (!code) return c.text('Auth code hilang bro!', 400)

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: c.env.GOOGLE_CLIENT_ID,
                client_secret: c.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${new URL(c.req.url).origin}/auth/google/callback`,
                grant_type: 'authorization_code',
                code: code,
            }),
        })
        const tokens: any = await tokenRes.json()

        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        const userInfo: any = await userRes.json()

        const userId = userInfo.email
        const email = userInfo.email

        const existingData = await c.env.OAUTH_KV.get(`oauth:google:${userId}`, 'json') as any
        const finalRefreshToken = tokens.refresh_token || (existingData ? existingData.refresh_token : null)

        if (!finalRefreshToken) {
            return c.text('Gagal dapat refresh_token. Hapus akses aplikasi di Akun Google lalu login ulang!', 400)
        }

        await c.env.OAUTH_KV.put(
            `oauth:google:${userId}`,
            JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: finalRefreshToken,
            })
        )

        const frontendUrl = c.env.ENVIRONMENT === 'development'
            ? 'http://localhost:3000'
            : 'https://black-shore.vercel.app'

        return c.redirect(
            `${frontendUrl}?connected=true&userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`
        )
    } catch (err: any) {
        return c.text(`OAuth Error: ${err.message}`, 500)
    }
})

authRoutes.get('/status', async (c) => {
    const userId = c.req.query('userId')
    if (!userId) return c.json({ connected: false })
    const data = await c.env.OAUTH_KV.get(`oauth:google:${userId}`)
    return c.json({ connected: !!data })
})

authRoutes.post('/disconnect', async (c) => {
    const userId = c.req.query('userId')
    if (userId) await c.env.OAUTH_KV.delete(`oauth:google:${userId}`)
    return c.json({ success: true })
})