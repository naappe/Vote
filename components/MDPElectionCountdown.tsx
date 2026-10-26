'use client';
import {useEffect,useState} from 'react';

const DEADLINE=Date.parse('2026-11-27T23:30:00+05:00');
export default function MDPElectionCountdown(){
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{setNow(Date.now());const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 if(now===null)return <div className="mdp-election-countdown" aria-label="Election access countdown loading">Election countdown…</div>;
 const ms=Math.max(0,DEADLINE-now);
 const days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000),minutes=Math.floor(ms%3600000/60000),seconds=Math.floor(ms%60000/1000);
 const started=now>=DEADLINE;
 return <div className="mdp-election-countdown" role="timer" aria-label={started?'Election sections unlocked':'Time until 27 November 2026 at 11:30 PM Maldives time'}>
  <span className="mdp-election-countdown-title">ELECTION COUNTDOWN · MVT</span>
  <div className="mdp-flip-countdown"><span className="mdp-flip-digits" aria-hidden="true">{String(days).padStart(2,'0').split('').map((digit,index)=><span className="mdp-flip-digit" key={index}>{digit}</span>)}</span><span className="mdp-flip-words">{started?'OPEN':'DAYS'}<b>{started?'UNLOCKED':'TO GO'}</b></span></div>
  <small>{started?'Reports and Voting day available':`${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s · 27 Nov, 11:30 PM`}</small>
 </div>;
}
