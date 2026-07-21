export default function NotFound(){
 return <main className="grid min-h-screen place-items-center bg-background p-5">
  <section className="panel w-full max-w-xl text-center">
   <div className="brand-mark mx-auto">VO</div>
   <p className="eyebrow mt-5">Page unavailable</p>
   <h1 className="mt-3">This page is not ready yet</h1>
   <p className="mx-auto mt-3 max-w-md text-body">The requested section may be updating, unavailable, or no longer part of the current application.</p>
   <a className="btn-primary mt-6" href="/Vote/">Return to dashboard</a>
  </section>
 </main>
}
