import {type ReactNode,useEffect,useId,useState} from 'react'
import {Link,NavLink,useLocation,useNavigate} from 'react-router-dom'
import {ArrowDown,ArrowRight,ArrowUpRight,ChevronDown,ChevronLeft,ChevronRight,Compass,Camera,Copy,Flag,Globe2,Info,LifeBuoy,Menu,MessageCircle,Search,Share2,ShieldCheck,SquarePlay,Waves,X} from 'lucide-react'
import Markdown from 'react-markdown'
import {assetUrl,contentPath,journalImage,readMinutes,type Config,type Item} from './api'
import {directory,faq,legalNote,name,paths,proposedNotice,type Resource} from './data'

export function useSeo(title:string,description:string,privatePage=false,image?:string) {
  const {pathname}=useLocation()
  useEffect(()=>{
    const titleText=title===name?title:title+' | '+name
    document.title=titleText
    const base=import.meta.env.VITE_SITE_URL||window.location.origin
    const canonical=new URL(pathname,base).href
    const imageUrl=new URL(image||'/media/maritime-hero.webp',base).href
    const tags={description,'og:title':titleText,'og:description':description,'og:url':canonical,'og:image':imageUrl,
      'twitter:title':titleText,'twitter:description':description,'twitter:image':imageUrl,robots:privatePage?'noindex,nofollow':'index,follow'}
    for(const [key,value] of Object.entries(tags)){
      const attribute=key.startsWith('og:')?'property':'name'
      let node=document.head.querySelector<HTMLMetaElement>('meta['+attribute+'="'+key+'"]')
      if(!node){node=document.createElement('meta');node.setAttribute(attribute,key);document.head.append(node)}
      node.content=value
    }
    let link=document.head.querySelector<HTMLLinkElement>('link[rel=canonical]')
    if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link)}
    link.href=canonical
  },[title,description,pathname,privatePage,image])
}

export function Brand(){
  return <Link className="brand" to="/" aria-label={name+' home'}><img src="/crest.webp" alt="" width="65" height="65"/><span><small>Provisional Committee for the Establishment of the</small><strong>Nigerian Coast Guard</strong><abbr title={name}>PCNCG</abbr></span></Link>
}
const morePaths=directory.filter(([path])=>['/community','/emergency','/documents','/map','/gallery','/careers','/consultation','/partnerships','/faq'].includes(path))

export function Header({customMenu}:{customMenu:Item[]}){
  const [open,setOpen]=useState(false)
  const [more,setMore]=useState(false)
  const [search,setSearch]=useState(false)
  const nav=useNavigate()
  const {pathname,search:query}=useLocation()
  useEffect(()=>{setOpen(false);setMore(false);setSearch(false)},[pathname,query])
  useEffect(()=>{
    function close(event:KeyboardEvent){
      if(event.key==='Escape'){setOpen(false);setMore(false);setSearch(false)}
    }
    window.addEventListener('keydown',close)
    return()=>window.removeEventListener('keydown',close)
  },[])
  return <>
    <a href="#main" className="skip">Skip to content</a>
    <div className="statusbar"><div className="wrap status-inner"><span><i/> {proposedNotice}</span><div className="status-actions"><Link to="/legislation">Legislative status <ArrowUpRight size={13}/></Link><details className="header-share" onKeyDown={event=>{if(event.key==='Escape'&&event.currentTarget.open){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus()}}}>
      <summary aria-label="Share the PCNCG website"><Share2 size={15}/> <span>Share</span></summary>
      <div className="share-panel"><p>Share the PCNCG website</p><Share title={name} path="/" compact/></div>
    </details></div></div></div>
    <header className="site-header"><div className="wrap nav-inner">
      <Brand/>
      <nav aria-label="Primary navigation" className={open?'nav-menu is-open':'nav-menu'}>
        {paths.map(([to,label])=><NavLink to={to} key={to}>{label}</NavLink>)}
        <button className="nav-more" type="button" aria-expanded={more} aria-controls="more-nav" onClick={()=>setMore(!more)}>Explore <ChevronDown size={14}/></button>
        <div id="more-nav" className="more-nav" hidden={!more}>
          {morePaths.map(([to,label])=><Link to={to} key={to}>{label}</Link>)}
          {customMenu.filter(v=>v.url).map(v=><a key={v.id} href={v.url}>{v.title}</a>)}
        </div>
        <Link to="/contact" className="mobile-contact">Contact</Link>
      </nav>
      <div className="nav-actions">
        <button type="button" className="icon-button" aria-label="Search website" aria-expanded={search} aria-controls="search-panel" onClick={()=>{setSearch(!search);setOpen(false)}}>{search?<X size={19}/>:<Search size={19}/>}</button>
        <Link className="header-contact" to="/contact">Contact <ArrowUpRight size={14}/></Link>
        <button type="button" className="icon-button menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} onClick={()=>{setOpen(!open);setSearch(false)}}>{open?<X size={22}/>:<Menu size={22}/>}</button>
      </div>
    </div>
    {search&&<form className="quick-search wrap" id="search-panel" role="search" onSubmit={e=>{e.preventDefault();const q=String(new FormData(e.currentTarget).get('q')??'').trim();if(q)nav('/search?q='+encodeURIComponent(q));setSearch(false)}}>
      <label className="sr-only" htmlFor="header-search">Search website</label><input id="header-search" autoFocus name="q" placeholder="Search the website" required maxLength={120}/><button className="button gold"><Search size={16}/> Search</button>
    </form>}
    </header>
  </>
}

