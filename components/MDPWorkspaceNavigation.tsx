'use client';
import Link from 'next/link';
import {usePathname,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {useStaffAccess} from './AuthGate';
import AuthControl from './AuthControl';
import MDPElectionCountdown from './MDPElectionCountdown';

type NavItem={label:string;href:string;icon:string;roles?:string[]};
const primary:NavItem[]=[
 {label:'Residents',href:'/mdp/residents/',icon:'users'},
 {label:'Door-to-door',href:'/mdp/door-to-door/',icon:'home'},
 {label:'Vote Target',href:'/mdp/vote-target/',icon:'vote'},
 {label:'Calls',href:'/mdp/calls/?status=need-call',icon:'phone'},
 {label:'Remarks',href:'/mdp/remarks/',icon:'note'},
 {label:'Transport',href:'/mdp/transportation/?status=pending',icon:'truck'},
 {label:'Assignments',href:'/mdp/assignments/?status=pending',icon:'tasks',roles:['admin','supervisor']},
 {label:'Reports',href:'/mdp/reports/',icon:'chart'},
 {label:'Voting day',href:'/mdp/voting-days/?status=pending',icon:'vote',roles:['admin','supervisor','election_operator']},
];
const iconPaths:Record<string,string>={
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
 phone:'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.58 3.5a2 2 0 0 1-.57 1.74L7.8 10.3a16 16 0 0 0 5.9 5.9l1.34-1.32a2 2 0 0 1 1.74-.57l3.5.58A2 2 0 0 1 22 16.92Z',
 tasks:'M8 4h12v18H4V4h2 M8 2h8v4H8z M9 12l2 2 4-4 M9 18h7',
 truck:'M10 17h4V5H2v12h3 M14 9h4l4 4v4h-3 M14 17h3 M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M17 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
 chart:'M4 21V3 M4 21h17 M9 17v-5 M14 17V8 M19 17V4',
 home:'M3 10 12 3l9 7v11h-6v-7H9v7H3z',
 vote:'M4 13h16v8H4z M8 4h8l3 7H5z M9 8l2 2 4-4',
 note:'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',
};
function NavIcon({name}:{name:string}){return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={iconPaths[name]||iconPaths.note}/></svg>}
function isActive(pathname:string,focus:string|null,href:string,currentTarget:string|null){const [path,query]=href.split('?');const route=path.replace(/\/$/,'');if(pathname!==route&&!pathname.startsWith(route+'/'))return false;const intended=new URLSearchParams(query||'');const selected=intended.get('focus');const target=intended.get('target');if(target)return currentTarget===target;return selected?focus===selected:true}
export default function MDPWorkspaceNavigation(){
 const access=useStaffAccess(),role=access?.role||'',pathname=(usePathname()||'/mdp/').replace(/\/$/,'')||'/mdp',params=useSearchParams(),focus=params.get('focus'),currentTarget=params.get('target');
 const [menuOpen,setMenuOpen]=useState(false);
 const drawerRef=useRef<HTMLDivElement>(null),menuTriggerRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setMenuOpen(false)},[pathname,focus]);
 useEffect(()=>{
  if(!menuOpen)return;
  const previousOverflow=document.body.style.overflow;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  document.body.style.overflow='hidden';
  drawerRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')?.focus();
  const handleKey=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();setMenuOpen(false);return}
   if(event.key!=='Tab'||!drawerRef.current)return;
   const focusables=Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
   if(!focusables.length)return;
   const first=focusables[0],last=focusables[focusables.length-1];
   if(event.shiftKey&&(document.activeElement===first||!drawerRef.current.contains(document.activeElement))){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&(document.activeElement===last||!drawerRef.current.contains(document.activeElement))){event.preventDefault();first.focus()}
  };
  window.addEventListener('keydown',handleKey);
  return()=>{window.removeEventListener('keydown',handleKey);document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus()};
 },[menuOpen]);
 const visible=(items:NavItem[])=>items.filter(item=>!item.roles||item.roles.includes(role));
 return <nav aria-label="Main navigation" className="mdp-nav">
  <button className="mdp-mobile-menu-toggle" ref={menuTriggerRef} type="button" aria-expanded={menuOpen} aria-controls="mdp-navigation-items" onClick={()=>setMenuOpen(value=>!value)}><span aria-hidden="true">☰</span> Menu</button>
  {menuOpen&&<button type="button" className="mdp-mobile-menu-backdrop" aria-label="Close navigation menu" onClick={()=>setMenuOpen(false)}/>}
  <div ref={drawerRef} id="mdp-navigation-items" className={`mdp-navigation-items${menuOpen?" is-open":""}`}>
   <div className="mdp-mobile-menu-heading"><strong>MDP Resident Voters</strong><button type="button" aria-label="Close menu" onClick={()=>setMenuOpen(false)}>✕</button></div>
  {visible(primary).map(item=><Link key={item.href} href={item.href} aria-current={isActive(pathname,focus,item.href,currentTarget)?'page':undefined} className={`mdp-nav-link${isActive(pathname,focus,item.href,currentTarget)?' is-active':''}`}><NavIcon name={item.icon}/><span>{item.label}</span></Link>)}
  <div className="mdp-nav-countdown"><MDPElectionCountdown/></div>
  <div className="mdp-nav-account"><AuthControl/></div>
  </div>
 </nav>;
}
