'use client';
import {useEffect,useState} from 'react';
type Item={title:string;url:string};
type Feed={items:Item[]};
const sources=[
 {label:'MDP',url:'mdp-announcements.json',site:'https://mdp.org.mv/announcements',host:'mdp.org.mv'},
 {label:'EC News',url:'ec-news.json',site:'https://www.elections.gov.mv/news',host:'elections.gov.mv'},
 {label:'Raajje',url:'raajje-headlines.json',site:'https://raajje.mv/category/news',host:'raajje.mv'}
] as const;
export default function MDPNewsBar(){
 const [chosen,setChosen]=useState(0);
 const [feeds,setFeeds]=useState<Record<string,Item[]>>({});
 useEffect(()=>{
  let alive=true;
  const load=()=>Promise.all(sources.map(async s=>{
   try{const r=await fetch('/Vote/'+s.url,{cache:'no-store'});if(!r.ok)return [s.url,[]] as const;
    const feed=await r.json() as Feed;
    const rows=(feed.items||[]).filter(item=>{try{const u=new URL(item.url);return u.protocol==='https:'&&(u.hostname===s.host||u.hostname==='www.'+s.host)&&Boolean(item.title)}catch{return false}});
    return [s.url,rows] as const;
   }catch{return [s.url,[]] as const}
  })).then(entries=>{if(alive)setFeeds(Object.fromEntries(entries))});
  void load();
  const timer=window.setInterval(()=>void load(),300000);
  return()=>{alive=false;window.clearInterval(timer)};
 },[]);
 const source=sources[chosen],items=feeds[source.url]||[];
 return <section className="mdp-global-news" aria-label="Latest announcements and news">
  <div className="mdp-global-news-tabs">{sources.map((s,i)=><button key={s.url} type="button" onClick={()=>setChosen(i)} aria-pressed={chosen===i} className={chosen===i?'active':''}>{s.label}</button>)}</div>
  <div className="mdp-global-news-window" key={source.url}>{items.length?
   <div className="mdp-global-news-track">{[...items,...items].map((item,i)=><a href={item.url} target="_blank" rel="noopener noreferrer" lang="dv" dir="rtl" key={i}>{item.title}<span aria-hidden="true"> • </span></a>)}</div>:
   <a href={source.site} target="_blank" rel="noopener noreferrer">Open {source.label} updates ↗</a>}
  </div>
  <a className="mdp-global-news-all" href={source.site} target="_blank" rel="noopener noreferrer" aria-label={'Open '+source.label+' news'}>↗</a>
 </section>;
}