const facebookIcon=<span className="brand-glyph">f</span>
const linkedInIcon=<span className="brand-glyph linkedin-glyph">in</span>

function profileIcon(url:string){
  let host
  try {
    const parsed=new URL(url)
    if(parsed.protocol!=='https:'||parsed.username||parsed.password)return null
    host=parsed.hostname.replace(/^www\./,'')
  } catch {return null}
  if(host==='facebook.com'||host==='fb.com')return facebookIcon
  if(host==='instagram.com')return <Camera size={18}/>
  if(host==='linkedin.com')return linkedInIcon
  if(host==='youtube.com'||host==='youtu.be')return <SquarePlay size={18}/>
  if(host==='x.com'||host==='twitter.com')return <span className="x-icon">𝕏</span>
  if(host==='wa.me'||host==='whatsapp.com'||host==='chat.whatsapp.com')return <MessageCircle size={18}/>
  return <Globe2 size={18}/>
}
export function Footer({config,social}:{config?:Config;social:Item[]}){
  const profiles=social.flatMap(item=>{
    const icon=profileIcon(item.url)
    return icon?[{item,icon}]:[]
  })
  return <footer className="footer"><div className="wrap">
    <div className="footer-grid">
      <div><Brand/><p>{legalNote}</p><span className="footer-caption">Proposed emblem · pending formal approval</span></div>
      <div><h2>Explore</h2><Link to="/about">About the proposal</Link><Link to="/mandate">Proposed mandate</Link><Link to="/legislation">Legislative journey</Link><Link to="/news">Newsroom</Link><Link to="/journal">Maritime Journal</Link><Link to="/gallery">Media gallery</Link></div>
      <div><h2>Public information</h2><Link to="/safety">Maritime safety</Link><Link to="/emergency">Emergency information</Link><Link to="/map">Maritime map</Link><Link to="/documents">Document library</Link><Link to="/faq">Frequently asked questions</Link></div>
      <div><h2>Get in touch</h2><Link to="/contact">Public enquiries</Link><Link to="/partnerships">Partnerships</Link><Link to="/consultation">Consultations</Link><Link to="/careers">Careers</Link>
        {profiles.length>0&&<div className="profile-links" role="group" aria-label="PCNCG social profiles">{profiles.map(({item,icon})=><a key={item.id} className="social-icon" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={item.title} title={item.title}>{icon}</a>)}</div>}
      </div>
    </div>
    {config?.settings.footerNote&&<p>{config.settings.footerNote}</p>}
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {name} · Public information initiative</span><div><Link to="/privacy">Privacy & cookies</Link><Link to="/accessibility">Accessibility</Link><Link to="/admin">Admin</Link></div></div>
  </div></footer>
}

