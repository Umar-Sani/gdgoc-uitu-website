import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import eventsRouter from './routes/events';

dotenv.config()

import './db/client'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
}))
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

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`)
})

export default app