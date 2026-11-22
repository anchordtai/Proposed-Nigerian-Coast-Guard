import bcrypt from 'bcryptjs'
import { createHmac, randomBytes } from 'node:crypto'
import { z } from 'zod'

export const roles = {
  'Super Administrator': ['users','settings','pages','publish','editorial','media','documents','enquiries','newsletter','submissions','audit'],
  Administrator: ['settings','pages','publish','editorial','media','documents','enquiries','newsletter','submissions','audit'],
  Editor: ['publish','editorial','pages','media'],
  'Communications Officer': ['editorial','media','newsletter'],
  'Content Manager': ['pages','media'],
  'Public Engagement Officer': ['enquiries','submissions'],
  'Document Manager': ['documents','media'],
}

export const standardUserRoles = Object.keys(roles).filter(role => role !== 'Super Administrator')
export const randomToken = () => randomBytes(32).toString('base64url')
export const digest = (secret, value) => createHmac('sha256', secret).update(value).digest('hex')
export const emailSchema = z.email().max(254).transform(value => value.toLowerCase())
export const passwordSchema = z.string().min(14).max(72)
  .refine(value => Buffer.byteLength(value) <= 72, 'Password must occupy at most 72 bytes')
export const userSchema = z.object({email: emailSchema, password: passwordSchema})

export async function seedRoles(db) {
  for (const permission of new Set(Object.values(roles).flat())) {
    await db.query('INSERT INTO permissions(name) VALUES($1) ON CONFLICT DO NOTHING', [permission])
  }
  for (const [name, permissions] of Object.entries(roles)) {
    await db.query('INSERT INTO roles(name) VALUES($1) ON CONFLICT DO NOTHING', [name])
    for (const permission of permissions) {
      await db.query('INSERT INTO role_permissions(role, permission) VALUES($1,$2) ON CONFLICT DO NOTHING', [name, permission])
    }
  }
}

export async function transaction(db, work) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function bootstrap(db, rawEmail, rawPassword) {
  await seedRoles(db)
  if (!rawPassword) return
  const {email, password} = userSchema.parse({email:rawEmail, password:rawPassword})
  await transaction(db, async client => {
    await client.query('SELECT pg_advisory_xact_lock(458292)')
    if ((await client.query("SELECT 1 FROM user_roles WHERE role='Super Administrator' LIMIT 1")).rowCount) return
    const {rows:[user]} = await client.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id', [email, await bcrypt.hash(password, 12)])
    await client.query("INSERT INTO user_roles(user_id,role) VALUES($1,'Super Administrator')", [user.id])
  })
}
