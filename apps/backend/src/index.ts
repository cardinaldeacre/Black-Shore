import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { listTransaksi, createTransaksi, getSummary } from './lib/db'
import { spreadsheetRoutes } from './routes/spreadsheet'

export type Bindings = {
    ENVIRONMENT: string
    black_shore_db: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', logger())
app.use('*', cors({
    origin: ['http://localhost:3000'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}))

app.get('/', (c) => {
    return c.json({
        name: 'Black Shore',
        version: '0.1.0',
        status: 'ok',
        environment: c.env.ENVIRONMENT,
        timestamp: new Date().toISOString(),
    })
})

app.get('/health', (c) => c.json({ status: 'healthy' }))

// Transaksi
app.get('/api/transactions', async (c) => {
    const bulan = c.req.query('bulan')
    const limit = c.req.query('limit') ? Number(c.req.query('limit')) : undefined
    const data = await listTransaksi(c.env.black_shore_db, { bulan, limit })
    return c.json({ data })
})

app.post('/api/transactions', async (c) => {
    const body = await c.req.json()
    const data = await createTransaksi(c.env.black_shore_db, body)
    return c.json({ data }, 201)
})

// Summary
app.get('/api/summary', async (c) => {
    const bulan = c.req.query('bulan') ?? new Date().toISOString().slice(0, 7)
    const data = await getSummary(c.env.black_shore_db, bulan)
    return c.json({ data })
})

// Spreadsheet (HTML untuk iframe)
app.route('/api/spreadsheet', spreadsheetRoutes)

app.notFound((c) => c.json({ error: 'Not Found', path: c.req.path }, 404))

app.onError((err, c) => {
    console.error(`[Black Shore] Error:`, err)
    return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

export default app