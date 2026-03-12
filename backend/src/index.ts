import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import eventsRouter from './routes/events';
import paymentsRouter from './routes/payments';
import forumRouter from './routes/forum';

dotenv.config()

import './db/client'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ─── IMPORTANT: Stripe webhook needs raw body for signature verification ─────
// This must be registered BEFORE express.json() middleware
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// All other routes use JSON parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: PORT
  })
})

app.use('/api/events', eventsRouter);
app.use('/api/forum', forumRouter);
app.use('/api/payments', paymentsRouter);

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`)
})

export default app