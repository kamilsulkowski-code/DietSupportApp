import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {task3Fixture} from './fixtures/task3.mjs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const application=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];

// Execute the complete application script, not a separately copied implementation.
// This intentionally small DOM implements the properties exercised by the UI;
// visual layout/focus order are also checked in a real isolated browser.
function domHarness(){
 let document;
 const decode=value=>String(value).replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
 class Element{
  constructor(tag='div',attrs={}){this.tagName=tag.toUpperCase();this.attributes={...attrs};this.children=[];this.parentElement=null;this.listeners={};this.style={setProperty(name,value){this[name]=value}};this.dataset={};this.value=attrs.value??'';this.hidden='hidden'in attrs;this.disabled='disabled'in attrs;this.checked='checked'in attrs;this.readOnly='readonly'in attrs;this.required='required'in attrs;this.open=false;this.markup='';this.ownText='';this.innerHTMLWrites=0;for(const [key,value]of Object.entries(attrs))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
   const classes=new Set((attrs.class||'').split(/\s+/).filter(Boolean));this.classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,force)=>{const add=force??!classes.has(x);add?classes.add(x):classes.delete(x);return add},toString:()=>[...classes].join(' ')};
  }
  get id(){return this.attributes.id||''}set id(value){this.attributes.id=value}
  get hidden(){return this._hidden||false}set hidden(value){this._hidden=!!value;if(value)this.attributes.hidden='';else delete this.attributes.hidden}
  get disabled(){return this._disabled||false}set disabled(value){this._disabled=!!value;if(value)this.attributes.disabled='';else delete this.attributes.disabled}
  get isConnected(){for(let parent=this;parent;parent=parent.parentElement)if(parent===document)return true;return false}
  get textContent(){return this.ownText+this.children.map(x=>x.textContent).join('')}
  set textContent(value){this.ownText=String(value);this.children=[]}
  get innerHTML(){return this.markup}
  set innerHTML(value){this.markup=String(value);this.innerHTMLWrites++;this.children=[];this.ownText='';parse(this.markup,this);if(this.tagName==='SELECT'){const options=this.querySelectorAll('option');this.value=(options.find(x=>'selected'in x.attributes)||options[0])?.value||''}}
  setAttribute(key,value){this.attributes[key]=String(value);if(key==='hidden')this.hidden=true;if(key==='disabled')this.disabled=true;if(key==='value')this.value=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value)}
  getAttribute(key){if(key==='class')return this.classList.toString();return this.attributes[key]??null}
  hasAttribute(key){return key in this.attributes}
  removeAttribute(key){delete this.attributes[key];if(key==='hidden')this.hidden=false;if(key==='disabled')this.disabled=false}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
  removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn)}
  async emit(type,details={}){const event={target:this,currentTarget:this,key:'',shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},stopPropagation(){this.stopped=true},...details};for(const listener of this.listeners[type]||[])await listener(event);if(!event.stopped&&details.bubbles!==false&&this.parentElement)await this.parentElement.emit(type,{...event,target:event.target});return event}
  focus(){document.activeElement=this}
  blur(){if(document.activeElement===this)document.activeElement=document.body}
  click(){return this.emit('click')}
  contains(element){return element===this||this.children.some(x=>x.contains(element))}
  closest(selector){for(let item=this;item;item=item.parentElement)if(matches(item,selector))return item;return null}
  querySelectorAll(selector){const descendants=[];const visit=element=>{for(const child of element.children){descendants.push(child);visit(child)}};visit(this);return descendants.filter(x=>matches(x,selector))}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null}
  appendChild(element){if(element.parentElement){const siblings=element.parentElement.children,index=siblings.indexOf(element);if(index>=0)siblings.splice(index,1)}element.parentElement=this;this.children.push(element);return element}
  insertAdjacentHTML(position,value){if(position==='afterend'||position==='beforebegin'){const fragment=new Element('fragment');parse(value,fragment);const parent=this.parentElement,index=parent.children.indexOf(this)+(position==='afterend'?1:0);for(const child of fragment.children)child.parentElement=parent;parent.children.splice(index,0,...fragment.children)}else parse(value,this)}
  showModal(){this.open=true;this.hidden=false}
  close(){this.open=false;this.hidden=true}
  scrollIntoView(){}
  getClientRects(){return this.hidden?[]:[{}]}
  checkValidity(){return true}
  reportValidity(){return true}
 }
 function matches(element,selector){
  if(selector.includes(','))return selector.split(',').some(part=>matches(element,part.trim()));
  const parts=selector.trim().split(/\s+/);if(parts.length>1){const last=parts.pop();if(!matches(element,last))return false;let parent=element.parentElement;while(parent){if(matches(parent,parts.join(' ')))return true;parent=parent.parentElement}return false}
  let simple=selector.replace(/:not\(([^)]+)\)/g,(_,inner)=>matches(element,inner)?'__never__':'');
  if(simple.includes('__never__'))return false;
  if(simple.includes(':checked')&&!element.checked)return false;
  if(simple.includes(':disabled')&&!element.disabled)return false;
  if(simple.includes(':enabled')&&element.disabled)return false;
  simple=simple.replace(/:(checked|disabled|enabled|first-child|last-child)/g,'');
  const tag=simple.match(/^[a-z][\w-]*/i)?.[0];if(tag&&element.tagName!==tag.toUpperCase())return false;
  for(const [,id]of simple.matchAll(/#([\w-]+)/g))if(element.id!==id)return false;
  for(const [,name]of simple.matchAll(/\.([\w-]+)/g))if(!element.classList.contains(name))return false;
  for(const [,key,,value]of simple.matchAll(/\[([\w-]+)(?:=(['"]?)([^\]'"\s]+)\2)?\]/g)){if(value===undefined){if(!element.hasAttribute(key))return false}else if(element.getAttribute(key)!==value)return false}
  return true;
 }
 function parse(markup,parent){const stack=[parent];for(const token of markup.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)||[]){if(token.startsWith('<!--')||/^<!/i.test(token))continue;if(token.startsWith('</')){if(stack.length>1)stack.pop();continue}if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const attrs={};const rest=token.slice(tag.length+1,-1);for(const [,key,,quoted,bare]of rest.matchAll(/([\w:-]+)(?:\s*=\s*(?:(['"])(.*?)\2|([^\s>]+)))?/g))attrs[key]=decode(quoted??bare??'');const node=new Element(tag,attrs);node.parentElement=stack.at(-1);node.parentElement.children.push(node);if(!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tag)&&!token.endsWith('/>'))stack.push(node)}else stack.at(-1).ownText+=decode(token)}}
 document=new Element('document');document.documentElement=new Element('html');document.body=new Element('body');document.body.parentElement=document;document.children.push(document.body);parse(html.match(/<body>([\s\S]*?)<script src=/)[1],document.body);document.activeElement=document.body;
 return document;
}

function harness({loggedIn=false,plan=null,shopping=null,stored=null,profile=null,profileError=null,syncError=null,invokeError=null,invokePlan=null,hash='',passwordEnabled=false,online=true,mobile=false}={}){
 const document=domHarness(),storage=new Map(),calls={invoke:0,writes:[],reads:[],history:[],scroll:[],signOut:0},windowListeners={};
 if(stored)storage.set('forma-settings',JSON.stringify(stored));
 const location={origin:'https://test.invalid',pathname:'/DietSupportApp/',hash,search:''};
 const changeLocation=url=>{const parsed=new URL(url,location.origin+location.pathname);location.hash=parsed.hash;location.search=parsed.search};
 const history={pushState:(_data,_title,url)=>{calls.history.push(['push',url]);changeLocation(url)},replaceState:(_data,_title,url)=>{calls.history.push(['replace',url]);changeLocation(url)}};
 let responsePlan=plan;
 const chain={select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){return this},async maybeSingle(){return{data:responsePlan,error:null}}};
 let profileResponse={data:profile,error:profileError},writeError=syncError;
 const client={from:table=>table==='profiles'?{...chain,async maybeSingle(){calls.reads.push(table);return profileResponse},upsert:async row=>{calls.writes.push(JSON.parse(JSON.stringify(row)));return{error:writeError}}}:table==='shopping_cycles'?{...chain,async maybeSingle(){calls.reads.push(table);return{data:shopping,error:null}}}:{...chain,async maybeSingle(){calls.reads.push(table);return{data:responsePlan,error:null}}},
  functions:{invoke:async()=>{calls.invoke++;if(invokeError)return{data:null,error:invokeError};responsePlan=invokePlan;return{data:{plan:invokePlan},error:null}}},auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(listener){calls.authListener=listener},signOut:async()=>{calls.signOut++;return{error:null}}}};
 const navigator={onLine:online};
 const window={FORMA_SUPABASE:{url:'https://fake.invalid',anonKey:'isolated-test-only',passwordAuthEnabled:passwordEnabled},supabase:{createClient:()=>client},location,history,innerWidth:mobile?390:1440,matchMedia:()=>({matches:mobile,addEventListener(){}}),scrollTo:value=>calls.scroll.push(value),addEventListener:(type,fn)=>(windowListeners[type]??=[]).push(fn)};
 const context=vm.createContext({document,window,navigator,location,history,URL,URLSearchParams,Date,Map,Set,console,CSS:{escape:String},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:fn=>fn()});
 // Avoid session restoration and network-related startup, then seed explicit fixtures.
 const bootless=application.replace(/\nrender\(\);\s*\ninitAuth\(\);/,'\n');
 assert.notEqual(bootless,application,'Boot marker changed: isolate startup before running full-script UI tests');
 vm.runInContext(bootless,context);
 const run=code=>vm.runInContext(code,context);
 context.fixturePlan=plan;context.fixtureShopping=shopping;
 run(`currentUser=${loggedIn?'{id:"ux-test-owner",email:"ux@example.invalid"}':'null'};remotePlan=fixturePlan;remoteShopping=fixtureShopping;${plan||invokePlan?'state={...state,goal:"keep",weight:70,protein:2,calories:2200,mealCount:2,shopDays:3};':''}`);
 return{document,$:selector=>document.querySelector(selector),storage,calls,context,windowListeners,location,navigator,run,client,setResponsePlan:plan=>{responsePlan=plan},setProfileResponse:response=>{profileResponse=response},setWriteError:error=>{writeError=error}};
}

function planFixture(){const fixture=task3Fixture().plan;const start=new Date();start.setHours(12,0,0,0);fixture.content.days.forEach((day,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);day.date=date.toISOString().slice(0,10)});fixture.cycle_start=fixture.content.days[0].date;fixture.cycle_end=fixture.content.days.at(-1).date;fixture.created_at=new Date().toISOString();return fixture}

// Each day's four totals must differ, including from the saved targets and the
// deliberately stale daily aggregates. Identical fixture days hide stale UI.
const macroDayTotals=[
 '900 kcal · 60 g białka · 29.3 g tłuszczu · 85.7 g węglowodanów',
 '1060 kcal · 75 g białka · 33.7 g tłuszczu · 105.7 g węglowodanów',
 '890 kcal · 63 g białka · 28.7 g tłuszczu · 94.7 g węglowodanów',
];
function macroPlanFixture(){
 const plan=planFixture(),macros=[
  [[610,41,17.2,61.3],[290,19,12.1,24.4]],
  [[735,53,23.4,74.1],[325,22,10.3,31.6]],
  [[480,34,12.2,48.3],[410,29,16.5,46.4]],
 ];
 plan.target_kcal=3456;plan.target_protein_g=222;
 plan.content.days.forEach((day,index)=>{
  Object.assign(day,{total_kcal:9000+index,total_protein_g:900+index,total_fat_g:800+index,total_carbs_g:700+index});
  day.meals.forEach((meal,mealIndex)=>{const [kcal,protein_g,fat_g,carbs_g]=macros[index][mealIndex];Object.assign(meal,{kcal,protein_g,fat_g,carbs_g})});
 });
 return plan;
}
function assertMacroDay(h,plan,index){
 const day=plan.content.days[index];
 assert.equal(h.run('currentPlan().date'),day.date);
 assert.equal(h.$('#planDaySelect').value,String(index));
 assert.equal(h.$('#dayTotals').textContent,macroDayTotals[index]);
 assert.equal(h.$('#dayTitle').textContent,'Jadłospis na '+new Date(day.date+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})+'.');
 const cards=h.document.querySelectorAll('#mealDetails .meal-detail');assert.equal(cards.length,day.meals.length);
 day.meals.forEach((meal,mealIndex)=>{
  assert.ok(cards[mealIndex].textContent.includes(meal.name));
  for(const text of [meal.kcal+' kcal',meal.protein_g+' g białka',meal.fat_g+' g tłuszczu',meal.carbs_g+' g węglowodanów'])assert.ok(cards[mealIndex].textContent.includes(text),text);
 });
}

test('UX0: harness executes complete production script without external scripts',()=>{
 const h=harness();assert.doesNotThrow(()=>h.run('render()'));assert.equal(h.calls.invoke,0);
 assert.ok(h.$('#generateBtn'));assert.ok(h.$('#settingsForm'));
});

test('MOBILE15: cztery pozycje menu zachowują stałe widoczne podpisy i istniejące trasy',()=>{
 const h=harness({mobile:true});h.run('render();applyRoute()');
 const expected=[['dashboard','Dzisiaj'],['day','Jadłospis'],['shopping','Zakupy'],['settings','Ustawienia']];
 const buttons=h.document.querySelectorAll('.mobile-nav button');assert.equal(buttons.length,4);
 assert.deepEqual(buttons.map(button=>[button.dataset.view,button.querySelector('.mobile-nav-label')?.textContent]),expected);
 for(const button of buttons){
  const label=button.querySelector('.mobile-nav-label');
  assert.ok(label);assert.equal(label.hidden,false);assert.notEqual(label.getAttribute('aria-hidden'),'true');
  assert.equal(button.getAttribute('aria-label'),null,'Widoczny podpis pozostaje nazwą dostępną przycisku');
  assert.equal(button.getAttribute('tabindex'),null,'Menu korzysta z natywnych przycisków, bez dodatkowej kolejności Tab');
 }
});

test('MOBILE15: ikony są dekoracyjnymi lokalnymi SVG bez dodatkowych punktów fokusu ani zależności sieciowych',()=>{
 const h=harness({mobile:true});
 for(const button of h.document.querySelectorAll('.mobile-nav button')){
  const icons=button.querySelectorAll('svg');assert.equal(icons.length,1,button.dataset.view);
  const icon=icons[0];assert.equal(icon.getAttribute('aria-hidden'),'true');assert.equal(icon.getAttribute('focusable'),'false');
  assert.equal(icon.getAttribute('width'),'22');assert.equal(icon.getAttribute('height'),'22');
  const inheritedStroke=html.match(/\.mobile-nav-icon\s*\{([^}]+)\}/)?.[1].match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/)?.[1].trim();
  assert.equal(icon.getAttribute('stroke')||inheritedStroke,'currentColor');assert.ok(icon.getAttribute('viewBox'));
  assert.equal(icon.querySelectorAll('title,desc,a,use,image').length,0,'Ikona ma własną geometrię i nie wymaga zewnętrznego pliku');
  for(const node of [icon,...icon.querySelectorAll('*')]){
   assert.equal(node.getAttribute('tabindex'),null);assert.equal(node.getAttribute('aria-label'),null);
   assert.equal(node.getAttribute('href'),null);assert.equal(node.getAttribute('xlink:href'),null);
  }
 }
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=['"]([^'"]+)/g)].map(match=>match[1]);
 assert.ok(scripts.every(source=>!/lucide|fontawesome|font-awesome|iconify|feather/i.test(source)),'Ikony menu nie dodają biblioteki pobieranej z CDN');
});

test('MOBILE15: kliknięcie ikony, podpisu i przycisku wybiera jeden ekran bez podwójnego wpisu historii',async()=>{
 for(const loggedIn of [false,true]){
  const plan=planFixture(),h=harness({mobile:true,loggedIn,plan});h.run('render();applyRoute()');
  for(const view of ['day','shopping','settings','dashboard']){
   const button=h.$('.mobile-nav [data-view="'+view+'"]'),before=h.calls.history.length;
   const nestedIcon=button.querySelector('svg').children[0];assert.ok(nestedIcon,'Ikona musi mieć własną geometrię');
   await nestedIcon.click();assert.equal(h.calls.history.length,before+1);
   assert.equal(h.$('#'+view).classList.contains('active'),true);
   assert.equal(button.getAttribute('aria-current'),'page');assert.equal(button.classList.contains('active'),true);
   assert.equal(h.document.querySelectorAll('.mobile-nav [aria-current="page"]').length,1);
   assert.equal(h.document.querySelectorAll('.view.active').length,1);
   assert.equal(h.document.activeElement,h.$('#'+view+' h1'),'Zmiana widoku przekazuje fokus do jego nagłówka');
   await button.querySelector('.mobile-nav-label').click();await button.click();
   assert.equal(h.calls.history.length,before+1,'Ponowne wybranie aktywnej zakładki nie powiela historii');
  }
  assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);assert.equal(h.calls.signOut,0);
  assert.equal(h.run('remotePlan.id'),plan.id,'Nawigacja nie zmienia pobranego planu');
 }
});

test('MOBILE15: Wstecz i zmiana hasha odtwarzają aktywną ikonę oraz wybrany dzień zalogowanego użytkownika',async()=>{
 const plan=planFixture(),date=plan.content.days[2].date,h=harness({mobile:true,loggedIn:true,plan,hash:'#day?date='+date});
 h.run('render();applyRoute()');const meals=h.$('#mealDetails').innerHTML;
 await h.$('.mobile-nav [data-view="shopping"] svg').children[0].click();
 const writes=h.calls.history.length;
 h.location.hash='#day?date='+date;
 for(const listener of h.windowListeners.popstate||[])listener({type:'popstate'});
 assert.equal(h.run('currentPlan().date'),date);assert.equal(h.$('#mealDetails').innerHTML,meals);
 assert.equal(h.$('.mobile-nav [data-view="day"]').getAttribute('aria-current'),'page');
 assert.equal(h.$('#planDaySelect').value,'2');assert.equal(h.calls.history.length,writes);
 h.location.hash='#settings';
 for(const listener of h.windowListeners.hashchange||[])listener({type:'hashchange'});
 assert.equal(h.$('.mobile-nav [data-view="settings"]').getAttribute('aria-current'),'page');
 assert.equal(h.$('.mobile-nav [data-view="day"]').getAttribute('aria-current'),null);
 await h.$('.mobile-nav [data-view="day"] .mobile-nav-label').click();
 assert.equal(h.location.hash,'#day?date='+date);assert.equal(h.run('currentPlan().date'),date);
 assert.equal(h.$('#mealDetails').innerHTML,meals);assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);
});

test('MOBILE15: odstęp od menu reaguje na rzeczywistą wysokość, powiększenie tekstu i powrót na desktop',()=>{
 const h=harness({mobile:true}),nav=h.$('.mobile-nav');let height=96.3,onResize,observed;
 nav.getBoundingClientRect=()=>({height});
 h.context.window.ResizeObserver=class{constructor(callback){onResize=callback}observe(element){observed=element}};
 h.run('initMobileNavigation()');
 const measured=()=>h.document.documentElement.style['--mobile-nav-height'];
 assert.equal(measured(),'97px','Ułamkowa wysokość jest zaokrąglana w górę, nie może zasłonić końca treści');
 assert.equal(observed,nav);assert.equal(typeof onResize,'function');
 height=157.7;onResize();assert.equal(measured(),'158px','Wyższe podpisy po zmianie wielkości tekstu zwiększają odstęp');
 height=0;for(const listener of h.windowListeners.resize||[])listener({type:'resize'});
 assert.equal(measured(),'0px','Ukryte menu po przejściu na desktop nie pozostawia mobilnego odstępu');
});

test('MOBILE15: załadowanie fontów aktualizuje odstęp także bez ResizeObserver',async()=>{
 const h=harness({mobile:true}),nav=h.$('.mobile-nav');let height=90,fontsReady;
 nav.getBoundingClientRect=()=>({height});
 h.document.fonts={ready:new Promise(resolve=>{fontsReady=resolve})};
 h.run('initMobileNavigation()');assert.equal(h.document.documentElement.style['--mobile-nav-height'],'90px');
 height=104.4;fontsReady();await Promise.resolve();await Promise.resolve();
 assert.equal(h.document.documentElement.style['--mobile-nav-height'],'105px');
});

test('MOBILE15: CSS zachowuje kontrast, duże pola dotyku, safe area i widoczny fokus bez ukrywania podpisów',()=>{
 const stylesheet=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 const declarations=selector=>[...stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(match=>match[1].trim().split(',').some(item=>item.trim()===selector))
  .flatMap(match=>match[2].split(';').filter(Boolean).map(value=>value.split(':').map(part=>part.trim())));
 const properties=selector=>Object.fromEntries(declarations(selector));
 const button=properties('.mobile-nav button'),active=properties('.mobile-nav button.active');
 assert.ok(Number.parseFloat(button['min-height'])>=68,'Dotykalny przycisk mieści ikonę i stale widoczny podpis');
 assert.ok(/var\(--ink\)|#102f29/i.test(active.background));assert.ok(/^(?:white|#fff(?:fff)?)$/i.test(active.color));
 const icon=properties('.mobile-nav-icon');assert.equal(icon['flex-shrink'],'0');
 const label=properties('.mobile-nav-label');assert.notEqual(label.display,'none');assert.notEqual(label.visibility,'hidden');
 assert.match(stylesheet,/:focus-visible\s*\{[^}]*outline\s*:\s*3px/i,'Klawiatura zachowuje widoczną obwódkę fokusu');
 assert.match(html,/<meta\s+name="viewport"[^>]*viewport-fit=cover/);
 assert.match(properties('.mobile-nav').padding,/env\(safe-area-inset-bottom/,'Menu rezerwuje dolny bezpieczny obszar iPhone');
 for(const [selector,property]of [['.shell','padding-bottom'],['.toast','bottom'],['html','scroll-padding-bottom']]){
  const value=properties(selector)[property];assert.ok(value,selector+' '+property);
  assert.match(value,/var\(--mobile-nav-height/,'Treść, komunikaty i przewijany fokus muszą uwzględniać zmierzone menu');
 }
});

test('UX1: zmiana założeń oznacza poprzedni plan jako nieaktualny także po ponownym renderowaniu',()=>{
 const h=harness({loggedIn:true,plan:planFixture()});
 h.run('state={...defaultSettings,goal:"keep",weight:70,protein:2,calories:2200,mealCount:2};state.planSettingsSnapshot={planId:remotePlan.id,signature:settingsSignature(state)}');
 assert.equal(h.run('planFreshness()'),'current');h.run('state.trainingsPerWeek=7');
 assert.equal(h.run('planFreshness()'),'stale');h.run('render()');
 assert.equal(h.$('#planNotice').hidden,false);assert.match(h.$('#planNoticeText').textContent,/ustaw|założ|nieaktual/i);
 h.run('render()');assert.equal(h.$('#planNotice').hidden,false);
});

test('UX1: starszy plan bez potwierdzonych założeń nie udaje zgodności tylko na podstawie kalorii',()=>{
 const h=harness({loggedIn:true,plan:planFixture()});
 h.run('state={...defaultSettings,goal:"keep",weight:70,protein:2,calories:2200,mealCount:2};delete state.planSettingsSnapshot');
 assert.equal(h.run('planFreshness()'),'unknown');h.run('renderPlanNotice()');
 assert.equal(h.$('#planNotice').hidden,false);
});

test('UX1: porównanie założeń ignoruje stan widoku i oznaczenia zakupów',()=>{
 const h=harness({loggedIn:true,plan:planFixture()});
 h.run('state.planSettingsSnapshot={planId:remotePlan.id,signature:settingsSignature(state)}');
 h.run('state.selectedPlanDay=2;checks["Ryż biały"]=true');assert.equal(h.run('planFreshness()'),'current');
});

test('UX2: błąd generowania zwraca false, pozostawia poprzedni plan i trwały komunikat',async()=>{
 const plan=planFixture(),h=harness({loggedIn:true,plan,invokeError:{message:'TEST: generator niedostępny'}});
 h.run('render();navigate("dashboard")');
 assert.equal(await h.run('generatePlan()'),false);assert.equal(h.run('remotePlan.id'),plan.id);
 assert.equal(h.calls.invoke,1);assert.equal(h.$('#generationStatus').hidden,false);
 assert.match(h.$('#generationStatus').textContent,/nie udało|nie utworzono|błąd/i);
 assert.match(h.$('#generationStatus').textContent,/poprzed|wcześniej|wyświetlan|zapisany/i);
 assert.equal(h.$('#generateBtn').disabled,false);
});

test('UX2: przycisk nie przechodzi do planu dnia po błędzie i nie ponawia płatnego zapytania',async()=>{
 const h=harness({loggedIn:true,plan:planFixture(),invokeError:{message:'TEST: błąd'}});
 h.run('render();navigate("dashboard")');const route=h.location.hash;
 await h.$('#generateBtn').click();assert.equal(h.location.hash,route);assert.equal(h.calls.invoke,1);
});

test('UX2: sukces zwraca true i zapisuje podpis ustawień dla wygenerowanego planu',async()=>{
 const plan=planFixture(),h=harness({loggedIn:true,invokePlan:plan});h.run('state.selectedPlanDay=2;render()');
 assert.equal(await h.run('generatePlan()'),true);assert.equal(h.run('remotePlan.id'),plan.id);
 assert.equal(h.run('state.planSettingsSnapshot.planId'),plan.id);assert.equal(h.run('planFreshness()'),'current');
 assert.equal(h.run('currentPlan().date'),plan.content.days[0].date);assert.equal(h.run('state.selectedPlanDay'),0);
 assert.ok(h.storage.get('forma-settings'));
});

test('UX2: podwójne kliknięcie nie uruchamia dwóch generowań',async()=>{
 const h=harness({loggedIn:true,invokePlan:planFixture()});h.run('render()');
 const result=await Promise.all([h.run('generatePlan()'),h.run('generatePlan()')]);
 assert.equal(result.filter(Boolean).length,1);assert.equal(h.calls.invoke,1);
});

test('UX3: pasek odnosi się do kalorii w planie i jest wyliczany, nie ma stałych 84%',()=>{
 const h=harness({plan:planFixture()});h.run('state.calories=2200;renderDashboard()');
 const bar=h.$('[role="progressbar"]')||h.$('.bar'),fill=bar.querySelector('i');
 assert.ok(fill,'Brak dynamicznego wypełnienia postępu');
 assert.ok(Number.parseFloat(fill.style.width)>42&&Number.parseFloat(fill.style.width)<44);
 assert.match(html,/Kalorie w (?:jadłospisie|planie)/);assert.doesNotMatch(html,/\.bar i\{[^}]*width:84%/);
});

test('UX4: trasa z datą wskazuje te same dania po odtworzeniu widoku',()=>{
 const plan=planFixture(),date=plan.content.days[2].date,h=harness({plan,hash:'#day?date='+date});
 h.run('render();applyRoute()');assert.equal(h.run('currentPlan().date'),date);
 assert.equal(h.$('#day').classList.contains('active'),true);assert.equal(h.$('#planDaySelect').value,'2');
 h.run('navigate("shopping");navigate("day")');assert.match(h.location.hash,new RegExp(date));
 assert.ok(h.calls.history.length);assert.equal(h.$('[data-view="day"]').getAttribute('aria-current'),'page');
});

test('UX4: przycisk Dzisiaj wraca z innego dnia do dzisiejszych posiłków i aktualizuje trasę',async()=>{
 const plan=planFixture(),h=harness({plan});h.run('state.selectedPlanDay=2;render();navigate("day")');
 assert.equal(h.run('currentPlan().date'),plan.content.days[2].date);assert.equal(h.$('#todayDay').disabled,false);
 h.$('#todayDay').focus();await h.$('#todayDay').click();assert.equal(h.run('currentPlan().date'),plan.content.days[0].date);
 assert.equal(h.document.activeElement,h.$('#todayDay'));
 assert.equal(h.$('#planDaySelect').value,'0');assert.match(h.location.hash,new RegExp(plan.content.days[0].date));
 h.$('#planDaySelect').focus();h.$('#planDaySelect').value='1';await h.$('#planDaySelect').emit('change');
 assert.equal(h.document.activeElement,h.$('#planDaySelect'));assert.equal(h.run('currentPlan().date'),plan.content.days[1].date);
});

test('MACRO17: wybór każdego dnia przelicza cztery sumy z posiłków zamiast celu lub zapisanej sumy dnia',async()=>{
 const plan=macroPlanFixture(),h=harness({loggedIn:true,plan});h.run('render();navigate("day")');
 assertMacroDay(h,plan,0);
 for(const index of [1,2,0,2,1]){
  h.$('#planDaySelect').value=String(index);await h.$('#planDaySelect').emit('change');
  assertMacroDay(h,plan,index);assert.equal(h.location.hash,'#day?date='+plan.content.days[index].date);
 }
 assert.equal(h.run('state.calories'),2200);assert.equal(h.run('remotePlan.target_kcal'),3456);
 assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);
});

test('MACRO17: poprzedni, następny i Dzisiaj aktualizują datę, dania oraz wszystkie sumy',async()=>{
 const plan=macroPlanFixture(),h=harness({loggedIn:true,plan});h.run('render();navigate("day")');
 assert.equal(h.$('#previousDay').disabled,true);assert.equal(h.$('#nextDay').disabled,false);
 for(const [button,index]of [['#nextDay',1],['#nextDay',2],['#previousDay',1],['#todayDay',0]]){
  await h.$(button).click();assertMacroDay(h,plan,index);
  assert.equal(h.location.hash,'#day?date='+plan.content.days[index].date);
  assert.equal(h.$('#previousDay').disabled,index===0);assert.equal(h.$('#nextDay').disabled,index===2);
 }
 assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);
});

test('MACRO17: data w trasie, Wstecz, hashchange i ponowne załadowanie odtwarzają zgodne sumy',async()=>{
 const plan=macroPlanFixture(),h=harness({loggedIn:true,plan,hash:'#day?date='+plan.content.days[2].date});
 h.run('render();applyRoute()');assertMacroDay(h,plan,2);
 await h.$('#previousDay').click();assertMacroDay(h,plan,1);
 const dayRoute=h.location.hash;
 h.run('navigate("shopping");navigate("day")');assert.equal(h.location.hash,dayRoute);assertMacroDay(h,plan,1);
 const writes=h.calls.history.length;
 for(const [event,index]of [['popstate',2],['hashchange',0]]){
  h.location.hash='#day?date='+plan.content.days[index].date;
  for(const listener of h.windowListeners[event]||[])listener({type:event});
  assertMacroDay(h,plan,index);assert.equal(h.calls.history.length,writes);
 }
 const reloaded=harness({loggedIn:true,plan,stored:{selectedPlanDay:0},hash:'#day?date='+plan.content.days[2].date});
 reloaded.run('render();applyRoute()');assertMacroDay(reloaded,plan,2);
 assert.equal(reloaded.calls.invoke,0);assert.equal(reloaded.calls.writes.length,0);
});

test('MACRO17: dzień z brakującym makro usuwa poprzednie sumy, a pełny dzień je odtwarza',async()=>{
 const plan=macroPlanFixture();delete plan.content.days[1].meals[0].carbs_g;
 const h=harness({loggedIn:true,plan});h.run('render();navigate("day")');assertMacroDay(h,plan,0);
 h.$('#planDaySelect').value='1';await h.$('#planDaySelect').emit('change');
 assert.equal(h.$('#dayTotals').textContent,'1060 kcal · 75 g białka');
 assert.match(h.$('#dayMacroNotice').textContent,/Starszy plan/);
 assert.match(h.$('#mealDetails').textContent,/brak danych o węglowodanach/);
 assert.ok(h.$('#mealDetails').textContent.includes('23.4 g tłuszczu'));
 h.$('#planDaySelect').value='2';await h.$('#planDaySelect').emit('change');assertMacroDay(h,plan,2);
 assert.doesNotMatch(h.$('#dayMacroNotice').textContent,/Starszy plan/);
 assert.doesNotMatch(h.$('#mealDetails').textContent,/brak danych/);
});

test('MACRO17: przykład lokalny ma jeden dzień i nie zachowuje sum makro wcześniejszego planu AI',()=>{
 const plan=macroPlanFixture(),h=harness({plan});h.run('render();remotePlan=null;state.mealCount=4;state.generatedPlan=null;renderDay()');
 assert.equal(h.$('#planDaySelect').disabled,true);assert.equal(h.$('#previousDay').disabled,true);
 assert.equal(h.$('#nextDay').disabled,true);assert.equal(h.$('#todayDay').disabled,true);
 assert.equal(h.$('#dayTotals').textContent,'2200 kcal · 140 g białka');
 assert.match(h.$('#dayMacroNotice').textContent,/Plan lokalny.*przykład/);
 assert.doesNotMatch(h.$('#dayTotals').textContent,/g tłuszczu|g węglowodanów/);
 assert.match(h.$('#mealDetails').textContent,/brak danych o tłuszczach/);
 assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);
});

test('UX5: gość widzi neutralne powitanie, plan demonstracyjny i logowanie przed generowaniem',()=>{
 const h=harness();h.run('render()');
 assert.doesNotMatch(h.$('#greeting').textContent,/Kamil/);
 assert.match(h.$('#generateBtn').textContent,/Zaloguj/i);assert.match(h.$('#planStatus').textContent,/przykład|demonstr|demo/i);
});

test('UX5: przycisk gościa otwiera logowanie bez zapytania do generatora',async()=>{
 const h=harness();h.run('render()');await h.$('#generateBtn').click();
 assert.equal(h.$('#loginDialog').hidden,false);assert.equal(h.calls.invoke,0);
});

test('UX6: zmiana celu jest szkicem — nie modyfikuje zapisanego stanu przed submit',async()=>{
 const h=harness();h.run('renderSettings()');const oldGoal=h.run('state.goal');
 const radio=h.$('#goalChoices input[value="gain"]');assert.ok(radio,'Cel powinien być natywną grupą radio');
 for(const item of h.$('#goalChoices').querySelectorAll('input'))item.checked=item===radio;
 await radio.emit('change');await h.$('#settingsForm').emit('input',{target:radio});
 assert.equal(h.run('state.goal'),oldGoal);assert.equal(h.storage.has('forma-settings'),false);
 assert.equal(h.run('settingsDirty'),true);
 await h.$('#settingsForm').emit('submit');assert.equal(h.run('state.goal'),'gain');
 assert.equal(JSON.parse(h.storage.get('forma-settings')).goal,'gain');
});

test('UX6: tryb automatyczny ignoruje ręczne kalorie, ręczny zachowuje wpisaną wartość',()=>{
 const h=harness();h.run('renderSettings()');h.$('#calories').value='2300';
 h.$('#calorieMode').value='manual';h.run('updateCalorieMode()');
 assert.equal(Number(h.run('readSettingsForm().calories')),2300);
 h.$('#calorieMode').value='auto';h.run('updateCalorieMode()');
 assert.equal(h.run('readSettingsForm().calories'),'');assert.equal(h.$('#calories').disabled,true);
});

test('UX6: niezapisany szkic blokuje generowanie i można go jawnie odrzucić',async()=>{
 const h=harness({loggedIn:true,plan:planFixture()});h.run('render()');
 h.$('#weight').value='81';await h.$('#settingsForm').emit('input');
 assert.equal(await h.run('generatePlan()'),false);assert.equal(h.calls.invoke,0);
 assert.match(h.location.hash,/#settings/);assert.equal(h.run('state.weight'),70);
 assert.equal(h.$('#discardSettings').hidden,false);await h.$('#discardSettings').click();
 assert.equal(h.run('settingsDirty'),false);assert.equal(Number(h.$('#weight').value),70);
 assert.equal(h.$('#generationStatus').hidden,true);assert.equal(h.storage.has('forma-settings'),false);
});

test('UX6: błędna ręczna kaloryczność daje trwały błąd i nie jest zapisywana',async()=>{
 const h=harness();h.run('renderSettings()');h.$('#calorieMode').value='manual';h.$('#calories').value='1100';
 await h.$('#settingsForm').emit('input');await h.$('#settingsForm').emit('submit');
 assert.equal(h.storage.has('forma-settings'),false);assert.match(h.$('#saveStatus').textContent,/1200.*10000/);
 assert.equal(h.run('settingsDirty'),true);
});

test('UX7: pojedynczy checkbox aktualizuje stan bez zastępowania listy i utraty fokusu',async()=>{
 const shopping={starts_on:'2026-10-18',ends_on:'2026-10-20',items:[{category:'Produkty suche',name:'Ryż biały',amount:240,unit:'g'}],promotions:[]};
 const h=harness({plan:planFixture(),shopping});h.run('renderShopping()');
 const category=h.$('#categories'),writes=category.innerHTMLWrites,checkbox=category.querySelector('input');
 checkbox.focus();checkbox.checked=true;await checkbox.emit('change');
 assert.equal(category.innerHTMLWrites,writes);assert.equal(h.document.activeElement,checkbox);
 assert.equal(h.run('checks["Ryż biały"]'),true);assert.match(h.$('#shopProgress').textContent,/1 \/ 1/);
 h.$('#shoppingFilter').value='pending';await h.$('#shoppingFilter').emit('change');
 assert.equal(checkbox.closest('.shop-item').hidden,true);
});

test('UX7: licznik zakupów ma jawny kontrastowy kolor ponad ogólnym stylem nagłówka',()=>{
 const rule=html.match(/\.shop-header\s+\.badge\s*\{([^}]+)\}/);
 assert.ok(rule,'Brak reguły o specyficzności wyższej niż .shop-header span');
 const declarations=Object.fromEntries(rule[1].split(';').filter(Boolean).map(item=>item.split(':').map(value=>value.trim())));
 assert.match(declarations.color,/^#(?:fff|ffffff)$/i);
 assert.equal(declarations.background?.toLowerCase(),'#0e5a46');
 const luminance=hex=>{
  const expanded=hex.length===4?'#'+[...hex.slice(1)].map(value=>value+value).join(''):hex;
  const [red,green,blue]=expanded.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
  return 0.2126*red+0.7152*green+0.0722*blue;
 };
 const foreground=luminance(declarations.color),background=luminance(declarations.background);
 const contrast=(Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
 assert.ok(contrast>=7,`Kontrast licznika zakupów wynosi tylko ${contrast.toFixed(2)}:1`);
});

test('UX7: oznaczenie wszystkich zakupów można cofnąć do dokładnego poprzedniego stanu',async()=>{
 const shopping={starts_on:'2026-10-18',ends_on:'2026-10-20',items:[{category:'Produkty suche',name:'Ryż biały',amount:240,unit:'g'},{category:'Nabiał',name:'Skyr',amount:200,unit:'g'}],promotions:[]};
 const h=harness({plan:planFixture(),shopping});h.run('checks={"Skyr":true};renderShopping()');
 await h.$('#completeShop').click();assert.equal(h.run('checks["Ryż biały"]'),true);assert.equal(h.$('#undoShop').hidden,false);
 await h.$('#undoShop').click();assert.equal(h.run('!!checks["Ryż biały"]'),false);assert.equal(h.run('checks.Skyr'),true);
 await h.$('#completeShop').click();const checkbox=h.$('#categories input');checkbox.checked=false;await checkbox.emit('change');
 assert.equal(h.run('undoShopping'),null);assert.equal(h.$('#undoShop').hidden,true);
});

test('UX7: wylogowanie unieważnia cofnięcie zakupów bez zmiany danych zapisanych w chmurze',async()=>{
 for(const external of [false,true]){
  const shopping={items:[{category:'Nabiał',name:'Skyr',amount:200,unit:'g'}],promotions:[]};
  const h=harness({loggedIn:true,plan:planFixture(),shopping});h.run('state.mealCount=4;checks={"Skyr":false};render()');
  await h.$('#completeShop').click();assert.ok(h.run('undoShopping'));
  if(external){await h.run('initAuth()');h.run('currentUser={id:"ux-test-owner"}')}
  const writes=h.calls.writes.length;
  if(external)h.calls.authListener('SIGNED_OUT',null);else await h.$('#logoutButton').click();
  assert.equal(h.run('undoShopping'),null);assert.equal(h.run('Object.keys(checks).length'),0);
  assert.equal(h.$('#undoShop').hidden,true);assert.equal(h.calls.writes.length,writes);
  await h.$('#undoShop').click();assert.equal(h.calls.writes.length,writes);
 }
});

test('UX7: odczyt innego profilu i zmiana cyklu nie pozwalają cofnąć poprzednich zakupów',async()=>{
 const plan=planFixture(),shopping={items:[{category:'Nabiał',name:'Skyr',amount:200,unit:'g'}],promotions:[]};
 const profile={settings:{goal:'keep',weight:70,protein:2,calories:2200,mealCount:4,shopDays:3},shopping_state:{'Nowy profil':true}};
 const h=harness({loggedIn:true,plan,shopping,profile});h.run('undoShopping={"Stary profil":true}');
 await h.run('restoreFromCloud()');assert.equal(h.run('undoShopping'),null);
 assert.equal(h.run('checks["Nowy profil"]'),true);assert.equal(h.run('checks["Stary profil"]'),undefined);
 const nextPlan={...plan,id:'new-shopping-cycle'};h.setResponsePlan(nextPlan);h.run('undoShopping={"Poprzedni cykl":true}');
 await h.run('restoreRemotePlan()');h.run('renderShopping()');assert.equal(h.run('remotePlan.id'),nextPlan.id);
 assert.equal(h.run('undoShopping'),null);assert.equal(h.$('#undoShop').hidden,true);
});

test('UX8: modal logowania blokuje tło, obsługuje Tab/Escape i oddaje fokus',async()=>{
 const h=harness();h.run('render();renderAccount()');const opener=h.$('#accountButton');opener.focus();
 h.run('requestLogin()');assert.equal(h.$('#loginDialog').hidden,false);assert.equal(h.$('.shell').inert,true);
 assert.equal(opener.inert,true);
 const focusable=h.$('#loginDialog').querySelectorAll('button,input,select,a[href]').filter(x=>!x.disabled&&!x.hidden&&!(x.closest('[hidden]')));
 const first=focusable[0],last=focusable.at(-1);last.focus();let prevented=false;
 h.context.keyboard={key:'Tab',shiftKey:false,preventDefault(){prevented=true}};h.run('trapLoginFocus(keyboard)');
 assert.equal(prevented,true);assert.equal(h.document.activeElement,first);
 h.context.keyboard={key:'Tab',shiftKey:true,preventDefault(){}};h.run('trapLoginFocus(keyboard)');assert.equal(h.document.activeElement,last);
 h.context.keyboard={key:'Escape',preventDefault(){}};h.run('trapLoginFocus(keyboard)');
 assert.equal(h.$('#loginDialog').hidden,true);assert.equal(h.$('.shell').inert,false);assert.equal(opener.inert,false);assert.equal(h.document.activeElement,opener);
});

test('UX8: zewnętrzne wylogowanie usuwa prywatny plan i zakupy z widoku',async()=>{
 const shopping={items:[{category:'Nabiał',name:'Skyr',amount:200,unit:'g'}],promotions:[]};
 const h=harness({loggedIn:true,plan:planFixture(),shopping});h.run('state.mealCount=4;render()');
 await h.run('initAuth()');assert.equal(typeof h.calls.authListener,'function');
 h.calls.authListener('SIGNED_OUT',null);
 assert.equal(h.run('currentUser'),null);assert.equal(h.run('remotePlan'),null);assert.equal(h.run('remoteShopping'),null);
 assert.match(h.$('#planStatus').textContent,/przykład|demonstr|demo/i);
 assert.doesNotMatch(h.$('#mealDetails').innerHTML,/TEST 2026/);
 assert.match(h.$('#generateBtn').textContent,/Zaloguj/i);
});

test('ACCOUNT4: odświeżenie tokenu lub ponowne zdarzenie SIGNED_IN nie usuwa danych bieżącego konta',async()=>{
 for(const event of ['TOKEN_REFRESHED','SIGNED_IN']){
  const plan=planFixture(),shopping={items:[{category:'Nabiał',name:'Skyr',amount:200,unit:'g'}],promotions:[]};
  const h=harness({plan,shopping});await h.run('initAuth()');
  h.context.fixturePlan=plan;h.context.fixtureShopping=shopping;
  h.run('currentUser={id:"ux-test-owner",email:"ux@example.invalid"};remotePlan=fixturePlan;remoteShopping=fixtureShopping;renderAccount()');
  h.calls.authListener(event,{user:{id:'ux-test-owner',email:'ux@example.invalid'}});
  assert.equal(h.run('remotePlan.id'),plan.id);assert.equal(h.run('remoteShopping.items[0].name'),'Skyr');
 }
});

test('AUTH6: rzeczywisty formularz domyślnie loguje hasłem w tej samej sesji bez maila',async()=>{
 const h=harness({passwordEnabled:true});const requests=[];
 h.client.auth.signInWithPassword=async args=>{requests.push(args);return{data:{session:{user:{id:'ux-test-owner',email:args.email}}}}};
 h.run('render();renderAccount();requestLogin()');
 assert.equal(h.$('#loginPasswordField').hidden,false);assert.equal(h.$('#loginCode').disabled,true);
 h.$('#loginEmail').value=' OWNER@example.invalid ';h.$('#loginPassword').value='fixture-only-passphrase';
 await h.$('#loginForm').emit('submit');
 assert.equal(requests.length,1);assert.equal(requests[0].email,'owner@example.invalid');
 assert.equal(h.run('currentUser.id'),'ux-test-owner');assert.equal(h.$('#loginDialog').hidden,true);assert.equal(h.$('#loginPassword').value,'');
 assert.equal(h.$('#passwordManage').hidden,false);assert.equal(h.calls.writes.length,0); // No account replacement/profile migration.
 assert.ok([...h.storage.values()].every(value=>!value.includes('fixture-only-passphrase')));
});

test('AUTH6: pełny formularz przełącza reset/link/hasło i pozwala ustawić hasło obecnego konta',async()=>{
 const h=harness({passwordEnabled:true,loggedIn:true});h.run('render();renderAccount()');
 h.client.auth.getUser=async()=>({data:{user:{id:'ux-test-owner'}}});h.client.auth.updateUser=async()=>({data:{user:{id:'ux-test-owner'}}});
 await h.$('#passwordManage').click();assert.equal(h.run('loginMethod'),'password-update');
 h.$('#loginPassword').value='fixture-only-passphrase';h.$('#loginPasswordConfirm').value='fixture-only-passphrase';
 await h.$('#loginForm').emit('submit');assert.equal(h.$('#loginDialog').hidden,true);
 h.run('requestLogin()');await h.$('#forgotPassword').click();assert.equal(h.run('loginMethod'),'password-reset');assert.equal(h.$('#loginPassword').disabled,true);
 await h.$('#backToPassword').click();await h.$('#useEmailLogin').click();assert.equal(h.run('loginMethod'),'email');assert.equal(h.$('#loginSubmit').textContent,'Wyślij link');
 await h.$('#backToPassword').click();assert.equal(h.$('#loginSubmit').textContent,'Zaloguj się');
});

test('AUTH6: router nie kasuje callbacku przed inicjalizacją SDK, a szkic hasła chroni odświeżenie',async()=>{
 const h=harness({passwordEnabled:true,hash:'#access_token=fixture&type=recovery'});
 assert.equal(h.location.hash,'#access_token=fixture&type=recovery');
 await h.run('initAuth()');assert.equal(h.location.hash,'#dashboard');
 h.run('requestLogin()');h.$('#loginPassword').value='fixture-only-passphrase';let prevented=false;
 h.windowListeners.beforeunload[0]({preventDefault(){prevented=true}});assert.equal(prevented,true);
 await h.$('#cancelLogin').click();assert.equal(h.$('#loginPassword').value,'');assert.equal(h.$('.shell').inert,false);
});

test('ACCOUNT1: Konto otwiera menu bez wylogowania, a sekcja konta jest po formularzu założeń',async()=>{
 const h=harness({loggedIn:true,passwordEnabled:true});h.run('render();renderAccount()');
 assert.equal(h.$('#accountButton').textContent,'Konto');
 await h.$('#accountButton').click();
 assert.equal(h.$('#accountMenu').hidden,false);assert.equal(h.calls.signOut,0);
 assert.equal(h.run('currentUser.id'),'ux-test-owner');assert.match(h.$('#accountMenuEmail').textContent,/ux@example.invalid/);
 await h.$('#accountSettingsAction').click();assert.equal(h.location.hash,'#settings');
 assert.equal(h.$('#accountMenu').hidden,true);assert.equal(h.calls.signOut,0);
 const nodes=h.document.querySelectorAll('*');
 assert.ok(nodes.indexOf(h.$('#accountSection'))>nodes.indexOf(h.$('#settingsForm')),'Konto musi następować po Twoich założeniach w kolejności dokumentu');
 assert.equal(h.$('#accountSection').closest('#settings'),h.$('#settings'));
 assert.match(h.$('#accountEmail').textContent,/ux@example.invalid/);
 assert.equal(h.$('#logoutButton').hidden,false);assert.equal(h.$('#accountLogin').hidden,true);
});

test('ACCOUNT1: kontrolka konta jest przenoszona do zwykłego nagłówka mobilnego lub widoku',()=>{
 for(const mobile of [false,true]){
  const h=harness({mobile});h.run('render();renderAccount()');
  const control=h.$('#accountControl');assert.ok(control);
  assert.equal(h.document.querySelectorAll('#accountButton').length,1);
  if(mobile)assert.ok(control.closest('.mobile-bar'));else assert.ok(control.closest('#dashboard .topline'));
  h.run('navigate("settings")');
  if(mobile)assert.ok(control.closest('.mobile-bar'));else assert.ok(control.closest('#settings .topline'));
 }
 assert.doesNotMatch(html,/\.account(?:-control)?\s*\{[^}]*position:\s*(?:fixed|sticky)/);
});

test('ACCOUNT1: logowanie gościa działa z sekcji Konto, bez żądań ani automatycznej synchronizacji',async()=>{
 const h=harness({passwordEnabled:true});h.run('render();renderAccount();navigate("settings")');
 assert.equal(h.$('#accountLogin').hidden,false);assert.equal(h.$('#logoutButton').hidden,true);
 await h.$('#accountLogin').click();assert.equal(h.$('#loginDialog').hidden,false);
 assert.equal(h.calls.signOut,0);assert.equal(h.calls.invoke,0);assert.equal(h.calls.writes.length,0);
});

test('ACCOUNT2: sukces synchronizacji jest w Koncie, a czas ostatniego sukcesu nie zmienia się po błędzie',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');
 assert.equal(await h.run('syncToCloud()'),true);
 assert.match(h.$('#accountSyncStatus').textContent,/zsynchroniz|zapisano|zapisane/i);
 const lastSuccess=h.$('#accountSyncTime').textContent;assert.match(lastSuccess,/\d{1,2}:\d{2}/);
 assert.equal(h.$('#syncStatus').hidden,true,'Rutynowy sukces nie może zajmować górnej przestrzeni');
 h.setWriteError({message:'fixture network error'});assert.equal(await h.run('syncToCloud()'),false);
 assert.equal(h.$('#accountSyncTime').textContent,lastSuccess);
 assert.equal(h.$('#syncStatus').hidden,false);assert.match(h.$('#syncStatus').textContent,/lokal|urządzeni|synchroniz/i);
 h.run('render();navigate("shopping");render()');assert.equal(h.$('#syncStatus').hidden,false);
 assert.equal(h.$('#shoppingSyncStatus').hidden,false);assert.match(h.$('#shoppingSyncStatus').textContent,/lokal|urządzeni|chmur/i);
 assert.equal(h.$('#accountSyncTime').textContent,lastSuccess);assert.equal(h.$('#syncRetry').hidden,false);
 h.setWriteError(null);await h.$('#syncRetry').click();
 assert.equal(h.$('#syncStatus').hidden,true);assert.equal(h.$('#syncRetry').hidden,true);
});

test('ACCOUNT2: zapis formularza potwierdza się przy Zapisz, bez dodatkowego toastu sukcesu',async()=>{
 const h=harness();h.run('render();renderAccount()');
 await h.$('#settingsForm').emit('submit');assert.match(h.$('#saveStatus').textContent,/Zapisano/);
 assert.equal(h.$('#toast').classList.contains('show'),false);
});

test('ACCOUNT3: ponowienie nieudanego odczytu wykonuje odczyt, nigdy zapis danych lokalnych',async()=>{
 const h=harness({loggedIn:true,profileError:{message:'fixture read unavailable'}});h.run('render();renderAccount()');
 await h.run('restoreFromCloud()');assert.equal(h.calls.reads.filter(x=>x==='profiles').length,1);
 assert.equal(h.calls.writes.length,0);assert.equal(h.$('#syncRetry').hidden,false);
 await h.$('#syncRetry').click();assert.equal(h.calls.reads.filter(x=>x==='profiles').length,2);
 assert.equal(h.calls.writes.length,0,'Błąd pobrania nie może być naprawiany upsertem nieznanych danych lokalnych');
 const settings={...h.run('defaultSettings'),weight:88};h.setProfileResponse({data:{settings,shopping_state:{}},error:null});
 await h.$('#syncRetry').click();assert.equal(h.run('state.weight'),88);assert.equal(h.calls.writes.length,0);
 assert.equal(h.$('#syncStatus').hidden,true);assert.match(h.$('#accountSyncTime').textContent,/\d{1,2}:\d{2}/);
});

test('ACCOUNT3: tryb offline nie wysyła zmian, a ponowienie po odzyskaniu sieci jest jawne',async()=>{
 const h=harness({loggedIn:true,online:false});h.run('render();renderAccount()');
 assert.equal(await h.run('syncToCloud()'),false);assert.equal(h.calls.writes.length,0);
 assert.match(h.$('#accountSyncStatus').textContent,/uwagi/i);assert.match(h.$('#syncStatus').textContent,/internet|lokal|urządzeni/i);
 h.navigator.onLine=true;h.run('renderAccount()');assert.equal(h.calls.writes.length,0);
 await h.$('#syncRetry').click();assert.equal(h.calls.writes.length,1);
});

test('ACCOUNT4: zmiana właściciela usuwa poprzedni czas i status synchronizacji',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');await h.run('syncToCloud()');
 assert.match(h.$('#accountSyncTime').textContent,/\d{1,2}:\d{2}/);
 h.run('currentUser={id:"other-owner",email:"other@example.invalid"};renderAccount()');
 assert.doesNotMatch(h.$('#accountSyncTime').textContent,/\d{1,2}:\d{2}/);
 assert.doesNotMatch(h.$('#accountSyncStatus').textContent,/zsynchronizowano|zapisano w chmurze/i);
 assert.match(h.$('#accountEmail').textContent,/other@example.invalid/);
});

test('ACCOUNT4: spóźnione pobranie poprzedniego użytkownika nie przywraca prywatnych danych',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');
 let complete;
 h.client.from=table=>{assert.equal(table,'profiles');return{select(){return this},eq(){return this},maybeSingle:()=>new Promise(resolve=>{complete=resolve})}};
 const request=h.run('restoreFromCloud()');assert.equal(typeof complete,'function');
 h.run('currentUser={id:"other-owner",email:"other@example.invalid"};renderAccount()');
 complete({data:{settings:{weight:199},shopping_state:{'private previous owner':true}},error:null});await request;
 assert.notEqual(h.run('state.weight'),199);assert.equal(h.run('checks["private previous owner"]'),undefined);
 assert.doesNotMatch(h.$('#accountSyncTime').textContent,/\d{1,2}:\d{2}/);
 assert.equal(h.calls.writes.length,0);
});

test('ACCOUNT4: równoległe zapisy są uporządkowane i zachowują osobne migawki danych',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');
 let completeFirst;const writes=[];
 h.client.from=table=>{assert.equal(table,'profiles');return{upsert:row=>{writes.push(JSON.parse(JSON.stringify(row)));if(writes.length===1)return new Promise(resolve=>{completeFirst=resolve});return Promise.resolve({error:null})}}};
 h.run('state.weight=76');const first=h.run('syncToCloud()');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes.length,1);h.run('state.weight=88');const second=h.run('syncToCloud()');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writes.length,1,'Drugi zapis musi poczekać na pierwszy, aby starszy wynik nie nadpisał nowszego');
 completeFirst({error:null});await Promise.all([first,second]);
 assert.deepEqual(writes.map(row=>row.settings.weight),[76,88]);
 assert.equal(h.run('state.weight'),88);assert.equal(h.$('#syncStatus').hidden,true);
});

test('ACCOUNT4: zalogowanie na inne konto od razu usuwa widok danych poprzedniego właściciela',async()=>{
 const plan=planFixture(),shopping={items:[{name:'private previous owner',amount:200,unit:'g'}],promotions:[]};
 const h=harness({plan,shopping});await h.run('initAuth()');h.context.fixturePlan=plan;h.context.fixtureShopping=shopping;
 h.run('currentUser={id:"previous-owner",email:"previous@example.invalid"};remotePlan=fixturePlan;remoteShopping=fixtureShopping;checks={"private previous owner":true};undoShopping={"private previous owner":false};renderAccount()');
 h.calls.authListener('SIGNED_IN',{user:{id:'new-owner',email:'new@example.invalid'}});
 assert.equal(h.run('currentUser.id'),'new-owner');assert.equal(h.run('remotePlan'),null);assert.equal(h.run('remoteShopping'),null);
 assert.equal(h.run('undoShopping'),null);assert.equal(h.run('Object.keys(checks).length'),0);
});

test('ACCOUNT4: spóźnione zakończenie zapisu nie przypisuje sukcesu innemu kontu',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');let complete;
 h.client.from=()=>({upsert:()=>new Promise(resolve=>{complete=resolve})});
 const request=h.run('syncToCloud()');await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof complete,'function');
 h.run('currentUser={id:"other-owner",email:"other@example.invalid"};renderAccount()');
 complete({error:null});assert.equal(await request,false);
 assert.doesNotMatch(h.$('#accountSyncTime').textContent,/\d{1,2}:\d{2}/);
 assert.doesNotMatch(h.$('#accountSyncStatus').textContent,/zsynchronizowano|zapisano w chmurze/i);
});

test('ACCOUNT3: edycja podczas ponawianego odczytu nie blokuje kolejnej próby po odrzuceniu szkicu',async()=>{
 const h=harness({loggedIn:true,profileError:{message:'fixture unavailable'}});h.run('render();renderAccount()');await h.run('restoreFromCloud()');
 let complete,reads=0;const profile={settings:{...h.run('defaultSettings'),weight:88},shopping_state:{}};
 h.client.from=table=>({select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){return this},maybeSingle(){if(table!=='profiles')return Promise.resolve({data:null,error:null});reads++;return reads===1?new Promise(resolve=>{complete=resolve}):Promise.resolve({data:profile,error:null})}});
 const request=h.$('#syncRetry').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof complete,'function');
 h.$('#weight').value='90';await h.$('#settingsForm').emit('input');assert.equal(h.run('settingsDirty'),true);
 complete({data:profile,error:null});await request;
 assert.notEqual(h.run('state.weight'),88);assert.equal(h.$('#syncRetry').disabled,false);
 assert.match(h.$('#syncStatus').textContent,/zmian|szkic/i);
 await h.$('#discardSettings').click();await h.$('#syncRetry').click();
 assert.equal(reads,2);assert.equal(h.run('state.weight'),88);assert.equal(h.$('#syncStatus').hidden,true);
 assert.equal(h.calls.writes.length,0);
});

test('ACCOUNT4: odczyty kończące się w odwrotnej kolejności zachowują wyłącznie najnowszy wynik',async()=>{
 const h=harness({loggedIn:true});h.run('render();renderAccount()');const pending=[];
 h.client.from=table=>({select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){return this},maybeSingle(){return table==='profiles'?new Promise(resolve=>pending.push(resolve)):Promise.resolve({data:null,error:null})}});
 const first=h.run('restoreFromCloud()'),second=h.run('restoreFromCloud()');assert.equal(pending.length,2);
 pending[1]({data:{settings:{...h.run('defaultSettings'),weight:88},shopping_state:{'new result':true}},error:null});assert.equal(await second,true);
 const successTime=h.$('#accountSyncTime').textContent;
 pending[0]({data:{settings:{...h.run('defaultSettings'),weight:76},shopping_state:{'old result':true}},error:null});assert.equal(await first,false);
 assert.equal(h.run('state.weight'),88);assert.equal(h.run('checks["new result"]'),true);assert.equal(h.run('checks["old result"]'),undefined);
 assert.equal(h.$('#accountSyncTime').textContent,successTime);assert.equal(h.$('#syncStatus').hidden,true);
});
