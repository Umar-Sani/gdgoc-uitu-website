import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connected successfully')
}).catch((err) => {
  console.log('⚠️  Database not connected:', err.message)
})

export default pool