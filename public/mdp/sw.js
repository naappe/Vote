/* MDP static asset cache. Never store HTML, Supabase responses, or resident records. */
const NAME='mdp-static-v2';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('mdp-static-')&&name!==NAME)await caches.delete(name);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||req.mode==='navigate'||req.credentials==='include'&&req.destination==='document')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 const staticAsset=url.pathname.startsWith('/Vote/_next/static/')||url.pathname==='/Vote/mdp-icon.svg';
 if(!staticAsset)return;
 event.respondWith((async()=>{
  const cache=await caches.open(NAME),cached=await cache.match(req);
  if(cached)return cached;
  const res=await fetch(req);
  if(res.ok&&res.type!=='opaque')await cache.put(req,res.clone());
  return res;
 })());
});
