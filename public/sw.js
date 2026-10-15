// Only the offline screen and brand assets are cached. Account data and API
// requests always use the network and are never placed in this cache.
const CACHE='listit-offline-v1';
const ASSETS=['/offline.html','/icons/listit.svg','/icons/listit-192.png','/icons/listit-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('listit-offline-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/__/'))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')))}else if(ASSETS.includes(url.pathname)){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)))}});
