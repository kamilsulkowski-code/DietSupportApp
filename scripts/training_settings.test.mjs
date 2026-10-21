import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const edge=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/generate-plan/index.ts',import.meta.url),'utf8').replace(/^import .*createClient.*\n/,''));
const lines=html.split('\n');
function frontend({stored=null,cloud=null,syncError=false,loggedIn=false}={}) {
 const elements=new Map(),storage=new Map(),messages=[],writes=[],invocations=[];
 if(stored)storage.set('forma-settings',JSON.stringify(stored));
 const $=selector=>{if(!elements.has(selector))elements.set(selector,{value:'',textContent:'',dataset:{},listeners:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(event,fn){this.listeners[event]=fn}});return elements.get(selector)};
 const context=vm.createContext({$, $$:()=>[],Date,console,
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
  currentUser:loggedIn?{id:'owner'}:null,remotePlan:null,remoteShopping:null,checks:{},generatingPlan:false,authBusy:false,settingsDirty:false,draftGoal:null,undoShopping:null,
  db:{
   from:table=>({
    upsert:async row=>{writes.push({table,row:JSON.parse(JSON.stringify(row))});return{error:syncError?new Error('network'):null}},
    select(){return this},eq(){return this},gte(){return this},order(){return this},limit(){return this},maybeSingle:async()=>({data:table==='profiles'&&cloud?{settings:cloud,shopping_state:{}}:null}),
   }),
   functions:{invoke:async()=>{invocations.push(1);return{data:{plan:null},error:null}}},
  },
  toast:message=>messages.push(message),render(){},renderAccount(){},applyRoute(){},restoreRemotePlan:async()=>{},
 });
 const names=['goalName','trainingCount','calorieTarget','targetKcal','updateCalorieEstimate','renderSettings','readSettingsForm','markSettingsDirty','updateCalorieMode','settingsSignature','authOnline','todayDate'];
 // Exercise the actual sync helpers including their owner guards, not copied test implementations.
 const cloudSource=html.slice(html.indexOf('function ensureCloudOwner()'),html.indexOf('function renderLogin()'));
 const source=lines.filter(line=>line.startsWith('const defaultSettings=')||line.startsWith('let state=')||line.startsWith('let cloud')||names.some(name=>line.startsWith('function '+name+'('))||line.startsWith('async function generatePlan(')||line.startsWith('$("#settingsForm").addEventListener')).join('\n')+'\n'+cloudSource;
 vm.runInContext(source,context);vm.runInContext('renderSettings()',context);
 return{$,storage,messages,writes,invocations,context,run:code=>vm.runInContext(code,context),save:()=>$('#settingsForm').listeners.submit({preventDefault(){}})};
}
function backend(settings={}) {
 const requests=[],writes=[];
 const context=vm.createContext({URL,Request,Response,console,
  Deno:{env:{get:()=> 'test-value'},serve:handler=>{context.handler=handler}},
  createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:table=>({
   select:()=>({eq:()=>({single:async()=>({data:{settings:{goal:'keep',weight:70,protein:2,mealCount:1,shopDays:1,...settings}}})})}),
   insert:row=>{writes.push({table,row});return table==='meal_plans'?{select:()=>({single:async()=>({data:{...row,id:'plan-id'}})})}:Promise.resolve({error:null})},
  })}),
  fetch:async(_url,request)=>{requests.push(JSON.parse(request.body));return Response.json({status:'completed',output_text:JSON.stringify({days:[{date:new Date().toISOString().slice(0,10),meals:[{name:'Ryż',time:'12:00',kcal:700,protein_g:20,fat_g:10,carbs_g:100,ingredients:[{name:'Ryż biały',category:'Produkty suche',amount:100,unit:'g',biedronka:true}],preparation:'Ugotuj ryż.'}]}],promotions:[]})})},
 });
 vm.runInContext(edge+'\nglobalThis.api={trainingCount,targetKcal};',context);
 return{requests,writes,api:context.api,call:()=>context.handler(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer test'}}))};
}

test('K1: pole ma etykietę, zakres, połówki i dostępny opis',()=>{
 assert.match(html,/<label for="trainingsPerWeek">Średnia liczba treningów w tygodniu<\/label>/);
 assert.match(html,/id="trainingsPerWeek"[^>]*min="0"[^>]*max="14"[^>]*step="0.5"[^>]*required[^>]*aria-describedby="trainingHint"/);
 assert.match(html,/id="calorieEstimate" aria-live="polite"/);
});
test('K3: znane wyniki i monotoniczny wzrost kalorii, bez zmiany białka',()=>{
 const h=frontend({stored:{goal:'keep',weight:70,calories:'',protein:2}});
 for(const [count,target]of [[0,2170],[3,2245],[3.5,2258],[7,2345],[14,2520]]){
  assert.equal(h.run(`calorieTarget({...state,trainingsPerWeek:${count}})`),target);
  assert.equal(backend().api.targetKcal({goal:'keep',weight:70,trainingsPerWeek:count}),target);
 }
 assert.equal(h.run('state.protein'),2);
});
test('UI i Edge: identyczne wyniki dla wszystkich celów, wag, treningów i ręcznych kalorii',()=>{
 const h=frontend(),b=backend();
 for(const goal of ['cut','keep','gain'])for(const weight of [35,50,70,76,250])for(let count=0;count<=14;count+=0.5)for(const calories of ['',1800,'2400']){
  const settings={goal,weight,trainingsPerWeek:count,calories};
  h.context.settings=settings;
  assert.equal(h.run('calorieTarget(settings)'),b.api.targetKcal(settings));
 }
});
test('ręcznie wpisane kalorie mają pierwszeństwo przy dowolnej liczbie treningów',()=>{
 const h=frontend({stored:{calories:2300}});
 for(const count of [0,3.5,14])assert.equal(h.run(`calorieTarget({...state,trainingsPerWeek:${count}})`),2300);
});
test('starszy profil lokalny/chmurowy bez pola przyjmuje 0, zachowuje ustawienia',async()=>{
 const stored={goal:'gain',weight:80,calories:'',protein:2};
 const h=frontend({stored,loggedIn:true,cloud:stored});
 assert.equal(h.run('state.trainingsPerWeek'),0);assert.equal(h.run('targetKcal()'),2720);
 await h.run('restoreFromCloud()');assert.equal(h.run('state.trainingsPerWeek'),0);
 assert.equal(h.run('targetKcal()'),2720);assert.equal(backend().api.targetKcal(stored),2720);
});
test('nieprawidłowe liczby są odrzucane jednakowo po obu stronach',()=>{
 const h=frontend(),b=backend();
 for(const value of [-1,14.5,0.25,NaN,Infinity,'abc','',true,[],{}]){
  h.context.value=value;assert.throws(()=>h.run('trainingCount(value)'),/liczbę treningów/);
  assert.throws(()=>b.api.trainingCount(value),/liczbę treningów/);
 }
 for(const value of [undefined,null]){h.context.value=value;assert.equal(h.run('trainingCount(value)'),0);assert.equal(b.api.trainingCount(value),0)}
});
test('K2: zapis lokalny i odczyt po przeładowaniu zachowują średnią 3,5',async()=>{
 const h=frontend();h.$('#trainingsPerWeek').value='3.5';await h.save();
 const saved=JSON.parse(h.storage.get('forma-settings'));
 assert.equal(saved.trainingsPerWeek,3.5);
 const reloaded=frontend({stored:saved});assert.equal(reloaded.$('#trainingsPerWeek').value,3.5);
 assert.equal(reloaded.run('targetKcal()'),2223);
});
test('K2: zapis i ponowny odczyt z profiles.settings synchronizują treningi',async()=>{
 const h=frontend({loggedIn:true});h.$('#trainingsPerWeek').value='4';await h.save();
 assert.equal(h.writes[0].table,'profiles');assert.equal(h.writes[0].row.settings.trainingsPerWeek,4);
 assert.equal(h.$('#saveStatus').textContent,'Zapisano i zsynchronizowano.');
 const remote=frontend({loggedIn:true,cloud:h.writes[0].row.settings});await remote.run('restoreFromCloud()');
 assert.equal(remote.run('state.trainingsPerWeek'),4);assert.equal(remote.run('targetKcal()'),h.run('targetKcal()'));
});
test('podgląd reaguje na zmianę treningów przed zapisaniem, ręczny cel jest jawny',()=>{
 const h=frontend();h.$('#trainingsPerWeek').value='7';h.$('#settingsForm').listeners.input();
 assert.match(h.$('#calorieEstimate').textContent,/2.?318 kcal/);assert.equal(h.run('state.trainingsPerWeek'),0);
 h.$('#calorieMode').value='manual';h.$('#calories').value='2000';h.$('#settingsForm').listeners.input();assert.match(h.$('#calorieEstimate').textContent,/Ręczny cel.*2.?000 kcal/);
});
test('błędny formularz nie zmienia zapisanych danych',async()=>{
 const h=frontend({loggedIn:true});h.$('#trainingsPerWeek').value='-1';await h.save();
 assert.equal(h.writes.length,0);assert.equal(h.storage.has('forma-settings'),false);assert.match(h.$('#saveStatus').textContent,/liczbę treningów/);
});
test('nieudana synchronizacja nie udaje sukcesu i blokuje generator ze starymi ustawieniami',async()=>{
 const h=frontend({loggedIn:true,syncError:true});h.$('#trainingsPerWeek').value='5';await h.save();
 assert.equal(JSON.parse(h.storage.get('forma-settings')).trainingsPerWeek,5);
 assert.match(h.$('#saveStatus').textContent,/Synchronizacja nie powiodła/);
 await h.run('generatePlan()');assert.equal(h.invocations.length,0);assert.match(h.$('#generationStatus').textContent,/Nie zapisano aktualnych założeń/);
});
test('Edge: cel zależy od zapisanych treningów i trafia do AI oraz meal_plans',async()=>{
 for(const [trainingsPerWeek,calories,target]of [[0,'',2170],[7,'',2345],[3.5,'',2258],[7,2000,2000]]){
  const h=backend({trainingsPerWeek,calories}),result=await h.call();assert.equal(result.status,200);
  assert.match(h.requests[0].input,new RegExp(`około ${target} kcal`));
  assert.equal(h.writes.find(x=>x.table==='meal_plans').row.target_kcal,target);
 }
});
test('Edge: nieprawidłowe treningi zwracają 400 przed płatnym API i zapisem',async()=>{
 for(const trainingsPerWeek of [-1,15,'abc',0.25]){
  const h=backend({trainingsPerWeek}),result=await h.call();assert.equal(result.status,400);
  assert.match((await result.json()).error,/liczbę treningów/);assert.equal(h.requests.length,0);assert.equal(h.writes.length,0);
 }
});