export function Eyebrow({children}:{children:ReactNode}){return <p className="eyebrow"><span/>{children}</p>}
export function SectionIntro({label,title,copy,action}:{label?:string;title:string;copy?:string;action?:ReactNode}){
  return <div className="section-intro"><div>{label&&<Eyebrow>{label}</Eyebrow>}<h2>{title}</h2>{copy&&<p>{copy}</p>}</div>{action}</div>
}
export function PageHeader({eyebrow,title,copy,image}:{eyebrow:string;title:string;copy?:string;image?:string}){
  return <section className={'page-hero'+(image?' with-image':'')} style={image?{backgroundImage:'linear-gradient(90deg,#081e2bee 15%,#081e2ba6 58%,#081e2b30),url(/media/'+image+'.webp)'}:undefined}><div className="wrap">
    <p className="breadcrumbs"><Link to="/">Home</Link> <ChevronRight size={14}/> <span>{eyebrow}</span></p><Eyebrow>{eyebrow}</Eyebrow>
    <h1>{title}</h1>{copy&&<p className="page-hero-copy">{copy}</p>}
  </div></section>
}
export const MandateIcon=({icon,size=22}:{icon:string;size?:number})=>icon==='life'?<LifeBuoy size={size}/>:icon==='waves'?<Waves size={size}/>:<ShieldCheck size={size}/>

