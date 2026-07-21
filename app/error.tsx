'use client';

export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="grid min-h-screen place-items-center bg-background p-5">
  <section className="panel w-full max-w-xl text-center">
   <div className="brand-mark mx-auto">VO</div>
   <p className="eyebrow mt-5">Temporary service issue</p>
   <h1 className="mt-3">This page is temporarily unavailable</h1>
   <p className="mx-auto mt-3 max-w-md text-body">The system could not load this section safely. No information was changed. Please try again after a moment.</p>
   <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
    <button className="btn-primary" onClick={reset}>Try again</button>
    <button className="btn-secondary" onClick={()=>window.location.assign('/Vote/')}>Return to dashboard</button>
   </div>
  </section>
 </main>
}
