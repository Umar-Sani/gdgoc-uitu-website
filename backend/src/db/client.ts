import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase's pooler (Supavisor) presents a cert chain Node can't fully verify —
  // encryption still applies, this only skips CA validation. See Supabase's own
  // Node/pg connection docs, which recommend the same for hosted connections.
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connected successfully')
}).catch((err) => {
  console.log('⚠️  Database not connected:', err.message)
})

// Without this handler, an idle client dropped by the network or recycled by
// Supabase's pooler emits an unhandled 'error' event on the Pool, which Node
// treats as a fatal uncaught exception and kills the whole process (TODO-006).
// The pool already replaces the dead client on its next checkout — logging is
// all that's needed here.
pool.on('error', (err) => {
  console.error('⚠️  Unexpected error on idle database client:', err.message)
})

export default pool