export function TextLink({to,children,external=false}:{to:string;children:ReactNode;external?:boolean}){
  return external?<a className="text-link" href={to} rel="noopener noreferrer">{children} <ArrowUpRight size={17}/></a>:<Link className="text-link" to={to}>{children} <ArrowRight size={17}/></Link>
}
export function Notice({children,kind='info'}:{children:ReactNode;kind?:'info'|'alert'}){
  return <div className={'notice '+kind}><Info size={20} aria-hidden/><div>{children}</div></div>
}
export function Card({item,base}:{item:Resource;base:string}){
  return <article className="card">
    <Link to={base+'/'+item.slug} className="card-image" tabIndex={-1} aria-hidden><img src={'/media/'+item.image+'.webp'} width="500" height="375" loading="lazy" alt=""/></Link>
    <div className="card-body"><p className="card-kicker">{item.category}</p><h3><Link to={base+'/'+item.slug}>{item.title}</Link></h3><p>{item.copy}</p><TextLink to={base+'/'+item.slug}>Read more</TextLink></div>
  </article>
}
export function CmsCard({item}:{item:Item}){
  const to=contentPath(item)
  const isJournal=item.kind==='journal'
  const image=isJournal?journalImage(item):item.image_id?assetUrl(item.image_id):undefined
  return <article className="card">
    {image&&<Link to={to} className="card-image" tabIndex={-1} aria-hidden><img src={image} loading="lazy" alt=""/></Link>}
    <div className="card-body"><p className="card-kicker">{item.category||(isJournal?'Maritime Journal':item.kind)}{item.published_at&&' · '+prettyDate(item.published_at)}{isJournal&&' · '+readMinutes(item.body)+' min read'}</p><h3><Link to={to}>{item.title}</Link></h3>{item.subtitle&&<p>{item.subtitle}</p>}<TextLink to={to}>Read more</TextLink></div>
  </article>
}
export function prettyDate(value:string){return new Intl.DateTimeFormat('en-NG',{dateStyle:'medium',timeZone:'Africa/Lagos'}).format(new Date(value))}
export function FAQList({extra=[],limit}:{extra?:Item[];limit?:number}){
  const entries=[...faq,...extra.map(i=>[i.title,i.body])]
  return <div className="faq-list">{entries.slice(0,limit).map(([title,body])=><details key={title}><summary>{title}<ChevronDown size={18}/></summary><div><RichText>{body}</RichText></div></details>)}</div>
}
export function RichText({children}:{children:string}){
  return <div className="rich"><Markdown>{children}</Markdown></div>
}
export function Pagination({page,total,limit,setPage}:{page:number;total:number;limit:number;setPage:(p:number)=>void}){
  const pages=Math.ceil(total/limit)
  if(pages<=1)return null
  return <nav className="pagination" aria-label="Page navigation"><button className="button outline" disabled={page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={17}/> Previous</button><span>Page {page} of {pages}</span><button className="button outline" disabled={page>=pages} onClick={()=>setPage(page+1)}>Next <ChevronRight size={17}/></button></nav>
}
export function Share({title,path,compact=false}:{title:string;path?:string;compact?:boolean}){
  const {pathname}=useLocation()
  const url=new URL(path||pathname,window.location.origin).href
  const [clipboard,setClipboard]=useState<{url:string;state:'copied'|'manual'}>()
  const link=encodeURIComponent(url)
  const message=encodeURIComponent(title+' '+url)
  const entries=[
    {label:'WhatsApp',url:'https://wa.me/?text='+message,icon:<MessageCircle size={18}/>},
    {label:'Facebook',url:'https://www.facebook.com/sharer/sharer.php?u='+link,icon:facebookIcon},
    {label:'X',url:'https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+'&url='+link,icon:<span className="x-icon">𝕏</span>},
    {label:'LinkedIn',url:'https://www.linkedin.com/sharing/share-offsite/?url='+link,icon:linkedInIcon},
  ]
  const state=clipboard?.url===url?clipboard.state:undefined
  return <div className={'share'+(compact?' compact-share':'')} role="group" aria-label="Sharing options">
    {!compact&&<span>Share</span>}
    {entries.map(entry=><a key={entry.label} className="social-icon" href={entry.url} target="_blank" rel="noopener noreferrer" title={'Share on '+entry.label} aria-label={'Share on '+entry.label}>{entry.icon}</a>)}
    <button type="button" className="social-icon" aria-label="Copy link" title="Copy link" onClick={async()=>{
      try{await navigator.clipboard.writeText(url);setClipboard({url,state:'copied'})}
      catch{setClipboard({url,state:'manual'})}
    }}><Copy size={17}/></button>
    {state==='copied'&&<span className="share-feedback" role="status">Link copied</span>}
    {state==='manual'&&<label className="share-feedback">Copy this link<input readOnly value={url} onFocus={event=>event.currentTarget.select()}/></label>}
  </div>
}
export function SearchField({label,onSearch,initial='',placeholder='Search…'}:{label:string;onSearch:(q:string)=>void;initial?:string;placeholder?:string}){
  const id=useId()
  return <form className="search-field" role="search" onSubmit={e=>{e.preventDefault();onSearch(String(new FormData(e.currentTarget).get('q')??'').trim())}}><label htmlFor={id} className="sr-only">{label}</label><input id={id} name="q" maxLength={120} defaultValue={initial} placeholder={placeholder}/><button className="button dark"><Search size={17}/> Search</button></form>
}
export function HomeHero({config}:{config?:Config}){
  return <section className="home-hero">
    <picture className="hero-picture"><source media="(max-width: 680px)" srcSet="/media/maritime-hero-mobile.webp"/><img src="/media/maritime-hero.webp" width="1760" height="990" alt="" fetchPriority="high"/></picture>
    <div className="wrap hero-inner"><div className="hero-content">
      <Eyebrow>Nigeria’s maritime future</Eyebrow>
      <h1>{config?.settings.heroTitle||<>Safeguarding<br/>Nigeria’s<br className="hero-break"/> <em>Maritime Future.</em></>}</h1>
      <p>{config?.settings.heroSummary||'A vision for safer waters, stronger coastal communities, and a more secure maritime future for Nigeria.'}</p>
      <div className="action-row"><Link className="button gold" to="/about">Explore Our Vision <ArrowRight size={19}/></Link><Link className="button light-outline" to="/safety"><LifeBuoy size={18}/> Maritime Safety</Link></div>
    </div>
    <div className="hero-bottom"><a href="#priorities"><ArrowDown size={16}/> Explore the platform</a><span><Compass size={17}/> Nigeria · Gulf of Guinea</span></div>
    </div>
  </section>
}
export function StatusStrip(){
  return <section className="status-strip"><div className="wrap">
    <div className="status-mark"><Flag size={22}/></div><div><h2>Legislative status</h2><p>The Nigerian Coast Guard remains a proposal before formal establishment.</p></div>
    <TextLink to="/legislation">View legislative journey</TextLink>
  </div></section>
}
