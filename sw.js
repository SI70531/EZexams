/* EZexams offline support.
   - Pages, scripts and styles on this site: network first (always the newest version when online),
     falling back to the cached copy when offline.
   - Google Fonts: cache first (they never change).
   - Everything else (GitHub API for sync, Gemini for grading): not touched.
   On install it caches the home page, the shared assets, and every subject page linked from the home page
   (plus the scripts those pages load), so a subject works offline even before you open it. */
const CACHE="ezexams-v1";
const BASE=new URL("./",self.location).href;

async function precache(){
  const c=await caches.open(CACHE);
  const grab=async u=>{try{const r=await fetch(u,{cache:"no-cache"});if(r.ok){await c.put(u,r.clone());return r;}}catch(e){}return null;};
  const home=await grab(BASE);
  if(!home)return;
  const html=await home.text();
  const pages=new Set(),files=new Set();
  for(const m of html.matchAll(/(?:href|src)="([^"#:]+)"/g)){
    const u=new URL(m[1],BASE);if(!u.href.startsWith(BASE))continue;
    (u.pathname.endsWith("/")?pages:files).add(u.href);
  }
  await Promise.all([...files].map(grab));
  await Promise.all([...pages].map(async p=>{
    const r=await grab(p);if(!r)return;const h=await r.text();
    const subs=[...h.matchAll(/(?:href|src)="([^"#:]+\.(?:js|css|json|svg|png))(?:\?[^"]*)?"/g)].map(m=>new URL(m[1],p).href).filter(u=>u.startsWith(BASE));
    await Promise.all(subs.map(grab));
  }));
}

self.addEventListener("install",e=>{e.waitUntil(precache().then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})());});

self.addEventListener("fetch",e=>{
  const req=e.request;if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.href.startsWith(BASE)){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);
      try{
        const r=await fetch(req,{cache:"no-cache"});
        if(r.ok)c.put(req,r.clone());
        return r;
      }catch(err){
        const hit=await c.match(req)||await c.match(req,{ignoreSearch:true});
        if(hit)return hit;
        if(req.mode==="navigate"){const home=await c.match(BASE);if(home)return home;}
        throw err;
      }
    })());
    return;
  }
  if(url.hostname==="fonts.googleapis.com"||url.hostname==="fonts.gstatic.com"){
    e.respondWith((async()=>{
      const c=await caches.open(CACHE);const hit=await c.match(req);if(hit)return hit;
      const r=await fetch(req);if(r.ok||r.type==="opaque")c.put(req,r.clone());return r;
    })());
  }
});
