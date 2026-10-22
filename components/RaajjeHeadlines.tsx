'use client';
import {useEffect,useState} from 'react';

type Headline={title:string;url:string};
type Feed={source:string;updatedAt:string|null;items:Headline[]};
const source='https://raajje.mv/category/news';
export default function RaajjeHeadlines(){
 const [feed,setFeed]=useState<Feed|null>(null);
 useEffect(()=>{
  let active=true;
  const load=()=>fetch('/Vote/raajje-headlines.json',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json()})
   .then((value:Feed)=>{if(active&&Array.isArray(value.items))setFeed(value)})
   .catch(()=>{if(active)setFeed({source:'Raajje.mv',updatedAt:null,items:[]})});
  void load();
  const interval=window.setInterval(()=>void load(),5*60*1000);
  return()=>{active=false;window.clearInterval(interval)};
 },[]);
 const headlines=(feed?.items||[]).filter(h=>h.url?.startsWith('https://raajje.mv/')||h.url?.startsWith('https://www.raajje.mv/'));
 return <section aria-label="Raajje.mv latest headlines" className="mdp-raajje-news">
  <div className="mdp-raajje-label">Raajje.mv <span>NEWS</span></div>
  <div className="mdp-raajje-window">{headlines.length?
   <div className="mdp-raajje-track">{[...headlines,...headlines].map((h,i)=><a key={i} href={h.url} target="_blank" rel="noopener noreferrer" lang="dv" dir="rtl">{h.title}<span aria-hidden="true"> ● </span></a>)}</div>:
   <a href={source} target="_blank" rel="noopener noreferrer">Headlines unavailable — open Raajje.mv News ↗</a>}
  </div>
  <a className="mdp-raajje-open" href={source} target="_blank" rel="noopener noreferrer">All news ↗</a>
 </section>;
}
