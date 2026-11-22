import {type FormEvent,type ReactNode,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {BookOpen,ClipboardList,FileText,ImagePlus,LayoutDashboard,LogOut,Mail,Settings,Users} from 'lucide-react'
import {apiRoot,assetUrl,params,post,request,useApi,type Asset,type Config,type Item,type Page,type Staff} from './api'
import {exportUrl} from './forms'
import {Notice,PageHeader,Pagination,RichText,SearchField,prettyDate,useSeo} from './ui'

const failure=(reason:unknown)=>reason instanceof Error?reason.message:'The request failed.'
const kinds:Record<string,string>={
  page:'pages',faq:'pages',menu:'settings',homepage:'settings',social:'settings',document:'documents',gallery:'media',video:'media',
  milestone:'pages',consultation:'submissions',job:'submissions',article:'editorial',news:'editorial',press:'editorial',statement:'editorial',advisory:'editorial',announcement:'editorial',
}
const labels:Record<string,string>={faq:'FAQs',milestone:'Legislative timeline',job:'Job opportunities',homepage:'Homepage sections',consultation:'Consultations',menu:'Navigation links',social:'Social links',press:'Press releases'}
const statusOptions=['new','reviewed','in_progress','resolved','archived']
const staffRoles=['Administrator','Editor','Communications Officer','Content Manager','Public Engagement Officer','Document Manager']
const toLocalDate=(value?:string|null)=>value?new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60_000).toISOString().slice(0,16):''
const toIso=(value:FormDataEntryValue|null)=>value?new Date(String(value)).toISOString():null

function useAction(){
  const [state,setState]=useState({busy:false,message:'',error:''})
  async function act(fn:()=>Promise<void>,message=''){
    setState({busy:true,message:'',error:''})
    try{await fn();setState({busy:false,message,error:''})}
    catch(reason){setState({busy:false,message:'',error:failure(reason)})}
  }
  return {...state,act}
}
function Feedback({state}:{state:{message:string;error:string}}){
  return <>{state.message&&<p className="form-feedback" role="status">{state.message}</p>}{state.error&&<p className="form-feedback error" role="alert">{state.error}</p>}</>
}
function Login({onLogin}:{onLogin:()=>void}){
  const [reset,setReset]=useState(false)
  const action=useAction()
  return <section className="section wrap narrow"><form className="form-card" onSubmit={event=>{
    event.preventDefault()
    const data=Object.fromEntries(new FormData(event.currentTarget))
    void action.act(async()=>{await request(reset?'/auth/reset-request':'/auth/login',post(data));if(!reset)onLogin()},reset?'If email delivery is configured and the account exists, a reset link will be sent.':'')
  }}><h2>{reset?'Request a password reset':'Administrator sign-in'}</h2><label>Email<input autoComplete="username" name="email" type="email" required/></label>
  {!reset&&<label>Password<input autoComplete="current-password" name="password" type="password" required/></label>}
  <div className="action-row"><button className="button dark" disabled={action.busy}>{reset?'Send reset link':'Sign in'}</button><button className="button outline" type="button" onClick={()=>setReset(!reset)}>{reset?'Back to sign-in':'Forgot password'}</button></div>
  <Feedback state={action}/></form></section>
}
function ResultState({loading,error,length}:{loading:boolean;error?:string;length:number}){
  return loading?<p role="status">Loading…</p>:error?<Notice>{error}</Notice>:!length?<Notice>No records match this view.</Notice>:null
}
function Dialog({title,children,close}:{title:string;children:ReactNode;close:()=>void}){
  const ref=useRef<HTMLDialogElement>(null)
  return <dialog className="dialog" ref={node=>{ref.current=node;if(node&&!node.open)node.showModal()}} onCancel={event=>{event.preventDefault();close()}}><div className="dialog-heading"><h2>{title}</h2><button className="button outline compact" onClick={close}>Close</button></div>{children}</dialog>
}

