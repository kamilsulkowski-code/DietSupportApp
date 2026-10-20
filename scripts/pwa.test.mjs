import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const html=read('dist/index.html').toString();
const worker=read('dist/sw.js').toString();
const client=read('dist/pwa.js').toString();
const manifest=JSON.parse(read('dist/manifest.webmanifest'));
const base='https://example.test/DietSupportApp/';
const shell=base+'index.html';
const response=(body='shell',type='text/html',status=200)=>new Response(body,{status,headers:{'content-type':type}});

function workerHarness({network=async()=>response(),failPut=false}={}){
 const listeners={},maps=new Map(),calls={fetch:[],skip:0,claim:0,deleted:[],put:[]};
 let fetcher=network;
 const getMap=name=>{if(!maps.has(name))maps.set(name,new Map());return maps.get(name)};
 const context=vm.createContext({URL,Request,Response,Set,console,
  self:{registration:{scope:base},clients:{claim:async()=>{calls.claim++}},skipWaiting:async()=>{calls.skip++},addEventListener:(type,fn)=>listeners[type]=fn},
  caches:{open:async name=>({put:async(key,value)=>{if(failPut)throw Error('quota');calls.put.push(String(key));getMap(name).set(String(key),value.clone())},match:async key=>getMap(name).get(String(key))?.clone()}),keys:async()=>[...maps.keys()],delete:async key=>{calls.deleted.push(key);return maps.delete(key)}},
  fetch:async(request,options)=>{calls.fetch.push({url:typeof request==='string'?request:request.url,options});return fetcher(request,options)},
 });
 vm.runInContext(worker+'\nglobalThis.testApi={CACHE,PREFIX,FILES,SHELL};',context);
 function event(type,extra={}){let done;listeners[type]({...extra,waitUntil:p=>done=p});return done}
 function request(url,{mode='navigate',method='GET',authorization=false}={}){let result;listeners.fetch({request:{url,mode,method,headers:new Headers(authorization?{authorization:'Bearer private'}:{})},respondWith:p=>result=p});return result}
 return{calls,maps,api:context.testApi,event,request,setNetwork:fn=>fetcher=fn,seed(name,url,value){getMap(name).set(url,value.clone())}};
}

test('PWA1: manifest jest instalowalny w podkatalogu i ma stabilną tożsamość',()=>{
 assert.equal(manifest.id,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 assert.equal(new URL(manifest.start_url,base).pathname,'/DietSupportApp/');
 assert.equal(manifest.lang,'pl');assert.equal(manifest.short_name,'Forma');
 assert.match(html,/<link rel="manifest" href="\.\/manifest.webmanifest">/);
 assert.match(html,/apple-mobile-web-app-capable/);assert.match(html,/apple-touch-icon/);
 for(const shortcut of manifest.shortcuts)assert.ok(new URL(shortcut.url,base).href.startsWith(base));
});

test('PWA1: rzeczywiste ikony PNG mają wymiary 192, 512 i 180 px',()=>{
 for(const [path,size]of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]){
  const png=read('dist/icons/'+path);assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose.includes('maskable')));
});

