import {useState} from 'react'
import {Link,Navigate,useParams,useSearchParams} from 'react-router-dom'
import {ArrowRight,ArrowUpRight,BookOpen,ChevronRight,Compass,Download,FileText,Globe2,LifeBuoy,MapPin,Radio,Rss,Ship,Users,Waves} from 'lucide-react'
import {apiRoot,assetUrl,contentPath,journalImage,params,readMinutes,useApi,type Config,type Item,type Page} from './api'
import {directory,faq,galleries,legalNote,legislativeRecord,mandates,milestones,name,nass,nimasa,npa,safety,sourceDocs,updates,type Resource} from './data'
import {ApplicationStatus,IntakeForm,Newsletter} from './forms'
import {Card,CmsCard,Eyebrow,FAQList,HomeHero,MandateIcon,Notice,PageHeader,Pagination,RichText,SearchField,SectionIntro,Share,StatusStrip,TextLink,prettyDate,useSeo} from './ui'

const apiItems=(kind:string,count=50,q='',page=1,category='')=>'/content'+params({kind,limit:count,q,page,category})
const galleryAlt=(name:string)=>name+' · illustrative image'
const humanKind=(kind:string)=>({job:'Career opportunities',consultation:'Public consultation',video:'Video',gallery:'Gallery',page:'Public information',document:'Publication',journal:'Maritime Journal'}[kind]||kind)
const itemDate=(item:Item)=>item.event_date?prettyDate(item.event_date):'Date not provided'
const sizeLabel=(bytes:number)=>bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.max(1,Math.round(bytes/1024))+' KB'

export function Home({config}:{config?:Config}){
  const news=useApi<Page<Item>>(apiItems('news',3))
  const extra=useApi<Page<Item>>(apiItems('faq',3))
  const custom=useApi<Page<Item>>(apiItems('homepage',10))
  const announcements=useApi<Page<Item>>(apiItems('announcement',2))
  useSeo(name,'Explore the proposed mandate, legislative journey and maritime safety resources for Nigeria.')
  return <>
  <HomeHero config={config}/><StatusStrip/>
  <section className="section wrap priorities" id="priorities">
    <SectionIntro label="The proposed mandate" title="A safer maritime future" copy="Three priorities for protecting lives, livelihoods and the marine environment across Nigeria’s waters." action={<TextLink to="/mandate">Explore the full mandate</TextLink>}/>
    <div className="three-grid">
      {mandates.map((item,index)=><article className="card mandate-card" key={item.title}><Link to={'/mandate#priority-'+index} className="card-image" aria-hidden tabIndex={-1}><img src={'/media/'+item.image+'.webp'} alt="" width="500" height="375" loading="lazy"/></Link><div className="card-body"><span className="mini-icon"><MandateIcon icon={item.icon}/></span><h3>{item.title}</h3><p>{item.copy}</p><TextLink to={'/mandate#priority-'+index}>Learn more</TextLink></div></article>)}
    </div>
  </section>
  <section className="ocean-band"><div className="wrap ocean-grid"><div className="ocean-photo"><img src="/media/coastline.webp" alt="Illustrative aerial view of a tropical coastline" width="500" height="375" loading="lazy"/></div><div>
    <Eyebrow>Our waters and communities</Eyebrow><h2>At the heart of the Gulf of Guinea.</h2><p>Nigeria’s coastline connects fishing communities, commercial ports and sensitive habitats. A practical maritime strategy starts with the people who live and work along the coast.</p>
    <div className="action-row"><Link className="button gold" to="/map"><MapPin size={18}/> Explore the maritime map</Link><TextLink to="/community">Community resources</TextLink></div>
  </div></div></section>
  {custom.data?.items.map(item=><section key={item.id} className="section wrap"><SectionIntro title={item.title} copy={item.subtitle}/><RichText>{item.body}</RichText>{item.url&&<TextLink external to={item.url}>Read more</TextLink>}</section>)}
  <section className="section wrap news-section"><SectionIntro label="News and legislative updates" title="Follow the proposal" copy="Find legislative developments, source documents and public information." action={<TextLink to="/news">Visit the newsroom</TextLink>}/>
    <div className="three-grid">{news.data?.items.length?news.data.items.map(item=><CmsCard key={item.id} item={item}/>):updates.map(item=><Card key={item.slug} item={item} base="/news"/>)}
      <aside className="quick-resources"><BookOpen size={25}/><h3>Public resources</h3><Link to="/journal">Maritime Journal <ChevronRight size={16}/></Link><Link to="/documents">Document library <ChevronRight size={16}/></Link><Link to="/safety">Maritime safety guides <ChevronRight size={16}/></Link><Link to="/emergency">Emergency information <ChevronRight size={16}/></Link></aside>
    </div>
    {announcements.data?.items.length? <div className="three-grid announcements">{announcements.data.items.map(item=><CmsCard key={item.id} item={item}/>)}</div>:null}
  </section>
  <section className="neutral"><div className="section wrap faq-split"><div><Eyebrow>Public information</Eyebrow><h2>Frequently asked questions</h2><p>Find answers about the proposal, the legislative process and ways to stay informed.</p><TextLink to="/faq">See all common questions</TextLink></div><FAQList extra={extra.data?.items} limit={4}/></div></section>
  <Newsletter enabled={Boolean(config?.newsletter)}/>
  </>
}

