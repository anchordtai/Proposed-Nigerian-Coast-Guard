import express from 'express'
import helmet from 'helmet'
import multer from 'multer'
import nodemailer from 'nodemailer'
import pg from 'pg'
import { z } from 'zod'
import { pathToFileURL } from 'node:url'
import { digest,bootstrap } from './access.mjs'
import { HttpError,registerPublic } from './public.mjs'
import { registerAdmin } from './admin.mjs'
import { migrate } from './migrate.mjs'

export function createApp(db,env=process.env,sendOverride) {
  const production=env.NODE_ENV==='production'
  const secret=z.string().min(32).parse(env.SERVER_SECRET)
  const frontendUrl=new URL(env.FRONTEND_URL||'http://localhost:5173')
  if (production && frontendUrl.protocol!=='https:') throw new Error('Production requires an HTTPS FRONTEND_URL')
  const frontendOrigin=frontendUrl.origin
  const emailReady=Boolean((env.SMTP_HOST||env.RESEND_API_KEY)&&env.EMAIL_FROM)
  const flags={
    engagement:env.ENGAGEMENT_ENABLED==='true',
    newsletter:env.NEWSLETTER_ENABLED==='true'&&emailReady,
    consultation:env.CONSULTATION_AUTHORIZED==='true',
    recruitment:env.RECRUITMENT_AUTHORIZED==='true',
  }
  const transport=emailReady&&env.SMTP_HOST?nodemailer.createTransport({
    host:env.SMTP_HOST,port:Number(env.SMTP_PORT||587),secure:Number(env.SMTP_PORT)===465,
    requireTLS:production&&Number(env.SMTP_PORT)!==465,
    auth:env.SMTP_USER?{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}:undefined,
    connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,
  }):null
  async function sendEmail(to,subject,text){
    if(!env.RESEND_API_KEY) return transport.sendMail({from:env.EMAIL_FROM,to,subject,text})
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(12000),
      headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text}),
    })
    if(!response.ok) throw new HttpError(503,'Email delivery is temporarily unavailable.')
  }
  const send=sendOverride||sendEmail
  const app=express()
  app.disable('x-powered-by')
  if (production) app.set('trust proxy',1)
  app.use(helmet({crossOriginResourcePolicy:{policy:'same-origin'}}))
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store')
    if (req.headers.origin===frontendOrigin) {
      res.set('Access-Control-Allow-Origin',frontendOrigin)
      res.set('Access-Control-Allow-Credentials','true')
      res.set('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS')
      res.set('Access-Control-Allow-Headers','Content-Type')
      res.vary('Origin')
    }
    if (req.method==='OPTIONS') return res.sendStatus(req.headers.origin===frontendOrigin?204:403)
    if (!['GET','HEAD'].includes(req.method) && req.headers.origin!==frontendOrigin) {
      return res.status(403).json({error:'Request origin not allowed.'})
    }
    const allowedType=req.is('application/json')||req.is('multipart/form-data')||!req.headers['content-length']||req.headers['content-length']==='0'
    if (!['GET','HEAD','DELETE'].includes(req.method)&&!allowedType) return res.status(415).json({error:'Unsupported request format.'})
    next()
  })
  app.use(express.json({limit:'90kb'}))
  const limit=(action,max,seconds)=>async(req,res,next)=>{
    const now=Math.floor(Date.now()/1000)
    const expires=Math.floor(now/seconds)*seconds+seconds
    const bucket=digest(secret,action+':'+req.ip+':'+expires)
    const {rows:[row]}=await db.query('INSERT INTO rate_limits(bucket,count,expires_at) VALUES($1,1,to_timestamp($2)) ON CONFLICT(bucket) DO UPDATE SET count=rate_limits.count+1 RETURNING count',[bucket,expires])
    if (row.count>max) {
      res.set('Retry-After',String(expires-now))
      return res.status(429).json({error:'Too many requests. Try again later.'})
    }
    next()
  }
  app.get('/api/health',async(_req,res)=>{
    await db.query('SELECT 1')
    res.json({status:'ok',database:'ready'})
  })
  registerPublic(app,{db,flags,limit,secret,send,frontendUrl,notifyTo:env.ENQUIRY_NOTIFY_TO,emailReady})
  registerAdmin(app,{db,flags,limit,secret,send,frontendUrl,emailReady,secure:production})
  app.use((_req,res)=>res.status(404).json({error:'Route not found.'}))
  app.use((error,_req,res,_next)=>{
    if(error instanceof HttpError) return res.status(error.status).json({error:error.message})
    if(error instanceof z.ZodError) return res.status(400).json({error:error.issues.map(x=>(x.path.length?x.path.join('.')+': ':'')+x.message).join(' ')})
    if(error instanceof multer.MulterError) return res.status(400).json({error:'Upload rejected. Only one file up to 5 MB is allowed.'})
    if(error.code==='23505') return res.status(409).json({error:'A record with these details already exists.'})
    if(error.type==='entity.too.large') return res.status(413).json({error:'Request too large.'})
    if(error.type==='entity.parse.failed') return res.status(400).json({error:'Invalid request body.'})
    console.error('Request failed',error.code||error.name)
    res.status(500).json({error:'The service could not complete this request.'})
  })
  return app
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const db=new pg.Pool({connectionString:process.env.DATABASE_URL,max:7,connectionTimeoutMillis:10000})
  db.on('error',error=>console.error('Database background error',error.code||error.name))
  const client=await db.connect()
  try { await migrate(client) } finally { client.release() }
  await bootstrap(db,process.env.BOOTSTRAP_ADMIN_EMAIL,process.env.BOOTSTRAP_ADMIN_PASSWORD)
  const app=createApp(db)
  const clean=()=>db.query("DELETE FROM rate_limits WHERE expires_at<now(); DELETE FROM sessions WHERE expires_at<now(); DELETE FROM password_resets WHERE expires_at<now(); DELETE FROM subscribers WHERE confirmed_at IS NULL AND confirmation_expires_at<now()-interval '7 days'").catch(error=>console.error('Cleanup failed',error.code||error.name))
  void clean()
  const interval=setInterval(clean,3600000)
  interval.unref()
  const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Coast Guard API ready'))
  process.once('SIGTERM',()=>server.close(()=>void db.end()))
}
