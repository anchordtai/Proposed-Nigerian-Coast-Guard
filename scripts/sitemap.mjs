import { readFile, mkdir, writeFile } from 'node:fs/promises'

const site=new URL(process.env.VITE_SITE_URL||process.env.VERCEL_PROJECT_PRODUCTION_URL&&'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL||'https://proposed-nigerian-coast-guard.vercel.app')
const meta={
  '/':['Proposed Nigerian Coast Guard','Explore the proposed mandate, legislative journey and maritime safety resources for Nigeria.'],
  '/about':['About the Proposal','Background, proposed mission, vision and responsibilities.'],
  '/mandate':['Proposed Mandate','Proposed maritime safety, rescue and environmental responsibilities.'],
  '/legislation':['Legislative Journey','Source-linked legislative milestones and parliamentary records.'],
  '/safety':['Maritime Safety','Practical awareness and safety information for coastal communities.'],
  '/news':['Newsroom','Read legislative news, announcements and public statements.'],
  '/journal':['Maritime Journal','Explainers, perspectives and practical public information on Nigeria’s maritime future.'],
  '/community':['Community Resources','Public safety resources for fishers, operators and coastal communities.'],
  '/documents':['Document Library','Find parliamentary records, public resources and maritime publications.'],
  '/emergency':['Maritime Emergency Information','Find guidance and links to established maritime authorities.'],
  '/faq':['Frequently Asked Questions','Find common answers about the proposal.'],
  '/map':['Maritime Map','An educational map of Nigerian commercial ports and the Gulf of Guinea.'],
  '/gallery':['Media Gallery','Illustrative maritime scenes and public media.'],
  '/contact':['Public Enquiries','Contact the Provisional Committee for general enquiries.'],
  '/careers':['Careers','Authorization status and information on avoiding recruitment fraud.'],
  '/consultation':['Public Consultations','Public consultation notices and authorization status.'],
  '/partnerships':['Partnerships','Explore proposed maritime cooperation.'],
  '/privacy':['Privacy and Cookies','How the platform handles submissions and cookies.'],
  '/accessibility':['Accessibility','Website accessibility information and feedback.'],
}
const template=await readFile('dist/index.html','utf8')
const htmlEscape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')
for(const [path,[title,description]] of Object.entries(meta)){
  const heading=htmlEscape(path==='/'?title:title+' | Proposed Nigerian Coast Guard')
  const canonical=htmlEscape(new URL(path,site).href)
  const desc=htmlEscape(description)
  const html=template.replace(/<title>[^<]*<\/title>/, '<title>'+heading+'</title>')
    .replace(/name="description" content="[^"]*"/, 'name="description" content="'+desc+'"')
    .replace(/property="og:title" content="[^"]*"/, 'property="og:title" content="'+heading+'"')
    .replace(/property="og:description" content="[^"]*"/, 'property="og:description" content="'+desc+'"')
    .replace('</head>',[
      '<link rel="canonical" href="'+canonical+'"/>',
      '<meta property="og:url" content="'+canonical+'"/>',
      '<meta property="og:image" content="'+htmlEscape(new URL('/media/maritime-hero.webp',site).href)+'"/>',
      '<meta name="twitter:title" content="'+heading+'"/>',
      '<meta name="twitter:description" content="'+desc+'"/>',
      '<meta name="twitter:image" content="'+htmlEscape(new URL('/media/maritime-hero.webp',site).href)+'"/>',
      path==='/journal'?'<link rel="alternate" type="application/rss+xml" title="Maritime Journal" href="/api/journal/feed.xml"/>':'',
      path==='/'?'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:title,url:site.href})+'</script>':'',
      '</head>',
    ].join('\n    '))
  const folder='dist'+path
  await mkdir(folder,{recursive:true})
  await writeFile(folder.replace(/\/$/,'')+'/index.html',html)
}
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+Object.keys(meta).map(path=>'<url><loc>'+htmlEscape(new URL(path,site).href)+'</loc></url>').join('')+'</urlset>\n')
await writeFile('dist/robots.txt','User-agent: *\nDisallow: /admin\nDisallow: /api\nDisallow: /newsletter/\nSitemap: '+new URL('/sitemap.xml',site).href+'\n')
