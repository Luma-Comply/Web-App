import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import 'dotenv/config'
import { generateRoute } from './routes/generate.js'

const app = new Hono()

// Logging
app.use('*', logger())

// CORS — for direct access (not needed when proxied through Next.js, but good for testing)
app.use('*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'luma-generation', timestamp: new Date().toISOString() }))

// Generation route
app.route('/generate', generateRoute)

// Start server
const port = Number(process.env.PORT || 3001)
console.log(`Luma Generation Service running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
