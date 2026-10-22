'use client';
import {useEffect,useState} from 'react';
type Item={title:string;url:string};
type Feed={source:string;updatedAt:string|null;items:Item[]};
const destination='https://mdp.org.mv/announcements';
export default function MDPAnnouncementTicker(){
 const [feed,setFeed]=useState<Feed|null>(null);
 useEffect(()=>{
  let active=true;
  const load=()=>fetch('/Vote/mdp-announcements.json',{cache:'no-store'})
   .then(r=>{if(!r.ok)throw Error('Feed unavailable');return r.json()})
   .then((f:Feed)=>{if(active)setFeed(f)})
   .catch(()=>{if(active)setFeed({source:'MDP',updatedAt:null,items:[]})});
  void load();
  const timer=window.setInterval(()=>void load(),300000);
  return()=>{active=false;window.clearInterval(timer)};
 },[]);
 const items=(feed?.items||[]).filter(i=>i.title&&/^https:\/\/(www\.)?mdp\.org\.mv\//.test(i.url));
 return <section className="mdp-raajje-news" aria-label="Latest MDP announcements">
  <div className="mdp-raajje-label">MDP <span>UPDATES</span></div>
  <div className="mdp-raajje-window">{items.length?
   <div className="mdp-raajje-track">{[...items,...items].map((item,i)=><a key={i} href={item.url} target="_blank" rel="noopener noreferrer" dir="auto" lang="dv">{item.title}<span aria-hidden="true"> ● </span></a>)}</div>:
   <a href={destination} target="_blank" rel="noopener noreferrer">View MDP announcements ↗</a>}
  </div>
  <a href={destination} target="_blank" rel="noopener noreferrer" className="mdp-raajje-open">All ↗</a>
 </section>;
}
