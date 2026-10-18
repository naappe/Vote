import Link from 'next/link';

const tasks = [
 {title:'Find a resident',detail:'Open one resident to record a call, visit, voting intention, remark, or transport request.',href:'/mdp/residents/',mark:'01'},
 {title:'Record election-day turnout',detail:'Choose a voting day, then mark residents voted or undo.',href:'/mdp/voting-days/',mark:'02'},
];

const moreTasks = [
 {title:'Staff assignments',href:'/mdp/assignments/'},
 {title:'Link transport requests',href:'/mdp/transport-links/'},
 {title:'Reports',href:'/mdp/reports/'},
];

export default function MDPResidentHome(){
 return <div className="mdp-home">
  <section className="mdp-task-panel" aria-labelledby="mdp-task-heading">
   <div className="mdp-home-heading">
    <div><p className="mdp-eyebrow">Resident operations</p><h1 id="mdp-task-heading">Choose a task</h1></div>
    <span className="mdp-task-count">2 main tasks</span>
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
