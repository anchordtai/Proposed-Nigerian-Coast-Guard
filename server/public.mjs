import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { z } from 'zod'
import { digest, emailSchema, randomToken, transaction } from './access.mjs'

export const kinds = ['page','article','news','press','advisory','statement','document','faq','announcement','milestone','gallery','video','consultation','job','menu','homepage','social','journal']
export const statuses = ['new','reviewed','in_progress','resolved','archived']
export const categories = ['General enquiry','Maritime safety','Public information','Media enquiry','Legislative information','Partnership enquiry','Environmental concern','Other']
export const published = "deleted_at IS NULL AND status='published' AND published_at<=now()"
export const pickContent = "id,kind,slug,title,subtitle,body,category,author,tags,image_id,file_id,url,seo_title,seo_description,milestone_status,event_date,deadline,position,status,published_at,updated_at"
export const uuid = z.uuid()
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)
export const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
export const paging = z.object({
  page:z.coerce.number().int().min(1).max(1000).default(1),
  limit:z.coerce.number().int().min(1).max(50).default(12),
  q:z.string().trim().max(120).default(''),
  category:z.string().trim().max(80).default(''),
})
const journalFilters = paging.extend({
  tag:z.string().trim().max(40).default(''),
})
const title = z.string().trim().min(2).max(180)
const optional = max => z.string().trim().max(max).default('')
const check = z.union([z.literal(true),z.literal('true')])
const formSchema = z.object({name:z.string().trim().min(2).max(100),email:emailSchema,consent:check,website:optional(250)})
const contactSchema = formSchema.extend({
  phone:optional(30),subject:title,category:z.enum(categories),body:z.string().trim().min(10).max(5000),
})
const signupSchema=z.object({email:emailSchema,consent:check,website:optional(250)})

export const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:9,parts:11,fieldSize:6000}}).single('file')

export async function storeMedia(db, file, purpose, publicAsset = false) {
  if (!file) return null
  const detected = await fileTypeFromBuffer(file.buffer)
  const allowed = purpose === 'library' ? ['image/png','image/jpeg','image/webp','application/pdf'] : ['application/pdf']
  if (!allowed.includes(detected?.mime)) throw new HttpError(400, 'Unsupported file format.')
  const safeName = file.originalname.replace(/[^a-zA-Z0-9_. -]/g, '_').slice(0,140) || 'document'
  const { rows:[asset] } = await db.query(
    'INSERT INTO media(name,mime,bytes,size,purpose,public) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,name,mime,size,public',
    [safeName,detected.mime,file.buffer,file.size,purpose,publicAsset],
  )
  return asset
}

export class HttpError extends Error {
  constructor(status,message) { super(message); this.status = status }
}
const disabled = (enabled,message) => { if (!enabled) throw new HttpError(403,message) }
const textVector = "to_tsvector('english'::regconfig,title || ' ' || subtitle || ' ' || body || ' ' || category)"
const escapeXml = value => value.replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;',
})[char]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g,'')
const linkWithToken = (url, path, code) => new URL(path + '#token=' + encodeURIComponent(code),url).href

