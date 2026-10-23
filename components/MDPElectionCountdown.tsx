'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';

type Day={id:string;name:string;voting_date:string;active:boolean};
function remaining(date:string,now:number){
 const target=new Date(date+'T00:00:00+05:00').getTime();
 const ms=Math.max(0,target-now);
 return {days:Math.floor(ms/86400000),hours:Math.floor(ms%86400000/3600000),minutes:Math.floor(ms%3600000/60000),started:now>=target};
}
export default function MDPElectionCountdown(){
 const [day,setDay]=useState<Day|null>(null);
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{
  let active=true;
  void supabase.from('voting_days').select('id,name,voting_date,active').eq('active',true).order('voting_date',{ascending:true}).then(({data,error})=>{
   if(active&&!error&&data?.length)setDay(data[0] as Day);
  });
  setNow(Date.now());
  const clock=window.setInterval(()=>setNow(Date.now()),60000);
  return()=>{active=false;window.clearInterval(clock)};
 },[]);
 if(!day||now===null)return null;
 const left=remaining(day.voting_date,now);
 return <Link href="/mdp/voting-days/" className="mdp-election-countdown" title={'Voting day: '+day.name+' · '+day.voting_date} aria-label={left.started?'Voting day has arrived':left.days+' days '+left.hours+' hours until voting day'}>
  <span className="mdp-election-countdown-title">ELECTION COUNTDOWN</span>
  <div className="mdp-flip-countdown"><span className="mdp-flip-digits" aria-hidden="true">{String(left.days).padStart(2,'0').split('').map((digit,index)=><span className="mdp-flip-digit" key={index}>{digit}</span>)}</span><span className="mdp-flip-words">{left.started?'VOTING':'DAYS'}<b>{left.started?'TODAY':'TO GO'}</b></span></div><small className="mdp-flip-time">{String(left.hours).padStart(2,'0')}h {String(left.minutes).padStart(2,'0')}m remaining</small>
  <small>{day.name} · {day.voting_date}</small>
 </Link>;
}
