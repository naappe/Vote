/* Generic app worker: public static files only; never cache authenticated pages. */
const NAME='campaignops-static-v4';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const name of await caches.keys())if(name.startsWith('campaignops-shell-')||name.startsWith('campaignops-static-')&&name!==NAME)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||request.mode==='navigate')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 if(!url.pathname.startsWith('/Vote/_next/static/')&&url.pathname!=='/Vote/favicon.svg')return;
 event.respondWith((async()=>{
  const cache=await caches.open(NAME);
  const saved=await cache.match(request);
  if(saved)return saved;
  const response=await fetch(request);
  if(response.ok&&response.type!=='opaque')await cache.put(request,response.clone());
  return response;
 })());
});
