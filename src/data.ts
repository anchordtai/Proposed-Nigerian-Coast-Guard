export const name = 'Provisional Committee for the Establishment of the Nigerian Coast Guard (PCNCG)'
export const defaultEmail = 'pcenigeriancoastguard@gmail.com'
export const nass = 'https://nass.gov.ng/page/notices.html'
export const nimasa = 'https://nimasa.gov.ng/what-we-do/maritime-safety-security/'
export const npa = 'https://nigerianports.gov.ng/faqs/'
export const legislativeRecord = 'https://nass.gov.ng/documents/billdownload/11207.pdf'
export const julyReport = 'https://naltf.gov.ng/senate-suspends-report-on-nigeria-coast-guard-bill-over-concerns-of-role-duplication-with-nigerian-navy/'
export const legalNote = 'This is a public information platform for a proposed institution. It has no operational, recruitment or enforcement authority.'
export const proposedNotice = 'Awaiting legislative establishment'

export const paths = [
  ['/about','About'], ['/mandate','Mandate'], ['/legislation','Legislation'],
  ['/safety','Maritime Safety'], ['/news','Newsroom'], ['/journal','Journal'],
] as const

export const directory = [
  ['/about','About the proposal'],['/mandate','Proposed mandate'],['/legislation','Legislative progress'],
  ['/safety','Maritime safety'],['/emergency','Emergency information'],['/community','Community resources'],
  ['/news','Newsroom'],['/journal','Maritime Journal'],['/documents','Document library'],['/map','Maritime map'],['/faq','Frequently asked questions'],
  ['/contact','Contact'],['/partnerships','Partnerships'],['/careers','Careers'],['/consultation','Consultations'],
  ['/privacy','Privacy'],['/gallery','Media gallery'],
] as const

export const faq = [
  ['Is the Nigerian Coast Guard operational?', 'The Nigerian Coast Guard described here is a proposal. This site provides public information and does not operate an emergency, recruitment or enforcement service.'],
  ['Where can I check the current legislative position?', 'The Legislative Journey page links to source records. Verify the latest activity against official National Assembly records.'],
  ['Can I apply for a job or pay a registration fee?', 'Recruitment announcements will only be published following formal establishment and official authorization. Treat any demand for payment or personal documents by an unofficial agent as suspicious.'],
  ['Can I use the contact form for emergencies?', 'Use established maritime distress channels and the applicable existing authorities. The committee’s general contact channel does not dispatch emergency assistance.'],
  ['Where do I find maritime safety information?', 'Use the Maritime Safety hub and follow guidance published by the Nigerian Maritime Administration and Safety Agency (NIMASA) and other competent authorities.'],
]

export const mandates = [
  { title:'Maritime Safety & Security', image:'patrol', icon:'shield', copy:'A proposed framework for safer navigation, coordinated maritime security and the protection of lives at sea.', details:'Possible activities include safety awareness, maritime crime prevention, coastal protection, fisheries and port-security coordination, and protection of maritime infrastructure. Any future enforcement function depends on the enacted legislation and applicable policy.' },
  { title:'Search & Rescue', image:'rescue', icon:'life', copy:'A vision for coordinated maritime assistance, emergency preparedness and response across coastal waters.', details:'A future framework could support search-and-rescue coordination, humanitarian assistance and disaster response, in cooperation with existing authorities. Readiness would include interoperable communications, competence standards and clear responsibilities.' },
  { title:'Marine Environmental Protection', image:'environment', icon:'waves', copy:'Protecting Nigeria’s marine resources and coastal ecosystems through prevention and stewardship.', details:'Priorities may include pollution prevention, coordinated pollution response, protection of marine resources, public education and cooperation with coastal communities, researchers and environmental organisations.' },
]

export const milestones = [
  {title:'First reading recorded', date:'3 October 2024', text:'The Senate Bills Department lists SB. 575, Nigeria Coast Guard Bill, 2024, for first reading.', url:legislativeRecord, status:'Official register'},
  {title:'Second reading and referral', date:'15 October 2024', text:'The Senate Bills Department records a second reading and referral to the Committee on Marine Transport.', url:legislativeRecord, status:'Official register'},
  {title:'Public hearing', date:'During committee review', text:'The committee reported that it held a public hearing and consulted stakeholders.', url:julyReport, status:'Parliamentary reporting'},
  {title:'Consideration of committee report stepped down', date:'22 July 2026', text:'The Senate stepped down consideration of the report amid concerns about overlap with existing maritime and security agencies. A subsequent stage is not stated here.', url:julyReport, status:'Parliamentary reporting'},
]