export function About(){
  const item=useApi<Item>('/content/page/about')
  useSeo('About the Proposal','Background, mission, vision and values of the proposed Nigerian Coast Guard.')
  return <><PageHeader eyebrow="About the proposal" title="A vision for Nigeria’s maritime future" copy="A proposed institution focused on maritime safety, protection of lives and stewardship of Nigeria’s marine resources." image="coastline"/>
  <section className="section wrap">
    <div className="split"><div><Eyebrow>Background</Eyebrow><h2>Why the proposal matters</h2>{item.data?<RichText>{item.data.body}</RichText>:<p>Coastal communities, commercial shipping, fisheries and marine habitats depend on a safe and well-coordinated maritime environment. The proposal explores how a dedicated service could contribute while respecting the responsibilities of existing authorities.</p>}<TextLink to="/legislation">Read the legislative journey</TextLink></div><div className="quick-resources"><Compass size={28}/><h3>Proposed institutional framework</h3><p>The final model would depend on enacted legislation. Areas for consideration include civilian accountability, cooperation with existing authorities, competence standards and transparent public reporting.</p><TextLink to="/mandate">Proposed mandate</TextLink></div></div>
    <div className="two-grid spacious"><article className="plain-card"><p className="card-kicker">Proposed mission</p><h3>Protect lives and maritime interests</h3><p>Advance safer navigation, rescue preparedness, marine environmental protection and lawful cooperation across Nigeria’s maritime domain.</p></article><article className="plain-card"><p className="card-kicker">Proposed vision</p><h3>A safe and sustainable maritime environment</h3><p>Support communities and a resilient maritime economy through professionalism, accountability and public service.</p></article></div>
    <SectionIntro label="Guiding principles" title="How a future service would work"/><ul className="value-grid">{['Integrity','Professionalism','Discipline','Courage','Accountability','Service','Respect for human rights','National commitment','Excellence','Transparency'].map(value=><li key={value}>{value}</li>)}</ul>
  </section></>
}
export function Mandate(){
  useSeo('Proposed Mandate','Proposed areas of responsibility for maritime safety, search and rescue, and environmental protection.')
  return <><PageHeader eyebrow="Proposed mandate" title="Potential responsibilities" copy="The definitive powers and responsibilities would be set by legislation and applicable official policy." image="patrol"/>
  <section className="section wrap">{mandates.map((item,index)=><article className="mandate-detail" key={item.title} id={'priority-'+index}><img src={'/media/'+item.image+'.webp'} alt="" loading="lazy"/><div><span className="mini-icon"><MandateIcon icon={item.icon}/></span><h2>{item.title}</h2><p>{item.details}</p></div></article>)}
    <Notice>Any future role in enforcement, public safety, fisheries protection or emergency coordination is subject to formal establishment and authorization.</Notice>
  </section></>
}
export function Legislation(){
  const items=useApi<Page<Item>>(apiItems('milestone'))
  const has=!!items.data?.items.length
  useSeo('Legislative Journey','Track source-linked legislative milestones for the proposed Nigerian Coast Guard.')
  return <><PageHeader eyebrow="Legislative journey" title="Follow the legislative record" copy="Read source-linked milestones and find official parliamentary documents." image="shipping"/>
  <section className="section wrap split legislation-grid"><div>
    <Eyebrow>Timeline</Eyebrow><h2>From bill to committee review</h2><ol className="timeline">
    {has?items.data?.items.map(item=><li key={item.id}><div className="timeline-dot"/><p className="card-kicker">{itemDate(item)} · {item.milestone_status||'Legislative update'}</p><h3>{item.title}</h3><RichText>{item.body}</RichText>{item.url&&<TextLink external to={item.url}>View source document</TextLink>}</li>):
    milestones.map(item=><li key={item.title}><div className="timeline-dot"/><p className="card-kicker">{item.date} · {item.status}</p><h3>{item.title}</h3><p>{item.text}</p><TextLink external to={item.url}>View source document</TextLink></li>)}</ol>
  </div><aside><Notice><strong>Proposed status</strong><p>Legislative information on this platform should be verified against official parliamentary records.</p><TextLink external to={nass}>National Assembly records</TextLink></Notice><div className="plain-card"><h3>What happens next?</h3><p>Check subsequent official records for any further reading, concurrence, or assent. This platform does not publish a predicted schedule.</p><TextLink to="/documents">Browse legislative documents</TextLink></div></aside></section></>
}
export function Listing({type}:{type:'safety'|'news'}){
  const [q,setQuery]=useState('')
  const [page,setPage]=useState(1)
  const [category,setCategory]=useState('')
  const staticItems=type==='safety'?safety:updates
  const kinds=type==='safety'?['article']:['news','press','statement','advisory','announcement']
  const [active,setActive]=useState('')
  const items=useApi<Page<Item>>(apiItems(active||kinds[0],9,q,page,category))
  const matches=staticItems.filter(item=>!active&&(!q||(item.title+' '+item.category+' '+item.copy).toLowerCase().includes(q.toLowerCase()))&&(!category||item.category===category))
  const title=type==='safety'?'Maritime safety resources':'Newsroom and media centre'
  useSeo(title,type==='safety'?'Practical maritime awareness and safety information for communities.':'Read updates, announcements, and public statements about the proposal.')
  return <><PageHeader eyebrow={type==='safety'?'Maritime safety':'Newsroom'} title={title} copy={type==='safety'?'Guides and public information for people who live, work or travel on the coast.':'Source-linked releases, legislative information, public statements and media resources.'} image={type==='safety'?'boating':'port'}/>
    <section className="section wrap">
      <SearchField label={'Search '+title} onSearch={value=>{setQuery(value);setPage(1)}}/>
      <div className="filter-row">
        {type==='news'?<>{[['','News'],['press','Press releases'],['statement','Statements'],['advisory','Advisories'],['announcement','Announcements']].map(([value,label])=><button className="chip" key={label} aria-pressed={active===value} onClick={()=>{setActive(value);setPage(1)}}>{label}</button>)}</>:<label className="inline-field">Category<select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">All categories</option>{safety.map(item=><option key={item.category}>{item.category}</option>)}</select></label>}
        {type==='news'&&<Link className="chip" to="/gallery">Media gallery <ArrowUpRight size={14}/></Link>}
      </div>
      {(items.data?.items.length||matches.length)?<div className="three-grid">{page===1&&matches.map(item=><Card key={item.slug} base={'/'+type} item={item}/>)}{items.data?.items.map(item=><CmsCard key={item.id} item={item}/>)}</div>:<Notice>{items.loading?'Loading content…':items.error?'Published updates are temporarily unavailable.':'No items match the current selection.'}</Notice>}
      <Pagination total={items.data?.total||0} page={page} limit={9} setPage={setPage}/>
    </section></>
}
export function StaticArticle({type}:{type:'safety'|'news'}){
  const {slug}=useParams()
  const options=type==='safety'?safety:updates
  const item=options.find(entry=>entry.slug===slug)
  useSeo(item?.title||'Page not found',item?.copy||legalNote,!item,item&&'/media/'+item.image+'.webp')
  if(!item)return <Missing/>
  return <><PageHeader eyebrow={item.category} title={item.title} copy={item.copy} image={item.image}/><div className="section wrap narrow">
    {type==='news'&&<p className="card-kicker">Source record · {item.slug.includes('july')?'22 July 2026':'15 October 2024'}</p>}
    <p>{item.body}</p>{item.source&&<TextLink external to={item.source}>Read the source guidance</TextLink>}<Share title={item.title}/>
  </div><div className="section wrap"><SectionIntro title="Related information"/><div className="three-grid">{options.filter(entry=>entry.slug!==slug).slice(0,3).map(entry=><Card key={entry.slug} item={entry} base={'/'+type}/>)}</div></div></>
}
export function CmsDetail({journal=false}:{journal?:boolean}){
  const route=useParams()
  const {slug}=route
  const kind=journal?'journal':route.kind
  const {data:item,status,loading,error}=useApi<Item>('/content/'+encodeURIComponent(kind||'')+'/'+encodeURIComponent(slug||''))
  const related=useApi<Page<Item>>(item?apiItems(item.kind,4,'',1,journal?'':item.category):null)
  useSeo(item?.seo_title||item?.title||'Public Information',item?.seo_description||item?.subtitle||legalNote,!item,item&&journal?journalImage(item):item?.image_id?assetUrl(item.image_id):undefined)
  if(kind==='journal'&&!journal&&slug)return <Navigate replace to={contentPath({kind,slug})}/>
  if(loading)return <div className="section wrap">Loading content…</div>
  if(status===404)return <Missing/>
  if(!item)return <section className="section wrap"><Notice>{error||'This content is currently unavailable.'}</Notice></section>
  return <><PageHeader eyebrow={item.category||humanKind(item.kind)} title={item.title} copy={item.subtitle}/>
    <article className="section wrap narrow">
      {journal&&<p><Link to="/journal">← Back to the Maritime Journal</Link></p>}
      <p className="card-kicker">{[item.author,item.published_at&&prettyDate(item.published_at),journal&&readMinutes(item.body)+' min read'].filter(Boolean).join(' · ')}</p>
      {item.image_id&&<img className="feature-image" src={assetUrl(item.image_id)} alt=""/>}
      <RichText>{item.body}</RichText>
      {item.deadline&&<p><strong>Submission deadline</strong> {new Date(item.deadline).toLocaleString('en-NG',{timeZone:'Africa/Lagos',timeZoneName:'short'})}</p>}
      {item.file_id&&<a className="button outline" href={assetUrl(item.file_id)}><Download size={18}/> Download PDF {item.file_size?'· '+sizeLabel(item.file_size):''}</a>}
      {item.url&&<TextLink external to={item.url}>{item.kind==='video'?'Watch video':'Open related resource'}</TextLink>}
      {item.tags.length>0&&<p className="tags">{item.tags.map(tag=><Link key={tag} to={journal?'/journal'+params({tag}):'/search?q='+encodeURIComponent(tag)}>{tag}</Link>)}</p>}
      {['consultation','job'].includes(item.kind)?<IntakeForm item={item}/>:<Share title={item.title}/>}
    </article>
    {related.data?.items.some(other=>other.id!==item.id)&&<section className="section wrap"><SectionIntro title={journal?"More from the journal":"Related information"}/><div className="three-grid">{related.data.items.filter(other=>other.id!==item.id).slice(0,3).map(other=><CmsCard key={other.id} item={other}/>)}</div></section>}
  </>
}
const journalDescription='Explainers, perspectives and practical public information on Nigeria’s maritime future.'
export function Journal(){
  const [query,setQuery]=useSearchParams()
  const q=(query.get('q')||'').trim().slice(0,120)
  const category=(query.get('category')||'').trim().slice(0,80)
  const tag=(query.get('tag')||'').trim().slice(0,40)
  const page=Math.max(1,Math.min(1000,Math.floor(Number(query.get('page'))||1)))
  const limit=9
  const filtered=Boolean(q||category||tag)
  const clear=!filtered&&page===1
  const articles=useApi<Page<Item>>('/content'+params({kind:'journal',q,category,tag,page,limit}))
  const topics=useApi<{categories:string[];tags:string[]}>('/journal/topics')
  const items=articles.loading?[]:articles.data?.items||[]
  const [feature,...rest]=items
  const highlight=clear&&items.length>0
  const change=(values:Partial<{q:string;category:string;tag:string;page:number}>)=>{
    const next={q,category,tag,page:1,...values}
    setQuery(params({...next,page:next.page>1?next.page:undefined}))
  }
  const available=(items:string[],selected:string)=>Array.from(new Set([...items,...(selected?[selected]:[])]))
  useSeo('Maritime Journal',journalDescription,false,'/media/gulf.webp')
  return <><PageHeader eyebrow="Editorial and public information" title="Maritime Journal" copy={journalDescription} image="gulf"/>
    <section className="section wrap">
      {highlight&&<article className="mandate-detail">
        <Link to={contentPath(feature)} tabIndex={-1} aria-hidden><img src={journalImage(feature)} alt=""/></Link>
        <div>
          <p className="card-kicker">{feature.category||'Maritime Journal'} · {readMinutes(feature.body)} min read</p>
          <h2>{feature.title}</h2>
          {feature.subtitle&&<p>{feature.subtitle}</p>}
          <TextLink to={contentPath(feature)}>Read featured article</TextLink>
        </div>
      </article>}
      <SectionIntro title={filtered?'Search the journal':'Journal archive'} action={<a className="text-link" href={apiRoot+'/journal/feed.xml'}><Rss size={17}/> RSS feed</a>}/>
      <SearchField key={q} label="Search the journal" initial={q} onSearch={value=>change({q:value})} placeholder="Search articles"/>
      <div className="filter-row">
        <label className="inline-field">Category<select value={category} onChange={event=>change({category:event.target.value})}><option value="">All categories</option>{available(topics.data?.categories||[],category).map(value=><option key={value}>{value}</option>)}</select></label>
        <label className="inline-field">Topic<select value={tag} onChange={event=>change({tag:event.target.value})}><option value="">All topics</option>{available(topics.data?.tags||[],tag).map(value=><option key={value}>{value}</option>)}</select></label>
        {filtered&&<Link className="chip" to="/journal">Clear filters</Link>}
      </div>
      {articles.loading?<p role="status">Loading journal articles…</p>:articles.error?<Notice>The journal is temporarily unavailable. Please try again shortly.</Notice>:!items.length?<Notice>{filtered?'No articles match those filters.':'No articles on this page.'}</Notice>:<div className="three-grid">
        {(highlight?rest:items).map(item=><CmsCard key={item.id} item={item}/>)}
      </div>}
      {articles.data&&<Pagination page={page} limit={limit} total={articles.data.total} setPage={value=>change({page:value})}/>}
      {page>1&&!articles.loading&&!items.length&&<TextLink to="/journal">Return to the journal archive</TextLink>}
    </section>
  </>
}
export function Documents(){
  const [q,setQuery]=useState('')
  const [category,setCategory]=useState('')
  const [page,setPage]=useState(1)
  const items=useApi<Page<Item>>(apiItems('document',12,q,page,category))
  const local=sourceDocs.filter(item=>(!category||category===item.category)&&(item.title+' '+item.category+' '+item.source).toLowerCase().includes(q.toLowerCase()))
  useSeo('Document Library','Search parliamentary documents, maritime safety publications and public resources.')
  return <><PageHeader eyebrow="Publications" title="Document library" copy="Find legislative records and publications from established authorities."/>
    <section className="section wrap">
      <SearchField label="Search documents" onSearch={value=>{setQuery(value);setPage(1)}} placeholder="Search publications"/>
      <div className="filter-row"><label className="inline-field">Category<select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}}><option value="">All categories</option>{['Legislative documents','Public information','Maritime safety publications','Policy documents','Reports','Educational materials','Media resources'].map(c=><option key={c}>{c}</option>)}</select></label></div>
      <ul className="document-list">{page===1&&local.map(item=><li key={item.title}><FileText size={26}/><div><a href={item.url} rel="noreferrer">{item.title}</a><small>{item.category} · {item.source} · {item.format}</small></div><a className="text-link" href={item.url} rel="noreferrer" aria-label={'Open '+item.title}>Open <ArrowUpRight size={16}/></a></li>)}
        {items.data?.items.map(item=><li key={item.id}><FileText size={26}/><div><Link to={'/content/document/'+item.slug}>{item.title}</Link><small>{[item.category,item.published_at&&prettyDate(item.published_at),item.file_size&&sizeLabel(item.file_size)].filter(Boolean).join(' · ')}</small></div>{item.file_id&&<a className="text-link" href={assetUrl(item.file_id)} aria-label={'Download '+item.title}>Download <Download size={16}/></a>}</li>)}</ul>
      {!local.length&&!items.data?.items.length&&<Notice>{items.loading?'Loading documents…':'No matching documents.'}</Notice>}
      <Pagination page={page} total={items.data?.total||0} limit={12} setPage={setPage}/>
    </section></>
}
export function Gallery(){
  const photos=useApi<Page<Item>>(apiItems('gallery',30))
  const videos=useApi<Page<Item>>(apiItems('video',30))
  useSeo('Media Gallery','Browse illustrative maritime scenes and approved public media.')
  return <><PageHeader eyebrow="Media centre" title="Maritime media gallery" copy="Illustrative scenes from a proposed maritime vision and public media resources." image="gulf"/><section className="section wrap">
    <SectionIntro title="Photo collection" copy="The concept images are generated illustrations. They do not depict actual Nigerian Coast Guard assets, personnel or operations."/>
    <div className="three-grid">{galleries.map(([image,title])=><figure className="card gallery-card" key={image}><a href={'/media/'+image+'.webp'} aria-label={'Open '+title}><img src={'/media/'+image+'.webp'} alt={galleryAlt(title)} width="500" height="375" loading="lazy"/></a><figcaption>{title}</figcaption></figure>)}{photos.data?.items.map(item=><CmsCard key={item.id} item={item}/>)}</div>
    <div className="spacious"><SectionIntro title="Videos"/>{videos.data?.items.length?<div className="three-grid">{videos.data.items.map(item=><CmsCard key={item.id} item={item}/>)}</div>:<Notice>No videos have been published.</Notice>}</div>
  </section></>
}
export function GlobalSearch(){
  const [query,setQuery]=useSearchParams()
  const q=query.get('q')?.slice(0,120)||''
  const category=query.get('category')||''
  const page=Math.min(1000,Math.max(1,Number(query.get('page'))||1))
  const items=useApi<Page<Item>>(q?'/content'+params({q,category,page,limit:10}):null)
  useSeo('Search','Search public content and resources.',true)
  const index=[
    ...directory.map(([url,title])=>({url,title,category:'Website page',body:''})),
    ...safety.map(item=>({url:'/safety/'+item.slug,title:item.title,category:item.category,body:item.body})),
    ...updates.map(item=>({url:'/news/'+item.slug,title:item.title,category:item.category,body:item.body})),
    ...sourceDocs.map(item=>({url:item.url,title:item.title,category:item.category,body:item.source})),
    ...faq.map(([title,body])=>({url:'/faq',title,category:'FAQ',body})),
  ]
  const matches=q&&page===1?index.filter(item=>(item.title+' '+item.category+' '+item.body+' '+item.url).toLowerCase().includes(q.toLowerCase())&&(!category||item.category===category)): []
  const update=(value:string,cat='',number=1)=>setQuery(value?{q:value,...(cat?{category:cat}:{}),...(number>1?{page:String(number)}:{})}:{})
  return <><PageHeader eyebrow="Search" title="Search public information"/><section className="section wrap narrow">
    <SearchField key={q} label="Search all public information" initial={q} onSearch={update}/>
    <div className="filter-row">{['legislation','maritime safety','recruitment'].map(value=><button key={value} className="chip" onClick={()=>update(value)}>{value}</button>)}</div>
    {q&&<label className="inline-field">Category<select value={category} onChange={e=>update(q,e.target.value)}><option value="">All categories</option>{Array.from(new Set([...index.map(item=>item.category),...(items.data?.items.map(item=>item.category).filter(Boolean)||[]),...(category?[category]:[])])).sort().map(value=><option key={value}>{value}</option>)}</select></label>}
    {!q?<p>Enter a phrase to find guides, news, documents, FAQs and other published material.</p>:<><h2>Results for “{q}”</h2><ul className="search-results">{matches.map(item=><li key={item.url+'-'+item.title}><p className="card-kicker">{item.category}</p><TextLink to={item.url} external={item.url.startsWith('https:')}>{item.title}</TextLink></li>)}{items.data?.items.map(item=><li key={item.id}><p className="card-kicker">{item.category||item.kind}</p><TextLink to={contentPath(item)}>{item.title}</TextLink>{item.subtitle&&<p>{item.subtitle}</p>}</li>)}</ul>{!matches.length&&!items.data?.items.length&&<Notice>{items.loading?'Searching…':'No matching results. Try a broader phrase.'}</Notice>}{items.error&&<p role="status">Live search is temporarily unavailable. Website resources can still be searched.</p>}<Pagination page={page} total={items.data?.total||0} limit={10} setPage={number=>update(q,category,number)}/></>}
  </section></>
}
export function Community(){
  useSeo('Maritime Community','Public resources for fishers, coastal communities and maritime operators.')
  return <><PageHeader eyebrow="Community resources" title="For people who live and work by the water" copy="Accessible material for coastal communities, fishers, boat operators, students and maritime stakeholders." image="fishing"/>
  <section className="section wrap"><SectionIntro title="Start with these resources"/><div className="three-grid">{safety.filter(entry=>['fishing-community-safety','coastal-community-resources','prepare-before-you-depart'].includes(entry.slug)).map(entry=><Card item={entry} key={entry.slug} base="/safety"/>)}</div><div className="spacious"><TextLink to="/documents">Downloadable resources and public notices</TextLink><TextLink to="/faq">Common questions</TextLink></div></section></>
}
export function Emergency(){
  useSeo('Maritime Emergency Information','Learn where to find established Nigerian maritime emergency information.')
  return <><PageHeader eyebrow="Safety information" title="Maritime emergency preparedness" copy="Know how to reach established maritime authorities before you depart." image="helicopter"/>
    <section className="section wrap narrow"><Notice kind="alert"><strong>Use established maritime distress channels for an active emergency.</strong><p>This platform does not monitor distress reports or dispatch emergency assistance.</p></Notice>
      <h2>Prepare before going to sea</h2><p>Consult the current emergency communication and safety guidance provided by NIMASA and the applicable port or maritime authority. Review and practise your vessel’s emergency arrangements.</p>
      <h2>What to provide when reporting distress</h2><ul><li>Vessel name or call sign and position.</li><li>Nature of the emergency and immediate dangers.</li><li>Number of people aboard and type of assistance needed.</li><li>How the responding authority can maintain contact.</li></ul>
      <h2>Emergency contact information</h2><p>Official emergency contact details will be published following formal establishment and authorization.</p><TextLink external to={nimasa}>NIMASA maritime safety and emergency services</TextLink><TextLink external to={npa}>Nigerian Ports Authority guidance</TextLink>
    </section></>
}
export function Authorised({type,config}:{type:'careers'|'consultation';config?:Config}){
  const careers=type==='careers'
  const active=careers?config?.recruitment:config?.consultation
  const items=useApi<Page<Item>>(active?apiItems(careers?'job':'consultation'):null)
  const title=careers?'Careers and recruitment':'Public consultations'
  useSeo(title,legalNote)
  return <><PageHeader eyebrow={careers?'Careers':'Public engagement'} title={title}/><section className="section wrap narrow">
    {!active?<Notice><strong>{careers?'Recruitment is currently closed':'No consultation is accepting submissions'}</strong><p>{careers?'Recruitment announcements will only be published following formal establishment and official authorization.':'Consultation notices and submission forms will be published when authorization is confirmed.'}</p></Notice>:items.data?.items.length?<div className="two-grid">{items.data.items.map(item=><CmsCard key={item.id} item={item}/>)}</div>:<Notice>{items.loading?'Loading announcements…':'No opportunities have been published.'}</Notice>}
    {careers&&<><h2>Protect yourself from recruitment fraud</h2><p>Verify any announcement through approved channels before paying money, sharing personal documents, or dealing with an agent.</p>{active&&<ApplicationStatus/>}</>}
  </section></>
}
export function Partnerships(){
  useSeo('Partnerships','Learn about proposed cooperation with maritime stakeholders.')
  return <><PageHeader eyebrow="Stakeholder engagement" title="Maritime cooperation" copy="Explore possible areas for cooperation with communities, researchers, training institutions and maritime organisations." image="cooperation"/><section className="section wrap">
    <div className="three-grid">{[[<Globe2/>,'International cooperation','Exchange good practice on maritime safety, stewardship and education.'],[<Users/>,'Institutions and communities','Learn from coastal communities and identify practical education and research opportunities.'],[<Ship/>,'Industry and infrastructure','Discuss maritime safety and communications with vessel operators, ports and related organisations.']].map(([icon,title,body])=><article className="plain-card" key={String(title)}><span className="mini-icon">{icon}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="spacious"><TextLink to="/contact?category=Partnership%20enquiry">Send a partnership enquiry</TextLink></div>
  </section></>
}
export function FAQs(){
  const items=useApi<Page<Item>>(apiItems('faq'))
  useSeo('Frequently Asked Questions',legalNote)
  return <><PageHeader eyebrow="Public information" title="Frequently asked questions"/><section className="section wrap narrow"><FAQList extra={items.data?.items}/></section></>
}
export function Privacy({config}:{config?:Config}){
  useSeo('Privacy and Cookies','How this platform handles public enquiries, subscriptions, and administrator sessions.')
  return <><PageHeader eyebrow="Site policies" title="Privacy and cookies"/><section className="section wrap narrow">
  <p>The Provisional Committee uses this platform to share information about a proposed institution and, where enabled, to receive public enquiries, subscriptions and authorized submissions.</p>
  <h2>Information we receive</h2><p>Forms request only the information listed on the form. The service records consent and technical information needed to keep the service secure. Optional uploads are accepted only when an authorized form explicitly asks for them.</p>
  <h2>How information is used</h2><p>Authorized staff can use enquiries and submissions to respond, review and manage the request. Newsletter addresses are used for subscriptions and can be removed through the unsubscribe process. Form contents are not published.</p>
  <h2>Cookies and third parties</h2><p>The administration portal uses a session cookie for authentication. Interactive maps request tiles from OpenStreetMap only when you load them. External links and email delivery may involve third-party services.</p>
  <h2>Retention and requests</h2><p>Contact the committee to ask about your information, request a correction or removal, or make a privacy enquiry. Information is reviewed for deletion when it is no longer needed for the stated purpose or a legal requirement.</p>
  <a href={'mailto:'+(config?.settings.publicEmail||'pcenigeriancoastguard@gmail.com')}>{config?.settings.publicEmail||'pcenigeriancoastguard@gmail.com'}</a><br/><TextLink external to="https://ndpc.gov.ng/">Nigeria Data Protection Commission</TextLink>
  </section></>
}
export function Accessibility(){
  useSeo('Accessibility','Accessibility features and feedback for this website.')
  return <><PageHeader eyebrow="Site policies" title="Accessibility"/><section className="section wrap narrow"><p>The platform uses keyboard-accessible controls, visible focus indicators, semantic page headings, responsive layouts, and reduced-motion support. The port directory provides an alternative to loading the interactive map.</p><TextLink to="/contact?category=Public%20information">Report an accessibility issue</TextLink></section></>
}
export function Missing(){
  return <><PageHeader eyebrow="Page unavailable" title="We couldn’t find that page"/><div className="section wrap"><TextLink to="/">Return home</TextLink><TextLink to="/search">Search public information</TextLink></div></>
}