function ContentEditor({item,allowed,staff,close,done}:{item?:Item;allowed:string[];staff:Staff;close:()=>void;done:()=>void}){
  const [kind,setKind]=useState(item?.kind||allowed[0]||'page')
  const [body,setBody]=useState(item?.body||'')
  const [preview,setPreview]=useState(false)
  const [assets,setAssets]=useState({image_id:item?.image_id||'',file_id:item?.file_id||''})
  const bodyRef=useRef<HTMLTextAreaElement>(null)
  const action=useAction()
  const uploads=useAction()
  const publish=staff.permissions.includes('publish')
  const mayUpload=staff.permissions.includes('media')
  function format(before:string,after=''){
    const start=bodyRef.current?.selectionStart??body.length
    const end=bodyRef.current?.selectionEnd??body.length
    setBody(body.slice(0,start)+before+(body.slice(start,end)||'Text')+after+body.slice(end))
    bodyRef.current?.focus()
  }
  function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const data=new FormData(event.currentTarget)
    const strings=['slug','title','subtitle','category','author','url','seo_title','seo_description','milestone_status']
    const values=Object.fromEntries(strings.map(key=>[key,String(data.get(key)||'')]))
    void action.act(async()=>{
      await request('/admin/content'+(item?'/'+item.id:''),post({
        ...values,kind,body,status:String(data.get('status')||'draft'),
        position:Number(data.get('position')||0),event_date:data.get('event_date')||null,
        deadline:toIso(data.get('deadline')),published_at:toIso(data.get('published_at')),
        tags:String(data.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean),
        image_id:assets.image_id||null,file_id:assets.file_id||null,
      },item?'PUT':'POST'))
      done()
    })
  }
  function upload(field:'image_id'|'file_id',file?:File){
    if(!file)return
    void uploads.act(async()=>{
      const data=new FormData();data.append('file',file)
      const asset=await request<Asset>('/admin/media',{method:'POST',body:data})
      setAssets(prev=>({...prev,[field]:asset.id}))
    },'File uploaded. Save the item to attach it.')
  }
  return <Dialog title={item?'Edit content':'Create content'} close={close}>
    <form className="editor-form" onSubmit={save}>
      <div className="field-grid"><label>Content type<select value={kind} disabled={Boolean(item)} onChange={e=>setKind(e.target.value)}>{allowed.map(value=><option key={value} value={value}>{labels[value]||value}</option>)}</select></label><label>Visibility<select name="status" defaultValue={item?.status||'draft'}><option value="draft">Draft / unpublished</option>{publish&&<><option value="published">Published / scheduled</option><option value="archived">Archived</option></>}</select></label></div>
      <label>Title<input name="title" defaultValue={item?.title} maxLength={180} required/></label>
      <div className="field-grid"><label>URL slug<input name="slug" defaultValue={item?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} placeholder="example-public-update" required/></label><label>Category<input name="category" defaultValue={item?.category} maxLength={80}/></label></div>
      <label>Subtitle<input name="subtitle" defaultValue={item?.subtitle} maxLength={300}/></label>
      <div className="field-grid"><label>Author<input name="author" defaultValue={item?.author} maxLength={120}/></label><label>Tags, comma separated<input name="tags" defaultValue={item?.tags.join(', ')}/></label></div>
      <label htmlFor="editor-body">Content</label>
      <div className="toolbar"><button type="button" onClick={()=>format('**','**')}>Bold</button><button type="button" onClick={()=>format('*','*')}>Italic</button><button type="button" onClick={()=>format('\n## ')}>Heading</button><button type="button" onClick={()=>format('\n- ')}>List</button><button type="button" onClick={()=>format('[','](https://)')}>Link</button><button type="button" aria-pressed={preview} onClick={()=>setPreview(!preview)}>{preview?'Edit':'Preview'}</button></div>
      {preview?<div className="preview"><RichText>{body||'No content yet.'}</RichText></div>:<textarea id="editor-body" ref={bodyRef} value={body} onChange={e=>setBody(e.target.value)} rows={9} maxLength={45000}/>}
      <div className="field-grid"><label>Link<input name="url" defaultValue={item?.url} placeholder="https://… or /about" maxLength={2048}/></label><label>Display order<input type="number" name="position" defaultValue={item?.position??0} min={-1000} max={1000}/></label></div>
      <div className="field-grid"><label>SEO title<input name="seo_title" maxLength={80} defaultValue={item?.seo_title}/></label><label>SEO description<input name="seo_description" maxLength={180} defaultValue={item?.seo_description}/></label></div>
      <div className="field-grid"><label>Publish date and time <small>(local time)</small><input type="datetime-local" name="published_at" defaultValue={toLocalDate(item?.published_at)}/></label>
      {['consultation','job'].includes(kind)&&<label>Submission deadline <small>(local time)</small><input type="datetime-local" name="deadline" defaultValue={toLocalDate(item?.deadline)}/></label>}</div>
      {kind==='milestone'&&<div className="field-grid"><label>Event date<input type="date" name="event_date" defaultValue={item?.event_date||''}/></label><label>Stage status<input name="milestone_status" defaultValue={item?.milestone_status} maxLength={60}/></label></div>}
      <div className="field-grid"><label>Featured image asset ID<input value={assets.image_id} onChange={e=>setAssets({...assets,image_id:e.target.value})}/></label><label>PDF asset ID<input value={assets.file_id} onChange={e=>setAssets({...assets,file_id:e.target.value})}/></label></div>
      {mayUpload&&<div className="field-grid"><label>Upload image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload('image_id',e.target.files?.[0])}/></label><label>Upload PDF<input type="file" accept="application/pdf" onChange={e=>upload('file_id',e.target.files?.[0])}/></label></div>}
      {assets.image_id&&mayUpload&&<img className="asset-preview" src={assetUrl(assets.image_id,true)} alt="Featured image preview"/>}
      <Feedback state={uploads}/><Feedback state={action}/><div className="action-row"><button className="button dark" disabled={action.busy||uploads.busy}>Save content</button><button type="button" className="button outline" onClick={close}>Cancel</button></div>
    </form>
  </Dialog>
}

