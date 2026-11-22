import {useEffect,useRef,useState} from 'react'
import {MapPin} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {npa,places} from './data'
import {Notice,PageHeader,TextLink,useSeo} from './ui'

export default function MaritimeMap(){
  const ref=useRef<HTMLDivElement>(null)
  const map=useRef<L.Map|null>(null)
  const [load,setLoad]=useState(false)
  const [chosen,setChosen]=useState('')
  const [failed,setFailed]=useState(false)
  useSeo('Maritime Map','An educational map of selected Nigerian commercial ports and the Gulf of Guinea.')
  useEffect(()=>{
    if(!ref.current||!load)return
    const instance=L.map(ref.current,{scrollWheelZoom:false}).setView([5.65,5.85],7)
    map.current=instance
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'})
      .on('tileerror',()=>setFailed(true)).addTo(instance)
    for(const place of places)L.circleMarker(place.coords,{radius:7,color:'#f2dc99',weight:2,fillColor:'#0d3b52',fillOpacity:1}).bindTooltip(place.name).addTo(instance)
    return()=>{map.current=null;instance.remove()}
  },[load])
  return <><PageHeader eyebrow="Maritime geography" title="Nigeria and the Gulf of Guinea" copy="Explore selected commercial ports and the coast in an educational map." image="gulf"/>
    <section className="section wrap">
      <Notice>For education only. Consult current official charts, notices, and applicable navigational authorities when planning a voyage.</Notice>
      {!load&&<div className="map-placeholder"><MapPin size={32}/><h2>Explore public maritime locations</h2><p>Loading the map fetches tiles from OpenStreetMap. The port directory below works without the map.</p><button className="button gold" onClick={()=>setLoad(true)}>Load interactive map</button></div>}
      {load&&<><div ref={ref} className="leaflet-map" aria-label="Interactive map of Nigerian commercial ports"/>{failed&&<p role="status">Some map tiles are unavailable. The port directory is still available below.</p>}</>}
      <h2>Commercial port directory</h2>
      <ul className="port-list">{places.map(place=><li key={place.name}>{load?<button aria-pressed={chosen===place.name} onClick={()=>{map.current?.setView(place.coords,12);setChosen(place.name)}}><MapPin size={18}/><span><strong>{place.name}</strong><small>{place.label}</small></span></button>:<><MapPin size={18}/><span><strong>{place.name}</strong><small>{place.label}</small></span></>}</li>)}</ul>
      <TextLink external to={npa}>Source: Nigerian Ports Authority</TextLink>
    </section>
  </>
}
