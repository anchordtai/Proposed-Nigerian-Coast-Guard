import {useEffect,useState} from 'react'

export const apiRoot=(import.meta.env.VITE_API_URL || '/api').replace(/\/$/,'')
export const assetUrl=(id:string,admin=false)=>apiRoot+(admin?'/admin':'')+'/media/'+encodeURIComponent(id)

export async function request<T>(path:string, options:RequestInit={}) {
  const headers=new Headers(options.headers)
  if(typeof options.body==='string') headers.set('Content-Type','application/json')
  const res=await fetch(apiRoot+path,{...options,headers,credentials:'same-origin'})
  if(!res.ok) {
    const {error}=await res.json().catch(()=>({error:''}))
    throw new ApiError(res.status,error||'This service is temporarily unavailable.')
  }
  if(res.status===204) return undefined as T
  if(!res.headers.get('content-type')?.includes('application/json')) throw new ApiError(503,'This service is temporarily unavailable.')
  return await res.json() as T
}
export class ApiError extends Error {
  constructor(public status:number,message:string){super(message)}
}

export function useApi<T>(path:string|null,revision=0) {
  const [state,setState]=useState<{data?:T;error?:string;status?:number;loading:boolean}>({loading:!!path})
  useEffect(()=>{
    if(!path){setState({loading:false});return}
    const controller=new AbortController()
    setState(old=>({...old,error:undefined,status:undefined,loading:true}))
    request<T>(path,{signal:controller.signal}).then(data=>setState({data,loading:false})).catch((reason:unknown)=>{
      if(controller.signal.aborted) return
      setState({error:reason instanceof Error?reason.message:'Request failed.',status:reason instanceof ApiError?reason.status:undefined,loading:false})
    })
    return ()=>controller.abort()
  },[path,revision])
  return state
}

export type Item = {
  id:string;kind:string;slug:string;title:string;subtitle:string;body:string;category:string;
  author:string;tags:string[];image_id:string|null;file_id:string|null;file_size?:number;url:string;
  seo_title:string;seo_description:string;milestone_status:string;event_date:string|null;
  deadline:string|null;position:number;status:string;published_at:string|null;updated_at:string|null;
}
export type Page<T>={items:T[];total:number;page:number}
export type Config={engagement:boolean;newsletter:boolean;consultation:boolean;recruitment:boolean;settings:Record<string,string>}
export type Staff={id:string;email:string;roles:string[];permissions:string[]}
export type Asset={id:string;name:string;mime:string;size:number;downloads:number;created_at:string}
export const post=(value:unknown,method='POST')=>({method,body:JSON.stringify(value)})
export function params(values:Record<string,string|number|undefined>){
  return '?'+new URLSearchParams(Object.entries(values).flatMap(([key,val])=>val===undefined||val===''?[]:[[key,String(val)]]))
}