function Content({staff}:{staff:Staff}){
  const [q,setQ]=useState('')
  const [kind,setKind]=useState('')
  const [page,setPage]=useState(1)
  const [revision,rev]=useState(0)
  const [edit,setEdit]=useState<Item|'new'|null>(null)
  const [selected,setSelected]=useState<string[]>([])
  const [confirm,setConfirm]=useState<{label:string;fn:()=>Promise<unknown>}|null>(null)
  const action=useAction()
  const allowed=Object.keys(kinds).filter(key=>staff.permissions.includes(kinds[key]))
  const publish=staff.permissions.includes('publish')
  const result=useApi<Page<Item>>('/admin/content'+params({q,kind,page,limit:12}),revision)
  const refresh=()=>{rev(n=>n+1);setSelected([])}
  return <><div className="admin-heading"><h2>Content management</h2><button className="button dark" onClick={()=>setEdit('new')}>Create content</button></div>
    <SearchField label="Search content" onSearch={value=>{setQ(value);setPage(1);setSelected([])}}/>
    <div className="filter-row"><label className="inline-field">Type<select value={kind} onChange={e=>{setKind(e.target.value);setPage(1);setSelected([])}}><option value="">All types</option>{allowed.map(type=><option key={type} value={type}>{labels[type]||type}</option>)}</select></label>
    {publish&&selected.length>0&&<button className="button outline compact" onClick={()=>setConfirm({label:'Archive selected items',fn:()=>request('/admin/content/bulk',post({ids:selected,status:'archived'}))})}>Archive {selected.length}</button>}</div>
    <ResultState {...result} length={result.data?.total||0}/>
    {result.data?.items.length?<div className="table-wrap"><table><thead><tr>{publish&&<th scope="col">Select</th>}<th scope="col">Title</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>
      {result.data.items.map(item=><tr key={item.id}>{publish&&<td><input aria-label={'Select '+item.title} type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(e.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/></td>}<td>{item.title}</td><td>{labels[item.kind]||item.kind}</td><td>{item.status==='published'&&item.published_at&&new Date(item.published_at)>new Date()?'scheduled':item.status}</td><td className="table-actions"><button className="button outline compact" disabled={item.status==='published'&&!publish} onClick={()=>setEdit(item)}>Edit</button>{publish&&<button className="button outline compact" onClick={()=>setConfirm({label:'Delete '+item.title,fn:()=>request('/admin/content/'+item.id,{method:'DELETE'})})}>Delete</button>}</td></tr>)}
    </tbody></table></div>:null}
    <Pagination page={page} limit={12} total={result.data?.total||0} setPage={n=>{setPage(n);setSelected([])}}/>
    {edit&&<ContentEditor key={typeof edit==='string'?edit:edit.id} item={typeof edit==='string'?undefined:edit} allowed={allowed} staff={staff} close={()=>setEdit(null)} done={()=>{setEdit(null);refresh()}}/>}
    {confirm&&<Dialog title={confirm.label} close={()=>setConfirm(null)}><p>Confirm this change to the selected content.</p><button className="button dark" disabled={action.busy} onClick={()=>void action.act(async()=>{await confirm.fn();setConfirm(null);refresh()})}>Confirm change</button><Feedback state={action}/></Dialog>}
  </>
}

function Media(){
  const [q,setQ]=useState('')
  const [page,setPage]=useState(1)
  const [revision,rev]=useState(0)
  const [selected,setSelected]=useState<Asset>()
  const result=useApi<Page<Asset>>('/admin/media'+params({q,page,limit:12}),revision)
  const action=useAction()
  return <><h2>Media library</h2><SearchField label="Search media" onSearch={value=>{setQ(value);setPage(1)}}/>
  <form className="inline-form" onSubmit={event=>{
    event.preventDefault()
    const form=event.currentTarget
    const data=new FormData(form)
    void action.act(async()=>{await request('/admin/media',{method:'POST',body:data});form.reset();rev(n=>n+1)},'Upload saved.')
  }}><label>Image or PDF, up to 5 MB<input name="file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" required/></label><button className="button dark" disabled={action.busy}><ImagePlus size={16}/> Upload</button></form>
  <Feedback state={action}/><ResultState {...result} length={result.data?.total||0}/>
  {(result.data?.items||[]).map(asset=><div className="admin-record" key={asset.id}>
    {asset.mime.startsWith('image/')&&<img className="asset-preview" src={assetUrl(asset.id,true)} alt=""/>}
    <div><a href={assetUrl(asset.id,true)}>{asset.name}</a><p>Asset ID <code>{asset.id}</code></p><small>{Math.round(asset.size/1024)} KB · {asset.downloads} downloads</small></div>
    <button className="button outline compact" onClick={()=>setSelected(asset)}>Delete</button>
  </div>)}
  <Pagination page={page} limit={12} total={result.data?.total||0} setPage={setPage}/>
  {selected&&<Dialog title={'Delete '+selected.name} close={()=>setSelected(undefined)}><p>This removes the asset from the library.</p><button className="button dark" disabled={action.busy} onClick={()=>void action.act(async()=>{await request('/admin/media/'+selected.id,{method:'DELETE'});setSelected(undefined);rev(n=>n+1)},'Asset removed.')}>Confirm deletion</button><Feedback state={action}/></Dialog>}
  </>
}

type RecordItem={id:string;name?:string;email:string;phone?:string;subject?:string;category?:string;body?:string;kind?:string;status?:string;file_id?:string;created_at?:string;confirmed_at?:string;unsubscribed_at?:string}
type Note={id:string;body:string;created_at:string}
function QueueDetails({queue,item,close,refresh}:{queue:string;item:RecordItem;close:()=>void;refresh:()=>void}){
  const [revision,rev]=useState(0)
  const notes=useApi<{items:Note[]}>(queue==='enquiries'?'/admin/enquiry-notes/'+item.id:null,revision)
  const action=useAction()
  const [deleting,setDeleting]=useState(false)
  const id='/admin/queue/'+queue+'/'+item.id
  return <Dialog title={item.subject||item.name||item.email} close={close}>
    <p>{item.email} {item.phone&&' · '+item.phone}</p>{item.category&&<p>{item.category}</p>}{item.body&&<p className="preserve">{item.body}</p>}
    {item.file_id&&<a className="button outline" href={assetUrl(item.file_id,true)}>Download private PDF</a>}
    {queue!=='subscribers'&&<form className="inline-form" onSubmit={event=>{event.preventDefault();const status=new FormData(event.currentTarget).get('status');void action.act(async()=>{await request(id,post({status},'PUT'));refresh()},'Status saved.')}}>
      <label>Status<select name="status" defaultValue={item.status}>{statusOptions.map(status=><option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}</select></label><button className="button dark" disabled={action.busy}>Save status</button>
    </form>}
    {queue==='enquiries'&&<><h3>Internal notes</h3>{notes.data?.items.map(note=><div key={note.id} className="note"><small>{prettyDate(note.created_at)}</small><p className="preserve">{note.body}</p></div>)}
    <form className="editor-form" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const body=new FormData(form).get('body');void action.act(async()=>{await request('/admin/enquiry-notes/'+item.id,post({body}));form.reset();rev(n=>n+1)},'Note saved.')}}><label>New internal note<textarea name="body" rows={3} maxLength={3000} required/></label><button className="button outline" disabled={action.busy}>Add note</button></form></>}
    {deleting?<div className="notice alert"><p>Permanently remove this private record and its associated notes or upload?</p><button className="button dark" disabled={action.busy} onClick={()=>void action.act(async()=>{await request(id,{method:'DELETE'});refresh();close()})}>Confirm deletion</button></div>:<button className="button outline compact" onClick={()=>setDeleting(true)}>Delete record</button>}
    <Feedback state={action}/>
  </Dialog>
}
function Queue({queue}:{queue:string}){
  const [q,setQ]=useState('')
  const [status,setStatus]=useState('')
  const [page,setPage]=useState(1)
  const [revision,rev]=useState(0)
  const [selected,setSelected]=useState<RecordItem>()
  const result=useApi<Page<RecordItem>>('/admin/queue/'+queue+params({q,status,page,limit:12}),revision)
  const name=queue==='subscribers'?'Newsletter subscribers':queue==='submissions'?'Applications and consultations':'Public enquiries'
  return <><div className="admin-heading"><h2>{name}</h2><a className="button outline" href={exportUrl(queue)}>Export CSV</a></div>
  <SearchField label="Search by email" placeholder="Search by email" onSearch={value=>{setQ(value);setPage(1)}}/>
  {queue!=='subscribers'&&<div className="filter-row"><label className="inline-field">Status<select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">All statuses</option>{statusOptions.map(s=><option value={s} key={s}>{s.replaceAll('_',' ')}</option>)}</select></label></div>}
  <ResultState {...result} length={result.data?.total||0}/>
  {result.data?.items.map(item=><div className="admin-record" key={item.id}><div><strong>{item.subject||item.name||item.email}</strong><p>{item.email} {item.kind&&' · '+item.kind}</p><small>{item.status?.replaceAll('_',' ')||(item.unsubscribed_at?'Unsubscribed':item.confirmed_at?'Confirmed':'Awaiting confirmation')}</small></div><button className="button outline compact" onClick={()=>setSelected(item)}>Review</button></div>)}
  <Pagination page={page} limit={12} total={result.data?.total||0} setPage={setPage}/>
  {selected&&<QueueDetails queue={queue} item={selected} close={()=>setSelected(undefined)} refresh={()=>rev(n=>n+1)}/>}
  </>
}

type User={id:string;email:string;roles:string[];active:boolean}
function UsersView(){
  const [q,setQ]=useState('')
  const [page,setPage]=useState(1)
  const [revision,rev]=useState(0)
  const [edit,setEdit]=useState<User|'new'|null>(null)
  const result=useApi<Page<User>>('/admin/users'+params({q,page,limit:12}),revision)
  const action=useAction()
  const user=typeof edit==='object'?edit:null
  return <><div className="admin-heading"><h2>Staff and roles</h2><button className="button dark" onClick={()=>setEdit('new')}>Create user</button></div>
  <SearchField label="Search staff" onSearch={value=>{setQ(value);setPage(1)}}/>
  <ResultState {...result} length={result.data?.total||0}/>
  {result.data?.items.map(item=><div className="admin-record" key={item.id}><div><strong>{item.email}</strong><p>{item.roles.join(', ')} · {item.active?'Active':'Inactive'}</p></div>{!item.roles.includes('Super Administrator')&&<button className="button outline compact" onClick={()=>setEdit(item)}>Edit roles</button>}</div>)}
  <Pagination page={page} limit={12} total={result.data?.total||0} setPage={setPage}/>
  {edit&&<Dialog title={user?'Edit '+user.email:'Create a staff account'} close={()=>setEdit(null)}><form className="editor-form" onSubmit={event=>{
    event.preventDefault()
    const data=new FormData(event.currentTarget)
    const info={email:data.get('email'),password:data.get('password'),roles:data.getAll('roles'),active:data.has('active')}
    void action.act(async()=>{await request('/admin/users'+(user?'/'+user.id:''),post(info,user?'PUT':'POST'));setEdit(null);rev(n=>n+1)})
  }}>{!user&&<><label>Email<input name="email" type="email" required/></label><label>Initial password<input name="password" type="password" minLength={14} maxLength={72} autoComplete="new-password" required/></label></>}
    <fieldset><legend>Roles</legend>{staffRoles.map(role=><label className="checkbox-label" key={role}><input type="checkbox" name="roles" value={role} defaultChecked={user?.roles.includes(role)}/>{role}</label>)}</fieldset><label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={user?.active??true}/> Active account</label>
    <Feedback state={action}/><button className="button dark" disabled={action.busy}>Save user</button>
  </form></Dialog>}</>
}

function SettingsView(){
  const result=useApi<{settings:Record<string,string>;flags:Omit<Config,'settings'>}>('/admin/settings')
  const action=useAction()
  if(!result.data)return <ResultState {...result} length={0}/>
  const {settings,flags}=result.data
  return <><h2>Platform settings</h2><form className="form-card" onSubmit={event=>{
    event.preventDefault()
    const data=Object.fromEntries(new FormData(event.currentTarget))
    void action.act(async()=>{await request('/admin/settings',post(data,'PUT'))},'Settings saved.')
  }}><label>Public contact email<input type="email" name="publicEmail" defaultValue={settings.publicEmail}/></label><label>Homepage headline<input name="heroTitle" maxLength={100} defaultValue={settings.heroTitle}/></label>
  <label>Homepage introduction<textarea name="heroSummary" maxLength={280} defaultValue={settings.heroSummary}/></label><label>Footer note<textarea name="footerNote" maxLength={350} defaultValue={settings.footerNote}/></label><button className="button dark" disabled={action.busy}>Save settings</button><Feedback state={action}/></form>
  <h3>Authorization and website services</h3><dl>{Object.entries(flags).map(([key,value])=><div className="admin-record" key={key}><dt>{key}</dt><dd>{value?'Enabled':'Disabled'}</dd></div>)}</dl><p>Activation is controlled by server environment settings.</p></>
}
function Audit(){
  const [page,setPage]=useState(1)
  const result=useApi<Page<{id:string;actor:string;action:string;target:string;created_at:string}>>('/admin/audit'+params({page,limit:25}))
  return <><h2>Audit history</h2><ResultState {...result} length={result.data?.total||0}/>{result.data?.items.map(entry=><div className="admin-record" key={entry.id}><div><strong>{entry.action}</strong><p>{entry.target}</p><small>Account {entry.actor||'removed'}</small></div><time dateTime={entry.created_at}>{prettyDate(entry.created_at)}</time></div>)}<Pagination page={page} limit={25} total={result.data?.total||0} setPage={setPage}/></>
}

function Overview(){
  const state=useApi<{content:{kind:string;status:string;count:number}[];enquiries?:number;submissions?:number;subscribers?:number}>('/admin/overview')
  if(!state.data)return <ResultState {...state} length={0}/>
  const {content,...queues}=state.data
  const counts=[['Published',content.filter(row=>row.status==='published').reduce((n,row)=>n+row.count,0)],['Drafts',content.filter(row=>row.status==='draft').reduce((n,row)=>n+row.count,0)],['News items',content.filter(row=>row.kind==='news').reduce((n,row)=>n+row.count,0)],['Documents',content.filter(row=>row.kind==='document').reduce((n,row)=>n+row.count,0)],...Object.entries(queues)]
  return <><h2>Dashboard overview</h2><div className="three-grid">{counts.map(([title,count])=><div className="plain-card metric" key={title}><span>{title}</span><strong>{count}</strong></div>)}</div><p>Counts reflect the records available to your staff role.</p></>
}

export default function Admin(){
  useSeo('Administrator Access','Restricted content administration.',true)
  const [revision,rev]=useState(0)
  const [view,setView]=useState('Overview')
  const session=useApi<Staff>('/admin/session',revision)
  const staff=session.data
  const action=useAction()
  const items:{label:string;icon:ReactNode;visible:boolean}[]=[
    {label:'Overview',icon:<LayoutDashboard size={17}/>,visible:true},
    {label:'Content',icon:<FileText size={17}/>,visible:!!staff&&Object.values(kinds).some(key=>staff.permissions.includes(key))},
    {label:'Media',icon:<ImagePlus size={17}/>,visible:!!staff?.permissions.includes('media')},
    {label:'Enquiries',icon:<Mail size={17}/>,visible:!!staff?.permissions.includes('enquiries')},
    {label:'Submissions',icon:<ClipboardList size={17}/>,visible:!!staff?.permissions.includes('submissions')},
    {label:'Subscribers',icon:<Mail size={17}/>,visible:!!staff?.permissions.includes('newsletter')},
    {label:'Users',icon:<Users size={17}/>,visible:!!staff?.permissions.includes('users')},
    {label:'Settings',icon:<Settings size={17}/>,visible:!!staff?.permissions.includes('settings')},
    {label:'Audit',icon:<BookOpen size={17}/>,visible:!!staff?.permissions.includes('audit')},
  ]
  return <><PageHeader eyebrow="Content administration" title={staff?'Administration dashboard':'Administrator access'}/>
    {session.loading&&!staff?<div className="section wrap" role="status">Checking administrator session…</div>:!staff?
      session.status===401?<Login onLogin={()=>rev(n=>n+1)}/>:<div className="section wrap narrow"><Notice>The administrator service is temporarily unavailable.</Notice></div>:
      <section className="section wrap admin-shell">
        <aside className="admin-sidebar"><p><strong>{staff.email}</strong><small>{staff.roles.join(', ')}</small></p><nav aria-label="Admin areas">{items.filter(item=>item.visible).map(item=><button key={item.label} aria-pressed={view===item.label} onClick={()=>setView(item.label)}>{item.icon}{item.label}</button>)}</nav><button className="button outline" disabled={action.busy} onClick={()=>void action.act(async()=>{await request('/admin/logout',post({}));setView('Overview');rev(n=>n+1)})}><LogOut size={16}/> Sign out</button><Feedback state={action}/></aside>
        <div className="admin-main">{view==='Overview'?<Overview/>:view==='Content'?<Content staff={staff}/>:view==='Media'?<Media/>:view==='Users'?<UsersView/>:view==='Settings'?<SettingsView/>:view==='Audit'?<Audit/>:<Queue key={view} queue={view.toLowerCase()}/>}</div>
      </section>}
  </>
}
