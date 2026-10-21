'use client';
import Link from 'next/link';
import {useStaffAccess} from './AuthGate';

const dailyTasks=[
 {title:'Find a resident',detail:'Search by name, ID, house or phone number.',href:'/mdp/residents/',mark:'01'},
 {title:'Record a phone call',detail:'See who was called and save the call result.',href:'/mdp/residents/?focus=called',mark:'02'},
 {title:'Record a house visit',detail:'Find residents visited at home and update their visit result.',href:'/mdp/residents/?focus=visited',mark:'03'},
 {title:'Check voting plans',detail:'See who plans to vote, who is unsure, and who needs follow-up.',href:'/mdp/residents/?focus=undecided',mark:'04'},
];

const otherTasks=[
 {title:'Write or read notes',detail:'Check saved notes about residents.',href:'/mdp/residents/?focus=remarks'},
 {title:'Arrange transport',detail:'See residents who have a transport request.',href:'/mdp/residents/?focus=transport'},
 {title:'View reports',detail:'See progress and saved results.',href:'/mdp/reports/'},
];

export default function MDPResidentHome(){
 const access=useStaffAccess(),role=access?.role||'';
 const canManage=role==='admin'||role==='supervisor';
 const canHandleVotingDay=canManage||role==='election_operator';
 return <div className="mdp-home mdp-home-simple">
  <section className="mdp-home-intro" aria-labelledby="mdp-home-title">
   <div><p className="mdp-eyebrow">MDP Resident Voters</p><h1 id="mdp-home-title">What would you like to do?</h1><p>Choose a task below. You can search for a resident and save your work in a few steps.</p></div>
   <Link prefetch={false} href="/mdp/residents/" className="mdp-home-main-link">Open Residents <span aria-hidden="true">→</span></Link>
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-daily-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-daily-heading">Everyday tasks</h2><p>Choose what you need to do now.</p></div>
   <div className="mdp-home-quick-grid">{dailyTasks.map(task=><Link prefetch={false} key={task.title} href={task.href} className="mdp-home-quick-card">
    <span className="mdp-home-quick-mark" aria-hidden="true">{task.mark}</span><strong>{task.title}</strong><small>{task.detail}</small><span className="mdp-home-quick-arrow" aria-hidden="true">Open →</span>
   </Link>)}</div>
  </section>
  <section className="mdp-home-section" aria-labelledby="mdp-other-heading">
   <div className="mdp-home-section-heading"><h2 id="mdp-other-heading">Other tasks</h2><p>Reports, notes, transport and election work.</p></div>
   <div className="mdp-home-simple-links">{otherTasks.map(task=><Link key={task.title} prefetch={false} href={task.href} className="mdp-home-simple-link"><span><strong>{task.title}</strong><small>{task.detail}</small></span><span aria-hidden="true">›</span></Link>)}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/voting-days/" className="mdp-home-simple-link"><span><strong>Record who voted</strong><small>Mark residents who voted on election day.</small></span><span aria-hidden="true">›</span></Link>}
    {canManage&&<Link prefetch={false} href="/mdp/assignments/" className="mdp-home-simple-link"><span><strong>Assign staff work</strong><small>Give tasks to staff members.</small></span><span aria-hidden="true">›</span></Link>}
    {canHandleVotingDay&&<Link prefetch={false} href="/mdp/transport-links/" className="mdp-home-simple-link"><span><strong>Connect transport requests</strong><small>Match resident requests with transport arrangements.</small></span><span aria-hidden="true">›</span></Link>}
   </div>
  </section>
 </div>
}
