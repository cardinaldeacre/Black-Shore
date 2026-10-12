import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

// ============================================================
// Black Shore — Backend Agent
// ============================================================

export type Bindings = {
    ENVIRONMENT: string
    black_shore_db: D1Database
    // Akan ditambahkan:
    // GEMINI_API_KEY: string
    // SUPABASE_URL: string
    // SUPABASE_KEY: string
    // OAUTH_KV: KVNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
    origin: ['http://localhost:3000', 'https://black-shore.vercel.app'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}))

// Health check
app.get('/', (c) => {
    return c.json({
        name: 'Black Shore',
        version: '0.1.0',
        status: 'ok',
        environment: c.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
    })
})

app.get('/health', (c) => {
    return c.json({ status: 'healthy' })
})

// Placeholder routes — akan diisi nanti
app.get('/api/transactions', (c) => {
    return c.json({ message: 'TODO: list transactions', data: [] })
})

app.post('/api/chat', (c) => {
    return c.json({ message: 'TODO: chat endpoint', reply: 'Not implemented yet' })
})

// 404 handler
app.notFound((c) => {
    return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

// Error handler
app.onError((err, c) => {
    console.error(`[Black Shore] Error:`, err)
    return c.json({
        error: 'Internal Server Error',
        message: err.message,
    }, 500)
})

export default app