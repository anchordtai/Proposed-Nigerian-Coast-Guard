import pg from 'pg'
import { bootstrap } from './access.mjs'

if (!process.env.DATABASE_URL || !process.env.BOOTSTRAP_ADMIN_EMAIL || !process.env.BOOTSTRAP_ADMIN_PASSWORD) {
  throw new Error('DATABASE_URL, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required')
}
const db = new pg.Pool({connectionString:process.env.DATABASE_URL})
try { await bootstrap(db, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD) }
finally { await db.end() }
