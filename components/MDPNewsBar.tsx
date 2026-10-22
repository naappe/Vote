'use client';
import {useEffect,useState} from 'react';
type Item={title:string;url:string;publishedAt?:string};
type Feed={items:Item[]};
const sources=[
 {label:'MDP',url:'mdp-announcements.json',site:'https://mdp.org.mv/announcements',host:'mdp.org.mv'},
 {label:'EC',url:'ec-news.json',site:'https://www.elections.gov.mv/news',host:'elections.gov.mv'},
 {label:'Raajje',url:'raajje-headlines.json',site:'https://raajje.mv/category/news',host:'raajje.mv'},
 {label:'MDP X',url:'',site:'https://x.com/MDPSecretariat?lang=en',host:'x.com'}
] as const;
const day=(value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Indian/Maldives',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export default function MDPNewsBar(){
 const [chosen,setChosen]=useState(0),[now,setNow]=useState<Date|null>(null);
 const [feeds,setFeeds]=useState<Record<string,Item[]>>({});
 useEffect(()=>{
  let alive=true;const tick=()=>setNow(new Date());tick();
  const clock=window.setInterval(tick,1000);
  const load=()=>Promise.all(sources.filter(s=>s.url).map(async s=>{
   try{const r=await fetch('/Vote/'+s.url,{cache:'no-store'});if(!r.ok)return [s.url,[]] as const;
    const f=await r.json() as Feed;
    const rows=(f.items||[]).filter(item=>{try{const u=new URL(item.url);return u.protocol==='https:'&&(u.hostname===s.host||u.hostname==='www.'+s.host)&&Boolean(item.title)&&Boolean(item.publishedAt)}catch{return false}});
    return [s.url,rows] as const;
   }catch{return [s.url,[]] as const}
  })).then(entries=>{if(alive)setFeeds(Object.fromEntries(entries))});
  void load();const refresh=window.setInterval(()=>void load(),300000);
  return()=>{alive=false;window.clearInterval(clock);window.clearInterval(refresh)};
 },[]);
 const source=sources[chosen];
 const today=now?day(now.toISOString()):'';
 const items=(feeds[source.url]||[]).filter(i=>i.publishedAt&&day(i.publishedAt)===today);
 return <section className="mdp-global-news" aria-label="Today's news and Maldives clock">
  <div className="mdp-global-news-tabs">{sources.map((s,i)=><button key={s.label} type="button" onClick={()=>setChosen(i)} aria-pressed={chosen===i} className={chosen===i?'active':''}>{s.label}</button>)}</div>
  <div className="mdp-global-news-window" key={source.label}>{source.label==='MDP X'?
   <a href={source.site} target="_blank" rel="noopener noreferrer">Latest MDP Secretariat posts on X ↗</a>:
   items.length?<div className="mdp-global-news-track">{[...items,...items].map((item,i)=><a href={item.url} target="_blank" rel="noopener noreferrer" dir="rtl" key={i}>{item.title}<span aria-hidden="true"> • </span></a>)}</div>:
   <a href={source.site} target="_blank" rel="noopener noreferrer">No verified headlines today · {source.label} ↗</a>}
  </div>
  <time className="mdp-global-news-clock" dateTime={now?.toISOString()}>{now?new Intl.DateTimeFormat('en-GB',{timeZone:'Indian/Maldives',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now):'--:--'} <small>MVT</small></time>
 </section>;
}
