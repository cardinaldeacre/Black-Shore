import { Hono } from 'hono'
import type { Bindings } from '../index'

export const authRoutes = new Hono<{ Bindings: Bindings }>()

// GET /auth/google
authRoutes.get('/google/signin', (c) => {
    const origin = new URL(c.req.url).origin
    const params = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${origin}/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile https://www.googleapis.com/auth/documents',
        access_type: 'offline',
        prompt: 'consent',
    })

    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

// GET /auth/google/callback
authRoutes.get('/google/callback', async (c) => {

    const code = c.req.query('code')
    const error = c.req.query('error')

    if (error) {
        return c.json({ error, message: 'OAuth denied by user' }, 400)
    }

    if (!code) {
        return c.json({ error: 'missing_code', message: 'No code provided' }, 400)
    }

    const origin = new URL(c.req.url).origin

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${origin}/auth/google/callback`,
            grant_type: 'authorization_code',
        }),
    })

    if (!tokenResponse.ok) {
        const err = await tokenResponse.text()
        console.error('[Black Shore] Token exchange failed:', err)
        return c.json({ error: 'token_exchange_failed', details: err }, 500)
    }

    const tokens = (await tokenResponse.json()) as {
        access_token: string
        refresh_token?: string
        expires_in: number
        scope: string
        id_token: string
    }

    const idTokenPayload = tokens.id_token.split('.')[1]
    if (!idTokenPayload) {
        return c.json({ error: 'invalid_id_token' }, 500)
    }

    const idPayload = JSON.parse(
        atob(idTokenPayload.replace(/-/g, '+').replace(/_/g, '/'))
    )

    const userId = idPayload.sub
    const email = idPayload.email

    if (tokens.refresh_token) {
        await c.env.OAUTH_KV.put(
            `oauth:google:${userId}`,
            JSON.stringify({
                refresh_token: tokens.refresh_token,
                email,
                scopes: tokens.scope.split(' '),
                connected_at: new Date().toISOString(),
            })
        )
        console.log(`[Black Shore] OAuth connected for ${email} (${userId})`)
    } else {
        console.warn(
            `[Black Shore] No refresh_token for ${email}. ` +
            `User mungkin sudah pernah authorize sebelumnya. ` +
            `Coba revoke akses di https://myaccount.google.com/permissions lalu login ulang.`
        )
    }

    const frontendUrl = c.env.ENVIRONMENT === 'development'
        ? 'http://localhost:3000'
        : 'https://black-shore-frontend.vercel.app'

    console.log(`[DEBUG] Frontend URL terpilih: ${frontendUrl}`)

    return c.redirect(`${frontendUrl}?connected=true&email=${encodeURIComponent(email)}`)
})

// GET /auth/status?userId=xxx
authRoutes.get('/status', async (c) => {
    const userId = c.req.query('userId')
    if (!userId) {
        return c.json({ connected: false, reason: 'no_user_id' })
    }

    const stored = await c.env.OAUTH_KV.get(`oauth:google:${userId}`)
    if (!stored) {
        return c.json({ connected: false })
    }

    const data = JSON.parse(stored)
    return c.json({
        connected: true,
        email: data.email,
        connected_at: data.connected_at,
    })
})

// POST /auth/disconnect?userId=xxx
authRoutes.post('/disconnect', async (c) => {
    const userId = c.req.query('userId')
    if (!userId) {
        return c.json({ error: 'missing_user_id' }, 400)
    }

    await c.env.OAUTH_KV.delete(`oauth:google:${userId}`)
    return c.json({ success: true })
})