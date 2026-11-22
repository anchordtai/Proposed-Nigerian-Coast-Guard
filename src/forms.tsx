import {type FormEvent,type ReactNode,useState} from 'react'
import {Link,useParams,useSearchParams} from 'react-router-dom'
import {ArrowRight,Mail,Send} from 'lucide-react'
import {apiRoot,post,request,type Config,type Item} from './api'
import {contactCategories,defaultEmail,legalNote} from './data'
import {Notice,PageHeader,TextLink,useSeo} from './ui'

const failure=(reason:unknown)=>reason instanceof Error?reason.message:'Could not complete the request.'
function Honey(){return <div className="honeypot" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div>}
function Consent({children}:{children:ReactNode}){return <label className="checkbox-label"><input required type="checkbox" name="consent"/><span>{children} <Link to="/privacy">Privacy notice</Link></span></label>}
function Feedback({message,error}:{message:string;error:string}){
  return <>{message&&<p className="form-feedback" role="status">{message}</p>}{error&&<p className="form-feedback error" role="alert">{error}</p>}</>
}

export function Newsletter({enabled}:{enabled:boolean}) {
  const [state,setState]=useState({message:'',error:'',busy:false})
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const form=event.currentTarget
    const data=Object.fromEntries(new FormData(form))
    setState({message:'',error:'',busy:true})
    try {
      await request('/newsletter',post({...data,consent:true}))
      form.reset()
      setState({message:'If this address is eligible, check your inbox for a confirmation link.',error:'',busy:false})
    } catch(reason){setState({message:'',error:failure(reason),busy:false})}
  }
  return <section className="newsletter"><div className="wrap newsletter-inner">
    <div><span className="mini-icon"><Mail size={22}/></span><h2>Stay informed.</h2><p>Legislative updates and maritime public information.</p></div>
    {enabled?<form onSubmit={submit}>
      <label htmlFor="subscribe" className="sr-only">Email address</label><div className="newsletter-row"><input type="email" autoComplete="email" name="email" id="subscribe" placeholder="Your email address" required maxLength={254}/><button className="button gold" disabled={state.busy}>Subscribe <ArrowRight size={18}/></button></div>
      <Consent>I agree to receive email updates.</Consent><Honey/><Feedback {...state}/>
    </form>:<div><p>Email subscriptions are currently closed.</p><Link className="button gold" to="/news">Read the latest updates <ArrowRight size={17}/></Link></div>}
  </div></section>
}

export function Contact({config}:{config?:Config}){
  const [query]=useSearchParams()
  const [state,setState]=useState({message:'',error:'',busy:false})
  const email=config?.settings.publicEmail||defaultEmail
  useSeo('Public Enquiries','Find the general enquiry contact for the Provisional Committee.')
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const form=event.currentTarget
    const input=Object.fromEntries(new FormData(form))
    setState({message:'',error:'',busy:true})
    try{
      const result=await request<{reference?:string}>('/enquiries',post({...input,consent:true}))
      form.reset()
      setState({message:'Your enquiry was received.'+(result.reference?' Reference: '+result.reference:''),error:'',busy:false})
    }catch(reason){setState({message:'',error:failure(reason),busy:false})}
  }
  return <>
    <PageHeader eyebrow="Public engagement" title="Contact the committee" copy="General enquiries about the proposal, public information, and stakeholder engagement." image="cooperation"/>
    <section className="section wrap contact-grid">
      <div><h2>General enquiries</h2><p>Use this channel for matters concerning the proposal. Avoid sending identification documents, medical information or sensitive maritime information.</p>
        <a className="email-link" href={'mailto:'+email}><Mail size={18}/>{email}</a>
        <Notice><strong>For urgent assistance</strong><p>Use established maritime distress channels and the appropriate existing authority.</p><TextLink to="/emergency">Maritime emergency information</TextLink></Notice>
      </div>
      {config?.engagement?<form className="form-card" onSubmit={submit}><h2>Send an enquiry</h2>
        <div className="field-grid"><label>Full name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label><label>Email<input type="email" name="email" required maxLength={254} autoComplete="email"/></label></div>
        <div className="field-grid"><label>Phone <small>(optional)</small><input type="tel" name="phone" maxLength={30} autoComplete="tel"/></label><label>Category<select name="category" defaultValue={query.get('category')||contactCategories[0]}>{contactCategories.map(category=><option key={category}>{category}</option>)}</select></label></div>
        <label>Subject<input name="subject" minLength={2} maxLength={180} required/></label><label>Message<textarea name="body" rows={6} minLength={10} maxLength={5000} required/></label>
        <Consent>I agree to the use of these details to respond to my enquiry.</Consent><Honey/>
        <button className="button dark" disabled={state.busy}>Send enquiry <Send size={17}/></button><Feedback {...state}/>
      </form>:<Notice><strong>Online form unavailable</strong><p>You can still send a general enquiry to the committee’s email address.</p></Notice>}
    </section>
  </>
}

