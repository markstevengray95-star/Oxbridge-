const CACHE='oxbridge-tutor-v9';
const SHELL=['/','/student-home','/interviews','/interview-room','/ai-interview','/live-interview','/panel-interview','/advanced-practice','/adaptive-paper','/essay-tutor','/reasoning-lab','/intervention-session','/written-work-vault','/accessibility-profiles','/requirements','/timeline','/backup-center','/course-bank','/reading-room','/knowledge-graph','/research-project','/mock-week','/technology-rehearsal','/manifest.webmanifest','/favicon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  if(request.mode==='navigate'){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
          return response;
        })
        .catch(()=>caches.match(request).then(hit=>hit||caches.match('/student-home')||caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      const network=fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