export function registerPublic(app,{db,flags,limit,secret,send,frontendUrl,notifyTo,emailReady}) {
  const visible = kinds.filter(kind => (kind !== 'job' || flags.recruitment) && (kind !== 'consultation' || flags.consultation))
  app.get('/api/config',async (_,res) => {
    const {rows} = await db.query("SELECT key,value FROM settings WHERE key IN ('publicEmail','footerNote','heroTitle','heroSummary')")
    res.json({...flags,settings:Object.fromEntries(rows.map(row => [row.key,row.value]))})
  })
  app.get('/api/content',async (req,res) => {
    const {page,limit:count,q,category,tag}=journalFilters.parse(req.query)
    const requested = z.enum(kinds).optional().parse(req.query.kind)
    if (requested && !visible.includes(requested)) return res.json({items:[],total:0,page})
    const publicKinds = kinds.filter(kind => !['menu','homepage','social','job','consultation'].includes(kind))
    const params=[requested ? [requested] : publicKinds,q,category,tag,count,(page-1)*count]
    const where=published+" AND kind=ANY($1::text[]) AND ($2='' OR "+textVector+" @@ websearch_to_tsquery('english',$2) OR strpos(lower(title),lower($2))>0 OR strpos(lower(array_to_string(tags,' ')),lower($2))>0) AND ($3='' OR category=$3) AND ($4='' OR tags @> ARRAY[$4]::text[])"
    const result=await db.query("SELECT "+pickContent+",(SELECT size FROM media WHERE id=content.file_id) AS file_size FROM content WHERE "+where+" ORDER BY CASE WHEN $2='' THEN position ELSE 0 END,published_at DESC,id LIMIT $5 OFFSET $6",params)
    const total=await db.query("SELECT count(*)::integer AS count FROM content WHERE "+where,params.slice(0,4))
    res.json({items:result.rows,total:total.rows[0].count,page})
  })
  app.get('/api/journal/topics',async (_req,res) => {
    const where=published+" AND kind='journal'"
    const {rows}=await db.query(
      "SELECT 'category' AS type,category AS value FROM content WHERE "+where+" AND category<>'' GROUP BY category "+
      "UNION ALL SELECT 'tag' AS type,t.value FROM content CROSS JOIN LATERAL unnest(tags) AS t(value) WHERE "+where+
      " GROUP BY t.value ORDER BY value LIMIT 500",
    )
    res.json({categories:rows.filter(row=>row.type==='category').map(row=>row.value),
      tags:rows.filter(row=>row.type==='tag').map(row=>row.value)})
  })
  app.get('/api/journal/feed.xml',async (_req,res) => {
    const {rows}=await db.query("SELECT slug,title,subtitle,published_at FROM content WHERE "+published+
      " AND kind='journal' ORDER BY published_at DESC,id LIMIT 25")
    const home=escapeXml(new URL('/journal',frontendUrl).href)
    const self=escapeXml(new URL('/api/journal/feed.xml',frontendUrl).href)
    const items=rows.map(row=>{
      const url=escapeXml(new URL('/journal/'+row.slug,frontendUrl).href)
      return '<item><title>'+escapeXml(row.title)+'</title><link>'+url+'</link><guid>'+url+'</guid>'+
        '<description>'+escapeXml(row.subtitle)+'</description><pubDate>'+new Date(row.published_at).toUTCString()+'</pubDate></item>'
    }).join('')
    res.type('application/rss+xml').send('<?xml version="1.0" encoding="UTF-8"?>'+
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>Maritime Journal</title><link>'+home+
      '</link><description>Articles from the Provisional Committee for the Establishment of the Nigerian Coast Guard (PC-NCG)</description>'+
      '<atom:link href="'+self+'" rel="self" type="application/rss+xml"/>'+items+'</channel></rss>')
  })
  app.get('/api/content/:kind/:slug',async (req,res) => {
    const kind=z.enum(kinds).parse(req.params.kind)
    const key=slug.parse(req.params.slug)
    const {rows:[item]}=visible.includes(kind) ? await db.query(
      "SELECT "+pickContent+",(SELECT size FROM media WHERE id=content.file_id) AS file_size FROM content WHERE "+published+" AND kind=$1 AND slug=$2",[kind,key]
    ) : {rows:[]}
    if (!item) throw new HttpError(404,'Content not found.')
    res.json(item)
  })
  app.get('/api/media/:id',async (req,res) => {
    const id=uuid.parse(req.params.id)
    const {rows:[asset]}=await db.query(
      "SELECT name,mime,bytes FROM media WHERE id=$1 AND public AND purpose='library' AND EXISTS (SELECT 1 FROM content WHERE "+published+" AND kind=ANY($2::text[]) AND (image_id=$1 OR file_id=$1))",[id,visible],
    )
    if (!asset) throw new HttpError(404,'File not found.')
    if (!asset.mime.startsWith('image/')) {
      await db.query('UPDATE media SET downloads=downloads+1 WHERE id=$1',[id])
      res.attachment(asset.name)
    }
    res.set('Content-Type',asset.mime).set('Cache-Control','public, max-age=60').send(asset.bytes)
  })
  app.post('/api/enquiries',limit('enquiry',6,3600),async (req,res) => {
    disabled(flags.engagement,'Public enquiries are currently closed.')
    const item=contactSchema.parse(req.body)
    if (item.website) return res.status(202).json({received:true})
    const {rows:[row]}=await db.query(
      'INSERT INTO enquiries(name,email,phone,subject,category,body) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
      [item.name,item.email,item.phone,item.subject,item.category,item.body],
    )
    if (emailReady && notifyTo) void send(notifyTo,'New website enquiry','A new enquiry is available in the admin dashboard. Reference: '+row.id).catch(() => console.warn('Enquiry notification failed'))
    res.status(201).json({received:true,reference:row.id})
  })
  app.post('/api/newsletter',limit('newsletter',6,3600),async (req,res) => {
    disabled(flags.newsletter,'Newsletter signup is currently closed.')
    const item=signupSchema.parse(req.body)
    if (!item.website) {
      const code=randomToken()
      const {rowCount}=await db.query(
        "INSERT INTO subscribers(email,confirmation_hash,confirmation_expires_at) VALUES($1,$2,now()+interval '24 hours') ON CONFLICT(email) DO UPDATE SET confirmation_hash=excluded.confirmation_hash,confirmation_expires_at=excluded.confirmation_expires_at,consent_at=now() WHERE subscribers.confirmed_at IS NULL OR subscribers.unsubscribed_at IS NOT NULL",
        [item.email,digest(secret,code)],
      )
      if (rowCount) await send(item.email,'Confirm your maritime newsletter subscription',linkWithToken(frontendUrl,'/newsletter/confirm',code))
    }
    res.status(202).json({received:true})
  })
  app.post('/api/newsletter/confirm',limit('confirm',12,900),async (req,res) => {
    disabled(flags.newsletter,'Newsletter signup is currently closed.')
    const code=token.parse(req.body.token)
    const unsubscribeCode=randomToken()
    const {rows:[item]}=await db.query(
      'UPDATE subscribers SET confirmed_at=now(), confirmation_hash=NULL, confirmation_expires_at=NULL, unsubscribed_at=NULL, unsubscribe_hash=$2 WHERE confirmation_hash=$1 AND confirmation_expires_at>now() RETURNING email',
      [digest(secret,code),digest(secret,unsubscribeCode)],
    )
    if (!item) throw new HttpError(404,'This confirmation link has expired or has already been used.')
    try {
      await send(item.email,'Subscription confirmed','You are subscribed. To leave the newsletter, use '+linkWithToken(frontendUrl,'/newsletter/unsubscribe',unsubscribeCode))
    } catch {
      await db.query("UPDATE subscribers SET confirmed_at=NULL,unsubscribe_hash=NULL WHERE email=$1 AND unsubscribe_hash=$2",[item.email,digest(secret,unsubscribeCode)])
      throw new HttpError(503,'Email delivery failed. Please sign up again later.')
    }
    res.json({confirmed:true})
  })
  app.post('/api/newsletter/unsubscribe',limit('unsubscribe',12,900),async (req,res) => {
    const code=token.parse(req.body.token)
    const {rowCount}=await db.query('UPDATE subscribers SET unsubscribed_at=now(), unsubscribe_hash=NULL WHERE unsubscribe_hash=$1',[digest(secret,code)])
    if (!rowCount) throw new HttpError(404,'This link is invalid or has already been used.')
    res.json({unsubscribed:true})
  })
  app.post('/api/intake/:kind/:slug',limit('intake',4,3600),(req,_res,next) => {
    const kind=z.enum(['consultation','job']).parse(req.params.kind)
    disabled(kind === 'job' ? flags.recruitment : flags.consultation,'Submissions are currently closed.')
    next()
  },upload,async (req,res) => {
    const intakeSchema=formSchema.extend({category:optional(80),body:z.string().trim().min(10).max(5000)})
    const item=intakeSchema.parse(req.body)
    if (item.website) return res.status(202).json({received:true})
    const kind=req.params.kind
    const purpose=kind === 'job' ? 'application' : 'consultation'
    const code=randomToken()
    const reference=await transaction(db,async client => {
      const {rows:[topic]}=await client.query("SELECT id FROM content WHERE "+published+" AND kind=$1 AND slug=$2 AND deadline>now() FOR SHARE",[kind,slug.parse(req.params.slug)])
      if (!topic) throw new HttpError(404,'This submission window is closed.')
      const asset=await storeMedia(client,req.file,purpose)
      const {rows:[row]}=await client.query(
        'INSERT INTO submissions(content_id,kind,name,email,category,body,file_id,tracking_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [topic.id,purpose,item.name,item.email,item.category,item.body,asset?.id??null,digest(secret,code)],
      )
      return row.id
    })
    if (emailReady) void send(item.email,'Submission received','Your reference: '+reference+'\nYour private tracking code: '+code).catch(() => console.warn('Submission acknowledgement failed'))
    res.status(201).json({received:true,reference,trackingCode:code})
  })
  app.post('/api/application-status',limit('tracking',8,900),async (req,res) => {
    const code=token.parse(req.body.token)
    const {rows:[row]}=await db.query("SELECT id,status,created_at FROM submissions WHERE tracking_hash=$1 AND kind='application'",[digest(secret,code)])
    if (!row) throw new HttpError(404,'Application not found.')
    res.json(row)
  })
}
