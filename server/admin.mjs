import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { digest,emailSchema,passwordSchema,randomToken,standardUserRoles,transaction } from './access.mjs'
import { HttpError,kinds,paging,pickContent,slug,statuses,storeMedia,token,upload,uuid } from './public.mjs'

const sessionName = 'pn_cg_session'
const cookieOptions = secure => ({httpOnly:true,secure,sameSite:'strict',path:'/api'})
const getCookie = req => req.headers.cookie?.split(';').map(item=>item.trim()).find(item=>item.startsWith(sessionName+'='))?.slice(sessionName.length+1)
const login = z.object({email:emailSchema,password:z.string().min(1).max(72).refine(value=>Buffer.byteLength(value)<=72)})
const dummyHash = '$2b$12$220FywosQvcH7Z9IuF6q4OzrqtQJfGZ.uTl6JG9LV.UPrlmtxOVAi'
const accessFor = kind => ({
  page:'pages',faq:'pages',menu:'settings',homepage:'settings',social:'settings',document:'documents',
  gallery:'media',video:'media',milestone:'pages',consultation:'submissions',job:'submissions',
})[kind] || 'editorial'
const text = max => z.string().trim().max(max).default('')
const link = z.string().max(2048).refine(url => !url || /^https:\/\/[^\s]+$/i.test(url) || /^\/(?![\/\\])[^\s\\]*$/.test(url), 'Use a local path or an HTTPS link.').default('')
const dateTime = z.iso.datetime({offset:true}).nullable().default(null)
const contentSchema = z.object({
  kind:z.enum(kinds),slug,title:z.string().trim().min(2).max(180),subtitle:text(300),body:text(45000),category:text(80),author:text(120),
  tags:z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  image_id:uuid.nullable().default(null),file_id:uuid.nullable().default(null),url:link,seo_title:text(80),seo_description:text(180),
  milestone_status:text(60),event_date:z.iso.date().nullable().default(null),deadline:dateTime,
  position:z.number().int().min(-1000).max(1000).default(0),
  status:z.enum(['draft','published','archived']).default('draft'),published_at:dateTime,
}).refine(x=>x.status!=='published'||!['job','consultation'].includes(x.kind)||x.deadline,'A deadline is required.')
const settingSchema=z.object({
  publicEmail:z.union([emailSchema,z.literal('')]).optional(),
  footerNote:z.string().max(350).optional(),heroTitle:z.string().max(100).optional(),heroSummary:z.string().max(280).optional(),
})
const permission = (req,key) => {
  if (!req.staff.permissions.includes(key)) throw new HttpError(403,'You do not have permission for this action.')
}
const queueConfig = {
  enquiries:{permission:'enquiries',table:'enquiries',columns:'id,name,email,phone,subject,category,body,status,created_at,consent_at'},
  submissions:{permission:'submissions',table:'submissions',columns:'id,content_id,kind,name,email,category,body,file_id,status,created_at,consent_at'},
  subscribers:{permission:'newsletter',table:'subscribers',columns:'id,email,consent_at,confirmed_at,unsubscribed_at'},
}
const archiveSchema=z.object({ids:z.array(uuid).min(1).max(50),status:z.enum(['draft','archived'])})
const byQueue = req => {
  const key=z.enum(Object.keys(queueConfig)).parse(req.params.queue)
  const config=queueConfig[key]
  permission(req,config.permission)
  return config
}
const csvCell = value => {
  const s=String(value??'')
  return '"'+(/^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'
}
const writeCsv = (res,name,items,columns) => {
  res.attachment(name+'.csv').type('text/csv')
  res.write(columns.map(csvCell).join(',')+'\r\n')
  for (const item of items) res.write(columns.map(key=>csvCell(item[key])).join(',')+'\r\n')
  res.end()
}
const audit=(db,actor,action,target)=>db.query('INSERT INTO audit_logs(actor,action,target) VALUES($1,$2,$3)',[actor,action,target])

export function registerAdmin(app,{db,secret,limit,secure,flags,send,emailReady,frontendUrl}) {
  app.post('/api/auth/login',limit('login',15,900),async (req,res) => {
    const item=login.parse(req.body)
    const outcome=await transaction(db,async client => {
      const {rows:[user]}=await client.query('SELECT id,password_hash,active,locked_until,failures FROM users WHERE email=$1 FOR UPDATE',[item.email])
      const good=await bcrypt.compare(item.password,user?.password_hash??dummyHash)
      if (!user?.active || (user.locked_until && new Date(user.locked_until)>new Date())) return null
      if (!good) {
        const failures=user.locked_until ? 1 : user.failures+1
        await client.query("UPDATE users SET failures=$1,locked_until=CASE WHEN $1>=6 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=$2",[failures,user.id])
        await audit(client,user.id,'login.failed','account')
        return null
      }
      const session=randomToken()
      const prior=getCookie(req)
      if (prior && token.safeParse(prior).success) await client.query('DELETE FROM sessions WHERE token_hash=$1',[digest(secret,prior)])
      await client.query('UPDATE users SET failures=0,locked_until=NULL WHERE id=$1',[user.id])
      await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(secret,session),user.id])
      await audit(client,user.id,'login.success','account')
      return session
    })
    if (!outcome) throw new HttpError(401,'Invalid credentials or the account is temporarily locked.')
    res.cookie(sessionName,outcome,{...cookieOptions(secure),maxAge:8*3600*1000}).json({signedIn:true})
  })
  app.post('/api/auth/reset-request',limit('reset-request',5,3600),async (req,res) => {
    if (!emailReady) return res.status(202).json({received:true})
    const email=emailSchema.parse(req.body.email)
    const {rows:[user]}=await db.query('SELECT id FROM users WHERE active AND email=$1',[email])
    if (user) {
      const code=randomToken()
      await db.query("INSERT INTO password_resets(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[digest(secret,code),user.id])
      const url=new URL('/admin/reset#token='+code,frontendUrl)
      void send(email,'Reset your administrator password',url.href).catch(()=>console.warn('Password reset email failed'))
    }
    res.status(202).json({received:true})
  })
  app.post('/api/auth/reset',limit('reset',8,900),async (req,res) => {
    const {token:code,password}=z.object({token,password:passwordSchema}).parse(req.body)
    const hash=await bcrypt.hash(password,12)
    const complete=await transaction(db,async client=>{
      const {rows:[reset]}=await client.query('SELECT user_id FROM password_resets WHERE token_hash=$1 AND expires_at>now()',[digest(secret,code)])
      if (!reset) return false
      const account=await client.query('SELECT id FROM users WHERE id=$1 AND active FOR UPDATE',[reset.user_id])
      if (!account.rowCount) return false
      const consumed=await client.query('DELETE FROM password_resets WHERE token_hash=$1 AND expires_at>now() RETURNING user_id',[digest(secret,code)])
      if (!consumed.rowCount) return false
      await client.query('UPDATE users SET password_hash=$1,failures=0,locked_until=NULL WHERE id=$2',[hash,reset.user_id])
      await client.query('DELETE FROM sessions WHERE user_id=$1',[reset.user_id])
      await client.query('DELETE FROM password_resets WHERE user_id=$1',[reset.user_id])
      await audit(client,reset.user_id,'password.reset','account')
      return true
    })
    if (!complete) throw new HttpError(404,'This reset link is invalid or expired.')
    res.clearCookie(sessionName,cookieOptions(secure)).json({changed:true})
  })
  app.use('/api/admin',async(req,res,next)=>{
    const code=getCookie(req)
    if (!token.safeParse(code).success) throw new HttpError(401,'Sign in to continue.')
    const {rows:[staff]}=await db.query(
      "SELECT u.id,u.email,COALESCE(array_agg(DISTINCT ur.role) FILTER(WHERE ur.role IS NOT NULL),'{}') AS roles,COALESCE(array_agg(DISTINCT rp.permission) FILTER(WHERE rp.permission IS NOT NULL),'{}') AS permissions FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN role_permissions rp ON rp.role=ur.role WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active GROUP BY u.id",
      [digest(secret,code)],
    )
    if (!staff) throw new HttpError(401,'Sign in to continue.')
    req.staff=staff
    req.sessionToken=code
    next()
  })
  app.get('/api/admin/session',(req,res)=>res.json(req.staff))
  app.post('/api/admin/logout',async(req,res)=>{
    await db.query('DELETE FROM sessions WHERE token_hash=$1',[digest(secret,req.sessionToken)])
    res.clearCookie(sessionName,cookieOptions(secure)).json({signedIn:false})
  })
  app.get('/api/admin/overview',async(req,res)=>{
    const allowed=kinds.filter(kind=>req.staff.permissions.includes(accessFor(kind)))
    const content=await db.query("SELECT kind,status,count(*)::integer AS count FROM content WHERE deleted_at IS NULL AND kind=ANY($1::text[]) GROUP BY kind,status",[allowed])
    const counts={}
    for (const [name,config] of Object.entries(queueConfig)) {
      if (req.staff.permissions.includes(config.permission)) counts[name]=(await db.query('SELECT count(*)::integer AS count FROM '+config.table)).rows[0].count
    }
    res.json({content:content.rows,...counts})
  })
  app.get('/api/admin/content',async(req,res)=>{
    const {page,limit:count,q}=paging.parse(req.query)
    const kind=z.enum(kinds).optional().parse(req.query.kind)
    const allowed=kind ? [kind] : kinds.filter(item=>req.staff.permissions.includes(accessFor(item)))
    if (kind) permission(req,accessFor(kind))
    const values=[allowed,q,count,(page-1)*count]
    const where="deleted_at IS NULL AND kind=ANY($1::text[]) AND ($2='' OR title ILIKE '%' || $2 || '%')"
    const {rows}=await db.query("SELECT "+pickContent+" FROM content WHERE "+where+" ORDER BY updated_at DESC LIMIT $3 OFFSET $4",values)
    const {rows:[total]}=await db.query("SELECT count(*)::integer AS count FROM content WHERE "+where,values.slice(0,2))
    res.json({items:rows,total:total.count,page})
  })
  async function saveContent(req,res) {
    const item=contentSchema.parse(req.body)
    const id=req.params.id?uuid.parse(req.params.id):null
    permission(req,accessFor(item.kind))
    if (item.status!=='draft') permission(req,'publish')
    if ((item.kind==='job'&&!flags.recruitment || item.kind==='consultation'&&!flags.consultation) && item.status==='published') throw new HttpError(403,'This section is not authorized for publication.')
    const columns=Object.keys(item)
    const params=Object.values(item)
    params[columns.indexOf('published_at')]=item.status==='published' ? item.published_at??new Date().toISOString() : item.published_at
    const row=await transaction(db,async client=>{
      if (id) {
        const {rows:[current]}=await client.query('SELECT kind,status FROM content WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])
        if (!current) throw new HttpError(404,'Content not found.')
        permission(req,accessFor(current.kind))
        if (current.status==='published') permission(req,'publish')
        if (current.kind!==item.kind) throw new HttpError(400,'Content type cannot change.')
      }
      for (const [assetId,format] of [[item.image_id,'image/'],[item.file_id,'application/pdf']]) {
        if (!assetId) continue
        const {rowCount}=await client.query("SELECT 1 FROM media WHERE id=$1 AND purpose='library' AND mime LIKE $2",[assetId,format+'%'])
        if (!rowCount) throw new HttpError(400,'Select an upload of the correct type.')
      }
      const assignments=columns.map((key,i)=>key+'=$'+(i+1)).join(',')
      const placeholders=columns.map((_,i)=>'$'+(i+1)).join(',')
      const {rows:[saved]}=id
        ? await client.query('UPDATE content SET '+assignments+',updated_at=now() WHERE id=$'+(params.length+1)+' RETURNING id',[...params,id])
        : await client.query('INSERT INTO content('+columns.join(',')+') VALUES('+placeholders+') RETURNING id',params)
      if (item.status==='published' && (item.image_id || item.file_id)) {
        await client.query('UPDATE media SET public=true WHERE id=ANY($1::uuid[])',[[item.image_id,item.file_id].filter(Boolean)])
      }
      await audit(client,req.staff.id,id?'content.update':'content.create',saved.id)
      return saved
    })
    res.status(id?200:201).json(row)
  }
  app.post('/api/admin/content',saveContent)
  app.put('/api/admin/content/:id',saveContent)
  app.post('/api/admin/content/bulk',async(req,res)=>{
    permission(req,'publish')
    const {ids,status}=archiveSchema.parse(req.body)
    await transaction(db,async client=>{
      const {rows}=await client.query('SELECT id,kind FROM content WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL FOR UPDATE',[ids])
      for (const row of rows) permission(req,accessFor(row.kind))
      await client.query('UPDATE content SET status=$1,updated_at=now() WHERE id=ANY($2::uuid[])',[status,rows.map(row=>row.id)])
      for (const row of rows) await audit(client,req.staff.id,'content.bulk.'+status,row.id)
    })
    res.json({saved:true})
  })
  app.delete('/api/admin/content/:id',async(req,res)=>{
    permission(req,'publish')
    const id=uuid.parse(req.params.id)
    await transaction(db,async client=>{
      const {rows:[item]}=await client.query('SELECT kind FROM content WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[id])
      if (!item) throw new HttpError(404,'Content not found.')
      permission(req,accessFor(item.kind))
      await client.query('UPDATE content SET deleted_at=now(),updated_at=now() WHERE id=$1',[id])
      await audit(client,req.staff.id,'content.delete',id)
    })
    res.status(204).end()
  })
  app.get('/api/admin/media',async(req,res)=>{
    permission(req,'media')
    const {q,page,limit:count}=paging.parse(req.query)
    const {rows}=await db.query("SELECT id,name,mime,size,downloads,created_at FROM media WHERE purpose='library' AND name ILIKE '%' || $1 || '%' ORDER BY created_at DESC LIMIT $2 OFFSET $3",[q,count,(page-1)*count])
    const {rows:[total]}=await db.query("SELECT count(*)::integer AS count FROM media WHERE purpose='library' AND name ILIKE '%' || $1 || '%'",[q])
    res.json({items:rows,total:total.count,page})
  })
  app.post('/api/admin/media',(req,_res,next)=>{permission(req,'media');next()},limit('media',25,900),upload,async(req,res)=>{
    if (!req.file) throw new HttpError(400,'Select a file.')
    const item=await transaction(db,async client=>{
      const asset=await storeMedia(client,req.file,'library')
      await audit(client,req.staff.id,'media.upload',asset.id)
      return asset
    })
    res.status(201).json(item)
  })
  app.delete('/api/admin/media/:id',async(req,res)=>{
    permission(req,'media')
    const id=uuid.parse(req.params.id)
    await transaction(db,async client=>{
      const result=await client.query("DELETE FROM media m WHERE id=$1 AND purpose='library' AND NOT EXISTS(SELECT 1 FROM content WHERE deleted_at IS NULL AND (image_id=m.id OR file_id=m.id))",[id])
      if (!result.rowCount) throw new HttpError(409,'Remove references to this upload before deleting it.')
      await audit(client,req.staff.id,'media.delete',id)
    })
    res.status(204).end()
  })
  app.get('/api/admin/media/:id',async(req,res)=>{
    const id=uuid.parse(req.params.id)
    const scope=[]
    if(req.staff.permissions.includes('media')) scope.push('library')
    if(req.staff.permissions.includes('submissions')) scope.push('consultation','application')
    const {rows:[asset]}=await db.query('SELECT name,mime,bytes,purpose FROM media WHERE id=$1 AND purpose=ANY($2::text[])',[id,scope])
    if (!asset) throw new HttpError(404,'File not found.')
    if (asset.purpose!=='library' || !asset.mime.startsWith('image/')) res.attachment(asset.name)
    res.type(asset.mime).send(asset.bytes)
  })
  app.get('/api/admin/settings',async(req,res)=>{
    permission(req,'settings')
    const {rows}=await db.query('SELECT key,value FROM settings ORDER BY key')
    res.json({settings:Object.fromEntries(rows.map(row=>[row.key,row.value])),flags})
  })
  app.put('/api/admin/settings',async(req,res)=>{
    permission(req,'settings')
    const input=settingSchema.parse(req.body)
    await transaction(db,async client=>{
      for (const [key,value] of Object.entries(input)) await client.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()',[key,JSON.stringify(value)])
      await audit(client,req.staff.id,'settings.update','site')
    })
    res.json({saved:true})
  })
  app.get('/api/admin/users',async(req,res)=>{
    permission(req,'users')
    const {page,limit:count,q}=paging.parse(req.query)
    const {rows}=await db.query("SELECT u.id,u.email,u.active,u.created_at,COALESCE(array_agg(ur.role) FILTER(WHERE ur.role IS NOT NULL),'{}') AS roles FROM users u LEFT JOIN user_roles ur ON u.id=ur.user_id WHERE u.email ILIKE '%' || $1 || '%' GROUP BY u.id ORDER BY u.created_at DESC LIMIT $2 OFFSET $3",[q,count,(page-1)*count])
    const {rows:[total]}=await db.query("SELECT count(*)::integer AS count FROM users WHERE email ILIKE '%' || $1 || '%'",[q])
    res.json({items:rows,total:total.count,page})
  })
  const userUpdate=z.object({roles:z.array(z.enum(standardUserRoles)).min(1).max(standardUserRoles.length),active:z.boolean().default(true)})
  app.post('/api/admin/users',async(req,res)=>{
    permission(req,'users')
    const item=userUpdate.extend({email:emailSchema,password:passwordSchema}).parse(req.body)
    const hash=await bcrypt.hash(item.password,12)
    await transaction(db,async client=>{
      const {rows:[user]}=await client.query('INSERT INTO users(email,password_hash,active) VALUES($1,$2,$3) RETURNING id',[item.email,hash,item.active])
      await client.query('INSERT INTO user_roles(user_id,role) SELECT $1,unnest($2::text[])',[user.id,[...new Set(item.roles)]])
      await audit(client,req.staff.id,'user.create',user.id)
    })
    res.status(201).json({saved:true})
  })
  app.put('/api/admin/users/:id',async(req,res)=>{
    permission(req,'users')
    const id=uuid.parse(req.params.id)
    const item=userUpdate.parse(req.body)
    await transaction(db,async client=>{
      const found=await client.query("SELECT id FROM users WHERE id=$1 AND NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id=$1 AND role='Super Administrator') FOR UPDATE",[id])
      if (!found.rowCount) throw new HttpError(404,'Editable user not found.')
      await client.query('UPDATE users SET active=$1 WHERE id=$2',[item.active,id])
      await client.query('DELETE FROM user_roles WHERE user_id=$1',[id])
      await client.query('INSERT INTO user_roles(user_id,role) SELECT $1,unnest($2::text[])',[id,[...new Set(item.roles)]])
      await client.query('DELETE FROM sessions WHERE user_id=$1',[id])
      await audit(client,req.staff.id,'user.update',id)
    })
    res.json({saved:true})
  })
  app.get('/api/admin/audit',async(req,res)=>{
    permission(req,'audit')
    const {page,limit:count}=paging.parse(req.query)
    const {rows}=await db.query('SELECT id,actor,action,target,created_at FROM audit_logs ORDER BY id DESC LIMIT $1 OFFSET $2',[count,(page-1)*count])
    const {rows:[total]}=await db.query('SELECT count(*)::integer AS count FROM audit_logs')
    res.json({items:rows,total:total.count,page})
  })
  app.get('/api/admin/queue/:queue',async(req,res)=>{
    const config=byQueue(req)
    const {page,limit:count,q}=paging.parse(req.query)
    const status=z.enum(statuses).optional().parse(req.query.status)
    const order=config.table==='subscribers'?'consent_at':'created_at'
    const where="email ILIKE '%' || $1 || '%'"+(status&&config.table!=='subscribers'?' AND status=$4':'')
    const extras=status&&config.table!=='subscribers'?[status]:[]
    const {rows}=await db.query('SELECT '+config.columns+' FROM '+config.table+' WHERE '+where+' ORDER BY '+order+' DESC LIMIT $2 OFFSET $3',[q,count,(page-1)*count,...extras])
    const countWhere=where.replace('status=$4','status=$2')
    const {rows:[total]}=await db.query('SELECT count(*)::integer AS count FROM '+config.table+' WHERE '+countWhere,[q,...extras])
    res.json({items:rows,total:total.count,page})
  })
  app.get('/api/admin/queue/:queue/export',limit('export',5,900),async(req,res)=>{
    const config=byQueue(req)
    const {rows}=await db.query('SELECT '+config.columns+' FROM '+config.table+' ORDER BY id LIMIT 10001')
    if (rows.length>10000) throw new HttpError(409,'More than 10,000 records. Use a managed database export.')
    await audit(db,req.staff.id,'queue.export',config.table)
    writeCsv(res,config.table,rows,config.columns.split(','))
  })
  app.put('/api/admin/queue/:queue/:id',async(req,res)=>{
    const config=byQueue(req)
    if (config.table==='subscribers') throw new HttpError(405,'Subscriber consent is managed by the subscriber.')
    const id=uuid.parse(req.params.id)
    const status=z.enum(statuses).parse(req.body.status)
    await transaction(db,async client=>{
      const result=await client.query('UPDATE '+config.table+' SET status=$1 WHERE id=$2',[status,id])
      if (!result.rowCount) throw new HttpError(404,'Record not found.')
      await audit(client,req.staff.id,'queue.update',id)
    })
    res.json({saved:true})
  })
  app.delete('/api/admin/queue/:queue/:id',async(req,res)=>{
    const config=byQueue(req)
    const id=uuid.parse(req.params.id)
    await transaction(db,async client=>{
      const returning=config.table==='submissions'?'file_id':'id'
      const {rows:[item]}=await client.query('DELETE FROM '+config.table+' WHERE id=$1 RETURNING '+returning,[id])
      if (!item) throw new HttpError(404,'Record not found.')
      if (item.file_id) await client.query("DELETE FROM media WHERE id=$1 AND purpose<>'library'",[item.file_id])
      await audit(client,req.staff.id,'queue.delete',id)
    })
    res.status(204).end()
  })
  app.get('/api/admin/enquiry-notes/:id',async(req,res)=>{
    permission(req,'enquiries')
    const {rows}=await db.query('SELECT id,author_id,body,created_at FROM enquiry_notes WHERE enquiry_id=$1 ORDER BY created_at DESC LIMIT 100',[uuid.parse(req.params.id)])
    res.json({items:rows})
  })
  app.post('/api/admin/enquiry-notes/:id',async(req,res)=>{
    permission(req,'enquiries')
    const id=uuid.parse(req.params.id)
    const body=z.string().trim().min(2).max(3000).parse(req.body.body)
    await transaction(db,async client=>{
      const found=await client.query('SELECT id FROM enquiries WHERE id=$1 FOR SHARE',[id])
      if (!found.rowCount) throw new HttpError(404,'Enquiry not found.')
      await client.query('INSERT INTO enquiry_notes(enquiry_id,author_id,body) VALUES($1,$2,$3)',[id,req.staff.id,body])
      await audit(client,req.staff.id,'enquiry.note',id)
    })
    res.status(201).json({saved:true})
  })
}