test('PWA2: instalacja cache obejmuje wyłącznie publiczny shell i nie aktywuje aktualizacji samoczynnie',async()=>{
 const h=workerHarness();await h.event('install');
 assert.equal(h.calls.fetch.length,8);assert.equal(h.maps.get(h.api.CACHE).size,8);
 for(const {url,options}of h.calls.fetch){assert.ok(url.startsWith(base));assert.equal(new URL(url).search,'');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store')}
 assert.equal(h.calls.skip,0);assert.equal(h.calls.claim,0);
 assert.ok(!h.api.FILES.includes('supabase-config.js'));assert.ok(!h.api.FILES.includes('version.json'));
});

test('PWA2: niekompletny shell odrzuca instalację bez usuwania poprzedniej wersji',async()=>{
 const h=workerHarness({network:async url=>String(url).endsWith('pwa.js')?response('missing','text/plain',404):response()});
 h.seed(h.api.PREFIX+'previous',shell,response('old'));
 await assert.rejects(h.event('install'),/Incomplete PWA shell/);
 assert.equal(h.calls.deleted.length,0);assert.equal(h.calls.skip,0);assert.ok(h.maps.has(h.api.PREFIX+'previous'));
});

test('PWA3: nawigacja preferuje nową sieciową wersję zamiast starego HTML z cache',async()=>{
 const h=workerHarness({network:async()=>response('new')});h.seed(h.api.CACHE,shell,response('old'));
 assert.equal(await(await h.request(base)).text(),'new');assert.equal(await h.maps.get(h.api.CACHE).get(shell).text(),'new');
 assert.equal(h.calls.fetch.at(-1).options.cache,'no-store');
});

test('PWA3: bez sieci katalog, index i nawigacja z parametrami korzystają z kanonicznego shell',async()=>{
 const h=workerHarness({network:async()=>{throw Error('offline')}});h.seed(h.api.CACHE,shell,response('offline shell'));
 for(const path of ['', 'index.html', '?source=pwa', '?code=private-login-code'])assert.equal(await(await h.request(base+path)).text(),'offline shell');
 assert.equal(h.calls.put.length,0);assert.deepEqual([...h.maps.get(h.api.CACHE).keys()],[shell]);
});

test('PWA3: nawigacja z parametrami logowania nie trafia do cache',async()=>{
 const h=workerHarness();await h.request(base+'?code=private-login-code');
 assert.equal(h.calls.put.length,0);assert.equal(h.maps.size,0);
});

test('PWA3: błędy HTTP, JSON i przekierowania nie zastępują poprawnego shell',async()=>{
 for(const value of [response('error','text/html',500),response('{}','application/json'),{status:200,type:'basic',redirected:true,headers:new Headers({'content-type':'text/html'})}]){
  const h=workerHarness({network:async()=>value});h.seed(h.api.CACHE,shell,response('old'));
  await h.request(base);assert.equal(h.calls.put.length,0);assert.equal(await h.maps.get(h.api.CACHE).get(shell).text(),'old');
 }
});

test('PWA3: brak miejsca w cache nie psuje poprawnego żądania online',async()=>{
 const h=workerHarness({network:async()=>response('online'),failPut:true});assert.equal(await(await h.request(base)).text(),'online');
});

test('PWA4: worker nie przechwytuje Supabase, OpenAI, CDN, POST ani prywatnych nagłówków',()=>{
 const h=workerHarness();
 for(const url of ['https://project.supabase.co/rest/v1/meal_plans','https://api.openai.com/v1/responses','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',base+'supabase-config.js',base+'version.json',base+'sw.js',base+'api/profile','https://example.test/OtherApp/'])assert.equal(h.request(url),undefined);
 assert.equal(h.request(base,{method:'POST'}),undefined);assert.equal(h.request(base,{authorization:true}),undefined);
 assert.equal(h.calls.fetch.length,0);
});

test('PWA4: tylko jawne pliki statyczne mają fallback; parametry plików nie są cachowane',async()=>{
 const h=workerHarness({network:async()=>{throw Error('offline')}});h.seed(h.api.CACHE,base+'pwa.css',response('styles','text/css'));
 assert.equal(await(await h.request(base+'pwa.css',{mode:'no-cors'})).text(),'styles');
 assert.equal(h.request(base+'pwa.css?token=private',{mode:'no-cors'}),undefined);
 assert.equal(h.request(base+'anything.js',{mode:'no-cors'}),undefined);
});

test('PWA5: aktywacja czyści tylko stare cache tego projektu',async()=>{
 const h=workerHarness();for(const key of [h.api.CACHE,h.api.PREFIX+'old','forma-pwa:https://example.test/OtherApp/:old','another-cache'])h.seed(key,shell,response());
 await h.event('activate');assert.deepEqual(h.calls.deleted,[h.api.PREFIX+'old']);assert.equal(h.calls.claim,1);assert.equal(h.maps.size,3);
});

test('PWA5: skipWaiting wymaga jawnego komunikatu aktualizacji',async()=>{
 const h=workerHarness();h.event('message',{data:{type:'OTHER'}});assert.equal(h.calls.skip,0);
 await h.event('message',{data:{type:'SKIP_WAITING'}});assert.equal(h.calls.skip,1);
});

test('PWA5: fingerprint pokrywa szablon i każdy plik shell; CI wykrywa nieaktualny worker',()=>{
 const h=workerHarness(),template=read('scripts/service-worker.template.js').toString(),hash=createHash('sha256').update(template);
 for(const path of h.api.FILES)hash.update(path+'\0').update(read('dist/'+path));
 assert.ok(worker.includes(hash.digest('hex').slice(0,20)));
 const output=execFileSync(process.execPath,['scripts/build_pwa.mjs','--check'],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
 assert.match(output,/current/);
});

function clientHarness({online=true,supported=true,secure=true,standalone=false,waiting=false,controlled=false,dirty=false,generating=false,auth=false,rejectRegistration=false}={}){
 const elements=new Map(),windowListeners={},swListeners={},registrationListeners={},calls={register:[],posts:[],reload:0,render:0,update:0};
 const get=id=>{if(!elements.has(id))elements.set(id,{hidden:id!=='pwaInstall',disabled:false,textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn}});return elements.get(id)};
 const registration={waiting:waiting?{postMessage:value=>calls.posts.push(value)}:null,installing:null,addEventListener:(type,fn)=>registrationListeners[type]=fn,update:async()=>{calls.update++}};
 const navigator={onLine:online,standalone};
 if(supported)navigator.serviceWorker={controller:controlled?{}:null,ready:Promise.resolve(registration),addEventListener:(type,fn)=>swListeners[type]=fn,register:async(...args)=>{calls.register.push(args);if(rejectRegistration)throw Error('unsupported');return registration}};
 const context=vm.createContext({document:{baseURI:base+'#settings',getElementById:get},window:{isSecureContext:secure,matchMedia:()=>({matches:standalone}),addEventListener:(type,fn)=>windowListeners[type]=fn},navigator,URL,location:{reload:()=>calls.reload++},settingsDirty:dirty,generatingPlan:generating,authBusy:auth,renderAccount:()=>calls.render++});
 vm.runInContext(client,context);
 return{get,calls,context,registration,navigator,swListeners,registrationListeners,windowListeners,click:id=>get(id).listeners.click(),flush:()=>new Promise(resolve=>setImmediate(resolve))};
}

test('PWA6: rejestracja używa właściwego podkatalogu i wyłącza cache HTTP workera',async()=>{
 const h=clientHarness();await h.flush();assert.equal(h.calls.register[0][0],base+'sw.js');
 assert.equal(h.calls.register[0][1].scope,base);assert.equal(h.calls.register[0][1].updateViaCache,'none');
 assert.equal(h.calls.reload,0);assert.equal(h.get('pwaUpdateNotice').hidden,true);
});

test('PWA6: brak wsparcia i brak HTTPS nie psują zwykłej strony',async()=>{
 for(const options of [{supported:false},{secure:false},{rejectRegistration:true}]){
  const h=clientHarness(options);await h.flush();assert.equal(h.calls.reload,0);assert.match(h.get('pwaStatus').textContent,/HTTPS|online/);
 }
});

test('PWA6: instalacja wymaga kliknięcia użytkownika; Safari ma instrukcję zamiast fałszywego promptu',async()=>{
 const h=clientHarness();await h.flush();await h.click('pwaInstall');assert.equal(h.get('pwaInstallHelp').hidden,false);
 let prompts=0,prevented=0;h.windowListeners.beforeinstallprompt({preventDefault:()=>prevented++,prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(prevented,1);assert.equal(prompts,0);assert.equal(h.get('pwaInstall').textContent,'Zainstaluj Formę');
 await h.click('pwaInstall');assert.equal(prompts,1);assert.equal(h.get('pwaInstall').disabled,false);
});

test('PWA6: tryb standalone i potwierdzona instalacja ukrywają przycisk instalacji',async()=>{
 const h=clientHarness({standalone:true});await h.flush();assert.equal(h.get('pwaInstall').hidden,true);
 const normal=clientHarness();normal.windowListeners.appinstalled();assert.equal(normal.get('pwaInstall').hidden,true);
});

test('PWA7: offline jest jawnie oznaczony i nie obiecuje zapisanych planów AI',async()=>{
 const h=clientHarness({online:false});await h.flush();assert.equal(h.get('offlineNotice').hidden,false);
 assert.match(h.get('offlineNotice').textContent,/nie zapisany plan AI/);assert.match(h.get('offlineNotice').textContent,/nie są automatycznie synchronizowane/);
 h.navigator.onLine=true;h.windowListeners.online();assert.equal(h.get('offlineNotice').hidden,true);assert.match(h.get('pwaStatus').textContent,/nie są automatycznie wysyłane/);
});

test('PWA7: offline blokuje logowanie, generowanie i żądanie synchronizacji przed siecią',async()=>{
 const elements=new Map(),$=key=>{if(!elements.has(key))elements.set(key,{hidden:true,textContent:'',classList:{add(){}}});return elements.get(key)};
 const lines=html.split('\n').filter(line=>['function requestLogin(','async function generatePlan(','async function syncToCloud('].some(prefix=>line.startsWith(prefix))).join('\n');
 let requests=0;const context=vm.createContext({$,navigator:{onLine:false},generatingPlan:false,currentUser:{id:'owner'},db:{from(){requests++;throw Error('network forbidden')}}});
 vm.runInContext(lines,context);vm.runInContext('requestLogin()',context);assert.match($('#generationStatus').textContent,/internet/);
 assert.equal(await vm.runInContext('generatePlan()',context),false);assert.equal(await vm.runInContext('syncToCloud()',context),false);assert.equal(requests,0);
});

test('PWA8: oczekująca wersja pokazuje globalny przycisk, ale nie aktywuje się sama',async()=>{
 const h=clientHarness({waiting:true,controlled:true});await h.flush();assert.equal(h.get('pwaUpdateNotice').hidden,false);assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,0);
 await h.click('pwaUpdateNow');assert.equal(h.calls.posts[0].type,'SKIP_WAITING');assert.equal(h.calls.reload,0);
 h.swListeners.controllerchange();assert.equal(h.calls.reload,1);
});

test('PWA8: szkic, generowanie i logowanie blokują aktualizację bez utraty danych',async()=>{
 for(const flags of [{dirty:true},{generating:true},{auth:true}]){
  const h=clientHarness({waiting:true,controlled:true,...flags});await h.flush();await h.click('pwaUpdateNow');assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,0);assert.match(h.get('pwaUpdateMessage').textContent,/Najpierw zapisz/);
 }
});

test('PWA8: aktywacja z innej karty nie przeładowuje niezapisanego formularza',async()=>{
 const h=clientHarness({controlled:true,dirty:true});await h.flush();h.swListeners.controllerchange();assert.equal(h.calls.reload,0);assert.equal(h.get('pwaUpdateNotice').hidden,false);
 await h.click('pwaUpdate');assert.equal(h.calls.reload,0);h.context.settingsDirty=false;await h.click('pwaUpdate');assert.equal(h.calls.reload,1);
});

test('PWA8: pierwsza aktywacja nie jest traktowana jako nowa wersja wymagająca reload',async()=>{
 const h=clientHarness();await h.flush();h.swListeners.controllerchange();assert.equal(h.calls.reload,0);assert.equal(h.get('pwaUpdateNotice').hidden,true);
});