export function IntakeForm({item}:{item:Item}){
  const [state,setState]=useState({message:'',error:'',busy:false})
  if(!item.deadline||new Date(item.deadline)<=new Date())return <Notice>The submission window is closed.</Notice>
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const form=event.currentTarget
    const body=new FormData(form)
    body.set('consent','true')
    const file=body.get('file')
    if(file instanceof File&&!file.size)body.delete('file')
    setState({message:'',error:'',busy:true})
    try{
      const result=await request<{reference?:string;trackingCode?:string}>('/intake/'+item.kind+'/'+item.slug,{method:'POST',body})
      form.reset()
      setState({message:['Submission received.',result.reference&&'Reference: '+result.reference,result.trackingCode&&'Save your private tracking code: '+result.trackingCode].filter(Boolean).join(' '),error:'',busy:false})
    }catch(reason){setState({message:'',error:failure(reason),busy:false})}
  }
  return <form className="form-card" onSubmit={submit}><h2>Submit {item.kind==='job'?'an application':'feedback'}</h2>
    <div className="field-grid"><label>Full name<input name="name" required minLength={2} maxLength={100}/></label><label>Email<input name="email" type="email" required maxLength={254}/></label></div>
    <label>Category<input name="category" maxLength={80}/></label><label>Message<textarea name="body" required minLength={10} maxLength={5000} rows={5}/></label>
    <label>Supporting PDF <small>(optional, up to 5 MB)</small><input type="file" name="file" accept="application/pdf"/></label>
    <Consent>I agree to the use of these details to review this submission.</Consent><Honey/><button className="button dark" disabled={state.busy}>Submit <Send size={17}/></button><Feedback {...state}/>
  </form>
}

export function TokenPage(){
  const {action}=useParams()
  const reset=action==='reset'
  const unsubscribe=action==='unsubscribe'
  const heading=reset?'Reset administrator password':unsubscribe?'Unsubscribe from the newsletter':'Confirm your subscription'
  const code=new URLSearchParams(window.location.hash.slice(1)).get('token')
  const [state,setState]=useState({message:'',error:'',busy:false})
  useSeo(heading,legalNote,true)
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const data=new FormData(event.currentTarget)
    setState({message:'',error:'',busy:true})
    try{
      await request(reset?'/auth/reset':unsubscribe?'/newsletter/unsubscribe':'/newsletter/confirm',post({token:code,password:data.get('password')||undefined}))
      history.replaceState(null,'',window.location.pathname)
      setState({message:reset?'Password changed. You can now sign in.':unsubscribe?'You have unsubscribed.':'Your subscription is confirmed.',error:'',busy:false})
    }catch(reason){setState({message:'',error:failure(reason),busy:false})}
  }
  return <><PageHeader eyebrow="Account action" title={heading}/><div className="section wrap narrow">
    <Feedback {...state}/>
    {!state.message&&(code?<form className="form-card" onSubmit={submit}>{reset&&<label>New password<input type="password" name="password" minLength={14} maxLength={72} autoComplete="new-password" required/></label>}<button className="button dark" disabled={state.busy}>{heading}</button></form>:<Notice>This link is missing a confirmation code.</Notice>)}
    {reset&&<TextLink to="/admin">Administrator sign-in</TextLink>}
  </div></>
}
export function ApplicationStatus(){
  const [state,setState]=useState({message:'',error:'',busy:false})
  return <form className="form-card" onSubmit={async event=>{
    event.preventDefault()
    const token=new FormData(event.currentTarget).get('token')
    setState({message:'',error:'',busy:true})
    try{const data=await request<{status:string}>('/application-status',post({token}))
      setState({message:'Application status: '+data.status.replaceAll('_',' '),error:'',busy:false})
    }catch(reason){setState({message:'',error:failure(reason),busy:false})}
  }}><label>Private tracking code<input name="token" required minLength={43} maxLength={43}/></label><button className="button dark" disabled={state.busy}>Check application status</button><Feedback {...state}/></form>
}
export const exportUrl=(queue:string)=>apiRoot+'/admin/queue/'+queue+'/export'