export type Resource = {slug:string;title:string;copy:string;body:string;category:string;image:string;source?:string}
export const safety: Resource[] = [
  {slug:'prepare-before-you-depart',title:'Prepare before you depart',copy:'Use a short pre-departure check to plan a coastal trip.',category:'Boating Safety',image:'boating',source:nimasa,body:'Review official weather and navigation information before departure. Make a voyage plan, share your intended return with someone ashore, and check that everyone has appropriate flotation equipment. Confirm that communications and other safety equipment are working and that your vessel and crew meet applicable requirements.'},
  {slug:'reporting-distress-at-sea',title:'Reporting distress at sea',copy:'Know what information established maritime responders may need.',category:'Search and Rescue Awareness',image:'helicopter',source:nimasa,body:'Use established maritime distress procedures and the applicable competent authority. Be ready to identify your vessel, provide a position, describe the emergency and any immediate dangers, state the number of people aboard, and explain the assistance required. Follow directions from the responding authority.'},
  {slug:'reduce-marine-pollution',title:'Reduce marine pollution',copy:'Practical ways to protect marine habitats and shorelines.',category:'Pollution Prevention',image:'environment',source:'https://nimasa.gov.ng/marine-environment-management/',body:'Use appropriate collection points for waste and follow applicable vessel pollution prevention requirements. If you see suspected pollution, report observations through the appropriate authority’s published channels. Keep a safe distance and avoid direct contact with unidentified material.'},
  {slug:'fishing-community-safety',title:'Safety for fishing communities',copy:'Plan coastal outings with weather, visibility and communication in mind.',category:'Fishing Safety',image:'fishing',source:nimasa,body:'Plan with local conditions in mind, check the vessel before leaving shore and carry suitable flotation equipment. Review established guidance, allow for changing visibility and weather, and keep someone ashore informed about your plans.'},
  {slug:'port-navigation-information',title:'Prepare for a port call',copy:'Find the correct source for port and navigation information.',category:'Maritime Safety',image:'port',source:npa,body:'Before entering or leaving port, check the applicable Port Control instructions, navigation notices and published guidance. For terminal and port contacts, use the official Nigerian Ports Authority directory.'},
  {slug:'maritime-environment-basics',title:'Protecting coastal habitats',copy:'How marine litter and pollution can affect coastal livelihoods.',category:'Marine Environmental Protection',image:'mangroves',source:'https://nimasa.gov.ng/marine-environment-management/',body:'Healthy coastal habitats support food, livelihoods and biodiversity. Preventing litter and reporting pollution through appropriate channels can support coastal stewardship. Follow relevant environmental requirements and verified local notices.'},
  {slug:'understand-coastal-conditions',title:'Understand coastal conditions',copy:'Check conditions and local guidance before visiting waterfronts.',category:'Coastal Safety',image:'coastline',body:'Consult official local weather forecasts and follow posted notices at coastal destinations. Discuss your plans with people in your group and respect closures and directions from competent local authorities.'},
  {slug:'build-emergency-readiness',title:'Build emergency readiness',copy:'Discuss roles and prepare an information checklist before a voyage.',category:'Emergency Preparedness',image:'training',source:nimasa,body:'Review your vessel’s emergency arrangements with those aboard. Identify where the safety equipment is stored and what information to give competent authorities when assistance is needed.'},
  {slug:'coastal-community-resources',title:'Share coastal safety resources',copy:'Find accessible materials for local maritime groups.',category:'Maritime Community Awareness',image:'education',body:'Use verified safety information in community meetings and make printed or low-bandwidth versions available where useful. Seek feedback from fishers, boat operators and other users about information gaps.'},
  {slug:'learn-about-navigation',title:'Learning about maritime navigation',copy:'Start with official publications and formal instruction.',category:'Public Education',image:'navigation',source:npa,body:'Use official navigation publications, charts and training sources for the waters and vessel type you intend to operate. The geographic explorer here is for education and cannot be used for navigation.'},
]

export const updates:Resource[]=[
  {slug:'senate-committee-report-july-2026', title:'Senate steps down consideration of Coast Guard report',copy:'Parliamentary reporting describes further scrutiny of the proposed bill.',body:milestones[3].text,category:'Legislative update',image:'gulf',source:julyReport},
  {slug:'senate-bills-register',title:'Find the proposal in the Senate Bills Register',copy:'The official register records first and second readings for SB. 575.',body:milestones[1].text,category:'Public information',image:'coastline',source:legislativeRecord},
]

export const sourceDocs = [
  {title:'Senate Bills Register · SB. 575',category:'Legislative documents',format:'PDF',url:legislativeRecord,source:'National Assembly of Nigeria'},
  {title:'National Assembly proceedings and documents',category:'Legislative documents',format:'Website',url:nass,source:'National Assembly of Nigeria'},
  {title:'Maritime Safety & Security Directorate',category:'Maritime safety publications',format:'Website',url:nimasa,source:'NIMASA'},
  {title:'Port operational information',category:'Maritime safety publications',format:'Website',url:npa,source:'Nigerian Ports Authority'},
  {title:'Nigeria Data Protection Act 2023',category:'Policy documents',format:'PDF',url:'https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf',source:'Nigeria Data Protection Commission'},
]

export const galleries = [
  ['coastline','Coastline at first light'],['patrol','Maritime safety vessel concept'],['rescue','Maritime assistance concept'],
  ['fishing','Coastal livelihoods'],['environment','Marine environmental stewardship'],['port','Commercial port activity'],
  ['helicopter','Search and rescue aviation concept'],['navigation','Navigation technology'],['gulf','Gulf of Guinea maritime concept'],
  ['boating','Coastal navigation'],['training','Safety training concept'],['cooperation','Maritime research and cooperation'],
  ['offshore','Offshore infrastructure'],['mangroves','Mangrove waterways'],['surveillance','Coastal observation concept'],
  ['pollution','Pollution response concept'],['shipping','Maritime trade'],['education','Community safety education'],
]

export const places = [
  {name:'Lagos Port Complex',coords:[6.445,3.368] as [number,number],label:'Lagos · Apapa'},
  {name:'Tin Can Island Port',coords:[6.422,3.339] as [number,number],label:'Lagos · Tin Can Island'},
  {name:'Warri Port',coords:[5.512,5.735] as [number,number],label:'Delta · Warri'},
  {name:'Rivers Port',coords:[4.763,7.012] as [number,number],label:'Rivers · Port Harcourt'},
  {name:'Onne Port',coords:[4.695,7.153] as [number,number],label:'Rivers · Onne'},
  {name:'Calabar Port',coords:[4.959,8.319] as [number,number],label:'Cross River · Calabar'},
]

export const contactCategories=['General enquiry','Maritime safety','Public information','Media enquiry','Legislative information','Partnership enquiry','Environmental concern','Other']
