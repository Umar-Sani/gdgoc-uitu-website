import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

// Supabase's pooler (Supavisor) presents a chain rooted in "Supabase Root 2021 CA",
// which is not in Node's default trust store — that is why validating against the
// system CAs fails with SELF_SIGNED_CERT_IN_CHAIN (BUG-012). Rather than switching
// validation off, trust exactly that root: the public certificate is committed at
// backend/certs/ and resolves the same from src/ (ts-node) and dist/ (compiled).
// DATABASE_SSL_CA (PEM contents) overrides it, e.g. for a self-hosted Postgres.
function buildSsl() {
  const ca =
    process.env.DATABASE_SSL_CA ||
    fs.readFileSync(path.join(__dirname, '..', '..', 'certs', 'supabase-prod-ca-2021.crt'), 'utf8')
  return { ca, rejectUnauthorized: true }
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
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