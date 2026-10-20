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
  insertAdjacentHTML(_position,value){parse(value,this)}
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
 document=new Element('document');document.body=new Element('body');document.body.parentElement=document;document.children.push(document.body);parse(html.match(/<body>([\s\S]*?)<script src=/)[1],document.body);document.activeElement=document.body;
 return document;
}

function harness({loggedIn=false,plan=null,shopping=null,stored=null,profile=null,invokeError=null,invokePlan=null,hash=''}={}){
 const document=domHarness(),storage=new Map(),calls={invoke:0,writes:[],history:[],scroll:[]},windowListeners={};
 if(stored)storage.set('forma-settings',JSON.stringify(stored));
 const location={origin:'https://test.invalid',pathname:'/DietSupportApp/',hash,search:''};
 const changeLocation=url=>{const parsed=new URL(url,location.origin+location.pathname);location.hash=parsed.hash;location.search=parsed.search};
 const history={pushState:(_data,_title,url)=>{calls.history.push(['push',url]);changeLocation(url)},replaceState:(_data,_title,url)=>{calls.history.push(['replace',url]);changeLocation(url)}};
 let responsePlan=plan;
 const chain={select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){return this},async maybeSingle(){return{data:responsePlan,error:null}}};
 const client={from:table=>table==='profiles'?{...chain,async maybeSingle(){return{data:profile,error:null}},upsert:async row=>{calls.writes.push(row);return{error:null}}}:table==='shopping_cycles'?{...chain,async maybeSingle(){return{data:shopping,error:null}}}:chain,
  functions:{invoke:async()=>{calls.invoke++;if(invokeError)return{data:null,error:invokeError};responsePlan=invokePlan;return{data:{plan:invokePlan},error:null}}},auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(listener){calls.authListener=listener},signOut:async()=>({error:null})}};
 const window={FORMA_SUPABASE:{url:'https://fake.invalid',anonKey:'isolated-test-only'},supabase:{createClient:()=>client},location,history,scrollTo:value=>calls.scroll.push(value),addEventListener:(type,fn)=>(windowListeners[type]??=[]).push(fn)};
 const context=vm.createContext({document,window,location,history,URL,URLSearchParams,Date,Map,Set,console,CSS:{escape:String},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:fn=>fn()});
 // Avoid session restoration and network-related startup, then seed explicit fixtures.
 const bootless=application.replace(/\nrender\(\);\s*\ninitAuth\(\);/,'\n');
 assert.notEqual(bootless,application,'Boot marker changed: isolate startup before running full-script UI tests');
 vm.runInContext(bootless,context);
 const run=code=>vm.runInContext(code,context);
 context.fixturePlan=plan;context.fixtureShopping=shopping;
 run(`currentUser=${loggedIn?'{id:"ux-test-owner",email:"ux@example.invalid"}':'null'};remotePlan=fixturePlan;remoteShopping=fixtureShopping;${plan||invokePlan?'state={...state,goal:"keep",weight:70,protein:2,calories:2200,mealCount:2,shopDays:3};':''}`);
 return{document,$:selector=>document.querySelector(selector),storage,calls,context,windowListeners,location,run,setResponsePlan:plan=>{responsePlan=plan}};
}

function planFixture(){const fixture=task3Fixture().plan;const start=new Date();start.setHours(12,0,0,0);fixture.content.days.forEach((day,index)=>{const date=new Date(start);date.setDate(date.getDate()+index);day.date=date.toISOString().slice(0,10)});fixture.cycle_start=fixture.content.days[0].date;fixture.cycle_end=fixture.content.days.at(-1).date;fixture.created_at=new Date().toISOString();return fixture}

test('UX0: harness executes complete production script without external scripts',()=>{
 const h=harness();assert.doesNotThrow(()=>h.run('render()'));assert.equal(h.calls.invoke,0);
 assert.ok(h.$('#generateBtn'));assert.ok(h.$('#settingsForm'));
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
  if(external)h.calls.authListener('SIGNED_OUT',null);else await h.$('#accountButton').click();
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
