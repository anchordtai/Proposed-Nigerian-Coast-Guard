import assert from 'node:assert/strict'
import { after,before,test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { createApp } from '../server/index.mjs'
import { migrate } from '../server/migrate.mjs'
import { bootstrap } from '../server/access.mjs'

const env={
  FRONTEND_URL:'http://localhost:5173',SERVER_SECRET:'this-is-a-local-test-secret-never-use-in-production',
  ENGAGEMENT_ENABLED:'true',NEWSLETTER_ENABLED:'true',SMTP_HOST:'test.invalid',EMAIL_FROM:'test@example.com',
}
const email='admin@example.com'
const password='a strong example password'
const sent=[]
let sql,db,server,base,admin,editor

before(async ()=>{
  sql=new PGlite()
  const {rows}=await sql.query('SELECT 1 AS ready')
  assert.equal(rows[0].ready,1)
  const query=async(text,values)=>{
    if (text.includes(';\n')) return await sql.exec(text)
    const result=await sql.query(text,values)
    return {...result,rowCount:result.affectedRows||result.rows.length}
  }
  db={query,connect:async()=>({query,release(){}})}
  await migrate(db)
  await migrate(db)
  await bootstrap(db,email)
  assert.equal((await db.query('SELECT count(*)::integer AS total FROM users')).rows[0].total,0)
  await bootstrap(db,email,password)
  server=createApp(db,env,async(to,subject,text)=>{sent.push({to,subject,text})}).listen(0,'127.0.0.1')
  await new Promise(resolve=>server.once('listening',resolve))
  base='http://127.0.0.1:'+server.address().port+'/api'
})
after(async()=>{
  if(server)await new Promise(resolve=>server.close(resolve))
  await sql?.close()
})
async function call(path,{method='GET',body,cookie,origin=env.FRONTEND_URL}={}){
  const headers={origin}
  if(cookie)headers.cookie=cookie
  if(body&&! (body instanceof FormData)){
    headers['content-type']='application/json'
    body=JSON.stringify(body)
  }
  const response=await fetch(base+path,{method,headers,body})
  const payload=response.headers.get('content-type')?.includes('json')?await response.json():await response.text()
  return {status:response.status,headers:response.headers,payload}
}
async function login(mail,pass){
  const response=await call('/auth/login',{method:'POST',body:{email:mail,password:pass}})
  assert.equal(response.status,200,JSON.stringify(response.payload))
  const cookie=response.headers.get('set-cookie')
  assert.match(cookie,/HttpOnly/)
  assert.match(cookie,/SameSite=Strict/)
  return cookie.split(';')[0]
}

test('health and configuration work, staff routes require a session, activation is closed',async()=>{
  assert.equal((await call('/health')).payload.database,'ready')
  const result=await call('/config')
  assert.equal(result.status,200)
  assert.equal(result.payload.consultation,false)
  assert.equal(result.payload.recruitment,false)
  assert.equal((await call('/admin/overview')).status,401)
  assert.equal((await call('/intake/job/fake',{method:'POST',body:new FormData()})).status,403)
  assert.equal((await call('/intake/consultation/fake',{method:'POST',body:new FormData()})).status,403)
})
test('admin login, staff creation and role enforcement',async()=>{
  assert.equal((await call('/auth/login',{method:'POST',body:{email,password:'bad password'}})).status,401)
  admin=await login(email,password)
  const actor=await call('/admin/session',{cookie:admin})
  assert.ok(actor.payload.roles.includes('Super Administrator'))
  const add=await call('/admin/users',{method:'POST',cookie:admin,body:{email:'engagement@example.com',password,roles:['Public Engagement Officer']}})
  assert.equal(add.status,201,JSON.stringify(add.payload))
  editor=await login('engagement@example.com',password)
  assert.equal((await call('/admin/users',{cookie:editor})).status,403)
  assert.equal((await call('/admin/queue/enquiries',{cookie:editor})).status,200)
  assert.equal((await call('/admin/content',{cookie:editor,method:'POST',body:{kind:'article',slug:'restricted',title:'Restricted'}})).status,403)
  assert.equal((await call('/admin/settings',{cookie:admin,method:'PUT',origin:'https://untrusted.invalid',body:{publicEmail:'attacker@example.com'}})).status,403)
})
test('drafts, scheduled publication, search and scope-gated jobs',async()=>{
  let result=await call('/admin/content',{method:'POST',cookie:admin,body:{kind:'article',slug:'coastal-safety',title:'Coastal safety basics',body:'A life jacket may help save lives.',status:'draft'}})
  assert.equal(result.status,201,JSON.stringify(result.payload))
  const id=result.payload.id
  assert.equal((await call('/content/article/coastal-safety')).status,404)
  result=await call('/admin/content/'+id,{method:'PUT',cookie:admin,body:{kind:'article',slug:'coastal-safety',title:'Coastal safety basics',body:'A life jacket may help save lives.',status:'published',published_at:'2099-01-01T00:00:00.000Z'}})
  assert.equal(result.status,200,JSON.stringify(result.payload))
  assert.equal((await call('/content/article/coastal-safety')).status,404)
  result=await call('/admin/content/'+id,{method:'PUT',cookie:admin,body:{kind:'article',slug:'coastal-safety',title:'Coastal safety basics',body:'A life jacket may help save lives.',status:'published'}})
  assert.equal(result.status,200,JSON.stringify(result.payload))
  assert.equal((await call('/content/article/coastal-safety')).status,200)
  assert.equal((await call('/content?q=jacket')).payload.total,1)
  assert.equal((await call('/content?q='+encodeURIComponent("' OR 1=1 --"))).payload.total,0)
  assert.equal((await call('/admin/content',{method:'POST',cookie:admin,body:{kind:'job',slug:'test-job',title:'Test job',status:'published',deadline:'2099-01-01T00:00:00.000Z'}})).status,403)
  assert.equal((await call('/admin/content/bulk',{method:'POST',cookie:admin,body:{ids:[id],status:'archived'}})).status,200)
  assert.equal((await call('/content/article/coastal-safety')).status,404)
})
test('journal filters, paging and RSS use only published postings',async()=>{
  const slug='journal-test'
  const values={kind:'journal',slug,title:'Coast & <harbour>',subtitle:'Reader’s notes about the coast',
    body:'A sample public journal entry.',category:'Test journal category',tags:['Field notes']}
  assert.equal((await call('/admin/content',{method:'POST',cookie:editor,body:values})).status,403)
  const saved=await call('/admin/content',{method:'POST',cookie:admin,body:values})
  assert.equal(saved.status,201,JSON.stringify(saved.payload))
  const id=saved.payload.id
  const find='/content?kind=journal&tag=Field+notes&category=Test+journal+category'
  assert.equal((await call(find)).payload.total,0)
  assert.equal((await call('/content/journal/'+slug)).status,404)
  assert.ok(!(await call('/journal/topics')).payload.tags.includes('Field notes'))
  assert.doesNotMatch((await call('/journal/feed.xml')).payload,/journal-test/)
  const publish=body=>call('/admin/content/'+id,{method:'PUT',cookie:admin,body:{...values,status:'published',...body}})
  assert.equal((await publish({published_at:'2099-01-01T00:00:00.000Z'})).status,200)
  assert.equal((await call(find)).payload.total,0)
  assert.equal((await publish({})).status,200)
  const result=await call(find)
  assert.equal(result.payload.total,1)
  assert.equal(result.payload.items[0].slug,slug)
  assert.equal((await call(find+'&page=2')).payload.items.length,0)
  assert.equal((await call('/content?q=Field+notes')).payload.items[0].slug,slug)
  const topics=await call('/journal/topics')
  assert.ok(topics.payload.tags.includes('Field notes'))
  assert.ok(topics.payload.categories.includes('Test journal category'))
  const feed=await call('/journal/feed.xml')
  assert.match(feed.headers.get('content-type'),/^application\/rss\+xml/)
  assert.match(feed.payload,/Coast &amp; &lt;harbour&gt;/)
  assert.match(feed.payload,/http:\/\/localhost:5173\/journal\/journal-test/)
  assert.equal((await call('/admin/content/'+id,{method:'DELETE',cookie:admin})).status,204)
  assert.equal((await call('/content/journal/'+slug)).status,404)
  assert.doesNotMatch((await call('/journal/feed.xml')).payload,/journal-test/)
})
test('upload restrictions, private file authorization, document publishing and download count',async()=>{
  const fake=new FormData()
  fake.set('file',new Blob(['<script>bad</script>'],{type:'text/html'}),'bad.html')
  assert.equal((await call('/admin/media',{method:'POST',cookie:admin,body:fake})).status,400)
  const pdf=new FormData()
  pdf.set('file',new Blob(['%PDF-1.7\nExample only\n%%EOF'],{type:'application/pdf'}),'test.pdf')
  const file=await call('/admin/media',{method:'POST',cookie:admin,body:pdf})
  assert.equal(file.status,201,JSON.stringify(file.payload))
  assert.equal((await call('/media/'+file.payload.id)).status,404)
  assert.equal((await call('/admin/media/'+file.payload.id,{cookie:editor})).status,404)
  const doc=await call('/admin/content',{method:'POST',cookie:admin,body:{kind:'document',slug:'test-document',title:'Test publication',status:'published',file_id:file.payload.id}})
  assert.equal(doc.status,201,JSON.stringify(doc.payload))
  const result=await call('/media/'+file.payload.id)
  assert.equal(result.status,200)
  assert.match(result.headers.get('content-disposition'),/^attachment/)
  assert.equal((await call('/admin/media',{cookie:admin})).payload.items[0].downloads,1)
})
test('private enquiries validate, filter, log notes and redact from public responses',async()=>{
  const body={name:'Example Name',email:'test@example.com',subject:'A public enquiry',category:'General enquiry',body:'Please provide general information.',consent:true}
  assert.equal((await call('/enquiries',{method:'POST',body:{...body,consent:false}})).status,400)
  const added=await call('/enquiries',{method:'POST',body})
  assert.equal(added.status,201,JSON.stringify(added.payload))
  const id=added.payload.reference
  assert.equal((await call('/admin/queue/enquiries?status=new',{cookie:editor})).payload.total,1)
  assert.equal((await call('/admin/queue/enquiries/'+id,{cookie:editor,method:'PUT',body:{status:'reviewed'}})).status,200)
  assert.equal((await call('/admin/enquiry-notes/'+id,{cookie:editor,method:'POST',body:{body:'Internal note.'}})).status,201)
  assert.equal((await call('/admin/enquiry-notes/'+id,{cookie:editor})).payload.items.length,1)
  assert.equal((await call('/content?q='+encodeURIComponent('Example Name'))).payload.total,0)
  const report=await call('/admin/queue/enquiries/export',{cookie:editor})
  assert.match(report.payload,/Example Name/)
  for(let i=0;i<4;i++)await call('/enquiries',{method:'POST',body:{...body,website:'bot'}})
  assert.equal((await call('/enquiries',{method:'POST',body})).status,429)
})
test('newsletter double opt-in, one-time confirmation and unsubscribe',async()=>{
  const body={email:'subscriber@example.com',consent:true}
  assert.equal((await call('/newsletter',{method:'POST',body})).status,202)
  const token=entry=>new URLSearchParams(entry.text.split('#')[1]).get('token')
  const confirm=token(sent.at(-1))
  assert.ok(confirm)
  assert.equal((await call('/newsletter/confirm',{method:'POST',body:{token:confirm}})).status,200)
  assert.equal((await call('/newsletter/confirm',{method:'POST',body:{token:confirm}})).status,404)
  const unsubscribe=token(sent.at(-1))
  assert.equal((await call('/newsletter/unsubscribe',{method:'POST',body:{token:unsubscribe}})).status,200)
  const subscription=(await call('/admin/queue/subscribers',{cookie:admin})).payload.items[0]
  assert.ok(subscription.confirmed_at)
  assert.ok(subscription.unsubscribed_at)
})
test('password reset invalidates existing sessions and one-time tokens',async()=>{
  await call('/auth/reset-request',{method:'POST',body:{email}})
  await new Promise(resolve=>setTimeout(resolve,25))
  const code=new URLSearchParams(sent.at(-1).text.split('#')[1]).get('token')
  const result=await call('/auth/reset',{method:'POST',body:{token:code,password:password+' changed'}})
  assert.equal(result.status,200,JSON.stringify(result.payload))
  assert.equal((await call('/admin/session',{cookie:admin})).status,401)
  assert.equal((await call('/auth/reset',{method:'POST',body:{token:code,password:password+' changed'}})).status,404)
})
