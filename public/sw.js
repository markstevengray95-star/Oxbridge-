const CACHE='oxbridge-tutor-v12';
const SHELL=['/','/student-home','/interviews','/interview-room','/ai-interview','/elevenlabs-interview','/live-interview','/panel-interview','/cambridge-interview-day','/advanced-practice','/adaptive-paper','/essay-tutor','/timing-trainer','/question-quality','/reasoning-lab','/intervention-session','/written-work-vault','/personal-statement-map','/working-analysis','/accessibility-profiles','/learning-support','/requirements','/cambridge-assessments','/source-health','/timeline','/backup-center','/course-bank','/unseen-lab','/reading-room','/knowledge-graph','/research-project','/mock-week','/technology-rehearsal','/teacher-coach','/manifest.webmanifest','/favicon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET') return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.startsWith('/api/')) return;

  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));return response}).catch(()=>caches.match(request).then(hit=>hit||caches.match('/student-home')||caches.match('/'))));
    return;
  }

  event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(()=>cached);return cached||network}));
});
