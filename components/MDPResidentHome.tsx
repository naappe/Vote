import Link from 'next/link';

const tasks = [
 {title:'Find a resident',detail:'Search the list or export residents.',href:'/mdp/residents/',mark:'01'},
 {title:'Record a call',detail:'Save the call result and follow-up.',href:'/mdp/calls/',mark:'02'},
 {title:'Log a home visit',detail:'Record a door-to-door visit.',href:'/mdp/door-to-door/',mark:'03'},
 {title:'Record voting',detail:'Mark voted or undo by voting day.',href:'/mdp/voting-days/',mark:'04'},
 {title:'Manage transport',detail:'Review and update resident requests.',href:'/mdp/transportation/',mark:'05'},
];

const moreTasks = [
 {title:'Resident remarks',href:'/mdp/remarks/'},
 {title:'Staff assignments',href:'/mdp/assignments/'},
 {title:'Link transport requests',href:'/mdp/transport-links/'},
 {title:'Reports',href:'/mdp/reports/'},
 {title:'Staff and verification',href:'/contact-verification/'},
 {title:'Staff accounts and backup',href:'/users/'},
];

export default function MDPResidentHome(){
 return <div className="mdp-home">
  <section className="mdp-task-panel" aria-labelledby="mdp-task-heading">
   <div className="mdp-home-heading">
    <div><p className="mdp-eyebrow">Resident operations</p><h1 id="mdp-task-heading">Choose a task</h1></div>
    <span className="mdp-task-count">5 main tasks</span>
   </div>
   <div className="mdp-task-list">
    {tasks.map(task=><Link key={task.title} prefetch href={task.href} className="mdp-task-card">
     <span className="mdp-task-mark" aria-hidden="true">{task.mark}</span>
     <span className="mdp-task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span>
     <span className="mdp-task-arrow" aria-hidden="true">›</span>
    </Link>)}
   </div>
  </section>
  <details className="mdp-more-tasks">
   <summary>More tasks</summary>
   <div className="mdp-more-grid">{moreTasks.map(task=><Link key={task.title} href={task.href}>{task.title}<span aria-hidden="true">›</span></Link>)}</div>
  </details>
 </div>
}
