import http from 'node:http';
import {readFileSync} from 'node:fs';
const base='/DietSupportApp/',port=Number(process.env.PWA_TEST_PORT||4177);
const files=new Set(['index.html','pwa.js','pwa.css','manifest.webmanifest','sw.js','supabase-config.js','version.json','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']);
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json',json:'application/json',svg:'image/svg+xml',png:'image/png'};
let disconnected=false;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(url.pathname.startsWith(base))console.log(req.method,url.pathname);
 if(url.pathname==='/__pwa-test'&&req.method==='GET'){
  res.setHeader('content-type','text/html; charset=utf-8');
  res.end(`<!doctype html><html lang="pl"><meta charset="utf-8"><title>Kontrola testu PWA</title><body><h1>Izolowany test PWA</h1><p>Bez kont, e-maili i płatnych wywołań AI. Ten serwer wyłącza konfigurację Supabase.</p><button id="disconnect">Odłącz serwer aplikacji</button><button id="connect">Przywróć serwer aplikacji</button><button id="inspect">Sprawdź service worker i cache</button><button id="reset">Usuń tylko testowy worker i cache</button><pre id="state">Serwer aplikacji: ${disconnected?'odłączony':'dostępny'}</pre><a href="${base}#settings">Otwórz aplikację</a><script>const state=document.getElementById('state');for(const [id,path]of [['disconnect','offline'],['connect','online']])document.getElementById(id).onclick=async()=>{await fetch('/__pwa-test/'+path,{method:'POST'});state.textContent='Serwer aplikacji: '+(path==='offline'?'odłączony':'dostępny')};document.getElementById('inspect').onclick=async()=>{try{const scope=location.origin+'${base}',reg=await navigator.serviceWorker.getRegistration(scope),keys=(await caches.keys()).filter(k=>k.startsWith('forma-pwa:'+scope+':'));const assets=[];for(const name of keys){const cache=await caches.open(name);assets.push(...(await cache.keys()).map(r=>new URL(r.url).pathname))}state.textContent=JSON.stringify({scope:reg?.scope,active:reg?.active?.state,installing:reg?.installing?.state,waiting:!!reg?.waiting,assets},null,2)}catch(error){state.textContent='Błąd diagnostyki: '+error.message}};document.getElementById('reset').onclick=async()=>{const scope=location.origin+'/DietSupportApp/',reg=await navigator.serviceWorker.getRegistration(scope);if(reg)await reg.unregister();for(const name of await caches.keys())if(name.startsWith('forma-pwa:'+scope+':'))await caches.delete(name);state.textContent='Usunięto tylko testową rejestrację i cache '+scope};if(new URLSearchParams(location.search).has('reset'))document.getElementById('reset').click();else if(new URLSearchParams(location.search).has('inspect'))document.getElementById('inspect').click();</script></body></html>`);return;
 }
 if(req.method==='POST'&&['/__pwa-test/offline','/__pwa-test/online'].includes(url.pathname)){disconnected=url.pathname.endsWith('/offline');res.end('OK');return}
 if(!url.pathname.startsWith(base)){res.writeHead(404);res.end();return}
 if(disconnected){req.socket.destroy();return}
 const name=url.pathname===base?'index.html':url.pathname.slice(base.length);
 if(!files.has(name)){res.writeHead(404);res.end();return}
 res.setHeader('cache-control','no-store');res.setHeader('content-type',mime[name.split('.').at(-1)]||'application/octet-stream');
 // No production credentials/accounts in this test origin. Config is deliberately NOT in SW cache.
 res.end(name==='supabase-config.js'?'window.FORMA_SUPABASE={};':readFileSync(new URL('../dist/'+name,import.meta.url)));
}).listen(port,'127.0.0.1',()=>console.log(`PWA test: http://127.0.0.1:${port}/DietSupportApp/#settings; controls /__pwa-test`));
