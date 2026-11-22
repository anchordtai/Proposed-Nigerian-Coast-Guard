import {lazy,Suspense,useEffect,useRef} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter,Route,Routes,useLocation} from 'react-router-dom'
import {params,useApi,type Config,type Item,type Page} from './api'
import {Contact,TokenPage} from './forms'
import {About,Accessibility,Authorised,CmsDetail,Community,Documents,Emergency,FAQs,Gallery,GlobalSearch,Home,Legislation,Listing,Mandate,Missing,Partnerships,Privacy,StaticArticle} from './pages'
import {Footer,Header} from './ui'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import './styles.css'

const Admin=lazy(()=>import('./admin'))
const Map=lazy(()=>import('./map'))

function App(){
  const {pathname,hash}=useLocation()
  const main=useRef<HTMLElement>(null)
  const first=useRef(true)
  const config=useApi<Config>('/config')
  const menu=useApi<Page<Item>>('/content'+params({kind:'menu',limit:25}))
  const social=useApi<Page<Item>>('/content'+params({kind:'social',limit:15}))
  useEffect(()=>{
    if(first.current){first.current=false;return}
    if(hash && !hash.startsWith('#token=')) {
      requestAnimationFrame(()=>document.getElementById(hash.slice(1))?.scrollIntoView())
    } else window.scrollTo(0,0)
    main.current?.focus({preventScroll:true})
  },[pathname,hash])
  return <>
  <Header customMenu={menu.data?.items||[]}/>
  <main id="main" ref={main} tabIndex={-1}><Suspense fallback={<div className="section wrap" role="status">Loading…</div>}><Routes>
    <Route index element={<Home config={config.data}/>}/>
    <Route path="/about" element={<About/>}/>
    <Route path="/mandate" element={<Mandate/>}/>
    <Route path="/legislation" element={<Legislation/>}/>
    <Route path="/safety" element={<Listing key="safety" type="safety"/>}/>
    <Route path="/safety/:slug" element={<StaticArticle type="safety"/>}/>
    <Route path="/news" element={<Listing key="news" type="news"/>}/>
    <Route path="/news/:slug" element={<StaticArticle type="news"/>}/>
    <Route path="/community" element={<Community/>}/>
    <Route path="/documents" element={<Documents/>}/>
    <Route path="/emergency" element={<Emergency/>}/>
    <Route path="/faq" element={<FAQs/>}/>
    <Route path="/map" element={<Map/>}/>
    <Route path="/search" element={<GlobalSearch/>}/>
    <Route path="/gallery" element={<Gallery/>}/>
    <Route path="/contact" element={<Contact config={config.data}/>}/>
    <Route path="/careers" element={<Authorised type="careers" config={config.data}/>}/>
    <Route path="/consultation" element={<Authorised type="consultation" config={config.data}/>}/>
    <Route path="/partnerships" element={<Partnerships/>}/>
    <Route path="/privacy" element={<Privacy config={config.data}/>}/>
    <Route path="/accessibility" element={<Accessibility/>}/>
    <Route path="/content/:kind/:slug" element={<CmsDetail/>}/>
    <Route path="/newsletter/:action" element={<TokenPage/>}/>
    <Route path="/admin/:action" element={<TokenPage/>}/>
    <Route path="/admin" element={<Admin/>}/>
    <Route path="*" element={<Missing/>}/>
  </Routes></Suspense></main>
  <Footer config={config.data} social={social.data?.items||[]}/>
  </>
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><App/></BrowserRouter>)
