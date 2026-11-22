import { readdir, readFile } from 'node:fs/promises'
import pg from 'pg'
import { pathToFileURL } from 'node:url'

export async function migrate(client) {
  await client.query('BEGIN')
  try {
    await client.query('SELECT pg_advisory_xact_lock(458291)')
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    const folder = new URL('./migrations/', import.meta.url)
    for (const name of (await readdir(folder)).filter(name => name.endsWith('.sql')).sort()) {
      if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) continue
      await client.query(await readFile(new URL(name, folder), 'utf8'))
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try { await migrate(client) } finally { await client.end() }
}
