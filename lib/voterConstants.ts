export const VOTER_TABS=['Overview','Call Center','Door-to-Door','Candidate Visit','Election Day','Remarks'] as const;
export const VOTER_DETAIL_TABS=VOTER_TABS;

export const STATUS_LABELS:Record<string,string>={
  'will-vote':'Will vote',
  'not-decided':'Not decided',
  'not-vote':'Not voting',
  reached:'Reached',
  'not-reached':'Not reached',
  called:'Called',
  'need-call':'Need call',
  guaranteed:'Guaranteed',
  'not-guaranteed':'Not guaranteed',
  'not-visited':'Not visited',
  reach:'Visited',
  'not-home':'Not home',
  'live-in-another-place':'Lives elsewhere'
};

export const STATUS_STYLES:Record<string,string>={
  'will-vote':'bg-accent/15 text-accent',
  'not-decided':'bg-primary-light text-primary',
  'not-vote':'bg-danger/10 text-danger',
  reached:'bg-primary-light text-primary',
  'not-reached':'bg-background-end text-body',
  called:'bg-primary-light text-primary',
  'need-call':'bg-warning/10 text-warning',
  guaranteed:'bg-accent/15 text-accent',
  'not-guaranteed':'bg-background-end text-body',
  'not-visited':'bg-background-end text-body',
  reach:'bg-primary-light text-primary',
  'not-home':'bg-warning/10 text-warning',
  'live-in-another-place':'bg-primary-light text-primary'
};

export function residentInitials(name?:string|null){
  return (name||'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]||'').join('').toUpperCase()||'?';
}

export function statusLabel(status?:string|null){
  const key=status||'not-decided';
  return STATUS_LABELS[key]||key.replaceAll('-',' ');
}
