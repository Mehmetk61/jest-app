const V='jest-v17b';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['/','/icon.svg'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/'))return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/'))))});
self.addEventListener('push',e=>{e.waitUntil(self.registration.pushManager.getSubscription().then(sb=>sb?fetch('/api/push/pending',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:sb.endpoint})}).then(r=>r.json()).catch(()=>({title:'Jestora',body:'Seni bekleyen bir şey var.'})):{title:'Jestora',body:'Seni bekleyen bir şey var.'}).then(m=>self.registration.showNotification(m.title,{body:m.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:'jestora'})))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(l=>{for(const c of l){if('focus' in c)return c.focus()}return self.clients.openWindow('/')}))});
