import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderLogin()'),html.indexOf('function goalName('));
const user={id:'existing-owner',email:'owner@example.invalid'};
const fixturePassword='fixture-only-password';
function harness({online=true,session=null,signIn,reset,update,getUser,sessionError=null,hash='',initialEvent=null}={}){
 const elements=new Map(),calls={signIn:[],reset:[],update:[],history:[],deferred:[],restores:0,toasts:[]};
 const $=key=>{if(!elements.has(key))elements.set(key,{value:'',hidden:false,focus(){},textContent:'',setAttribute(){},classList:{add(){},remove(){},toggle(){}}});return elements.get(key)};
 $('#loginEmail').value=user.email;$('#loginDialog').hidden=false;
 let listener;
 const auth={
  signInWithPassword:async args=>{calls.signIn.push(args);return signIn?signIn(args):{data:{session:{user}},error:null}},
  resetPasswordForEmail:async(...args)=>{calls.reset.push(args);return reset?reset(...args):{error:null}},
  updateUser:async args=>{calls.update.push(args);return update?update(args):{data:{user},error:null}},
  getUser:async()=>getUser?getUser():{data:{user},error:null},
  getSession:async()=>{if(initialEvent)listener(initialEvent,session);return{data:{session},error:sessionError}},
  onAuthStateChange:fn=>{listener=fn},
 };
 const location={origin:'https://example.invalid',pathname:'/DietSupportApp/',search:'',hash};
 const context=vm.createContext({$,Date,Map,URLSearchParams,location,navigator:{onLine:online},
  document:{activeElement:null},clearInterval(){},setInterval(){return 1},
  setTimeout:fn=>calls.deferred.push(fn),
  history:{replaceState:(_state,_title,url)=>{calls.history.push(url);location.hash=url.includes('#')?'#'+url.split('#')[1]:'';location.search=url.includes('?')?'?'+url.split('?')[1].split('#')[0]:''}},
  toast:message=>calls.toasts.push(message),db:{auth},ensureCloudOwner(){},renderSyncState(){},positionAccountControl(){},closeAccountMenu(){},
  defaultSettings:{},render(){},applyRoute(){},restoreFromCloud:async()=>{calls.restores++},
 });
 vm.runInContext('const passwordAuthEnabled=true,loginCodeEnabled=false,cloudEpoch=0;function cloudOwnerMatches(owner){return currentUser?.id===owner}let loginMethod="password",passwordRecovery=false,authCallbackPending=hasAuthCallback();const recoveryCallbackExpected=new URLSearchParams(location.hash.slice(1)).get("type")==="recovery";let authBusy=false,generatingPlan=false,lastLoginFocus=null,loginStep="email",loginPendingEmail="",loginCooldownTimer=null,currentUser=null,remotePlan=null,remoteShopping=null,undoShopping=null,checks={};const loginResendAfter=new Map();\n'+source,context);
 return{$,calls,auth,context,location,run:code=>vm.runInContext(code,context),event:(event,session)=>listener(event,session)};
}

test('AUTH1: tryb hasła ma właściwe pola i nie wymaga kodu',()=>{
 const h=harness();h.run('renderLogin()');assert.equal(h.$('#loginTitle').textContent,'Zaloguj się hasłem');
 assert.equal(h.$('#loginPasswordField').hidden,false);assert.equal(h.$('#loginPassword').autocomplete,'current-password');
 assert.equal(h.$('#loginPassword').required,true);assert.equal(h.$('#loginCode').disabled,true);assert.equal(h.$('#loginPasswordConfirm').disabled,true);
});
test('AUTH1: logowanie normalizuje email, nie zmienia hasła i ustanawia sesję w tej samej aplikacji',async()=>{
 const h=harness();h.context.fixture=fixturePassword;h.$('#loginPassword').value=fixturePassword;
 assert.equal(await h.run('signInWithPassword(" OWNER@example.invalid ",fixture)'),true);
 assert.deepEqual(h.calls.signIn.map(x=>[x.email,x.password]),[[user.email,fixturePassword]]);
 assert.equal(h.calls.reset.length,0);assert.equal(h.calls.update.length,0);assert.equal(h.run('currentUser.id'),user.id);
 assert.equal(h.$('#loginDialog').hidden,true);assert.equal(h.$('#loginPassword').value,'');assert.equal(h.run('authBusy'),false);
});
test('AUTH1: równoczesne kliknięcia wykonują tylko jedno logowanie',async()=>{
 const h=harness();h.context.fixture=fixturePassword;await Promise.all([h.run('signInWithPassword("owner@example.invalid",fixture)'),h.run('signInWithPassword("owner@example.invalid",fixture)')]);assert.equal(h.calls.signIn.length,1);
});
test('AUTH1: błędne dane, błąd sieci i brak sesji nie dają sukcesu ani nie przechowują hasła w polu',async()=>{
 for(const signIn of [()=>({error:{code:'invalid_credentials'}}),()=>{throw Error('network')},()=>({data:{session:null}})]){
  const h=harness({signIn});h.context.fixture=fixturePassword;h.$('#loginPassword').value=fixturePassword;
  assert.equal(await h.run('signInWithPassword("owner@example.invalid",fixture)'),false);
  assert.equal(h.run('currentUser'),null);assert.equal(h.run('authBusy'),false);assert.equal(h.$('#loginPassword').value,'');assert.equal(h.calls.toasts.length,0);assert.equal(h.$('#loginDialog').hidden,false);
 }
});
test('AUTH1: offline logowanie, reset i zmiana hasła nie wywołują Supabase',async()=>{
 const h=harness({online:false});h.context.fixture=fixturePassword;h.run('currentUser={id:"existing-owner"}');
 await h.run('signInWithPassword("owner@example.invalid",fixture)');await h.run('requestPasswordReset("owner@example.invalid")');await h.run('saveAccountPassword(fixture,fixture)');
 assert.equal(h.calls.signIn.length+h.calls.reset.length+h.calls.update.length,0);assert.match(h.$('#loginMessage').textContent,/internetu/);
});
test('AUTH2: reset używa tego samego adresu aplikacji bez tworzenia nowego konta',async()=>{
 const h=harness();h.run('chooseLoginMethod("password-reset")');assert.equal(h.$('#loginPassword').disabled,true);
 await h.run('requestPasswordReset(" OWNER@example.invalid ")');
 assert.equal(h.calls.reset[0][0],user.email);assert.equal(h.calls.reset[0][1].redirectTo,'https://example.invalid/DietSupportApp/');
 assert.match(h.$('#loginMessage').textContent,/Jeśli konto istnieje/);assert.match(h.$('#loginMessage').textContent,/PWA/);
 assert.equal(h.calls.signIn.length+h.calls.update.length,0);await h.run('requestPasswordReset("owner@example.invalid")');assert.equal(h.calls.reset.length,1);
});
test('AUTH2: limit poczty jest widoczny i nie powoduje automatycznego ponawiania',async()=>{
 const h=harness({reset:()=>({error:{status:429,code:'over_email_send_rate_limit'}})});h.run('chooseLoginMethod("password-reset")');
 await h.run('requestPasswordReset("owner@example.invalid")');assert.match(h.$('#loginMessage').textContent,/limit Supabase/);
 await h.run('requestPasswordReset("owner@example.invalid")');assert.equal(h.calls.reset.length,1);assert.equal(h.run('authBusy'),false);
});
test('AUTH2: brak sieci/resetu po stronie dostawcy nie ujawnia istnienia konta',async()=>{
 const h=harness({reset:()=>{throw Error('private server detail')}});await h.run('requestPasswordReset("owner@example.invalid")');
 assert.match(h.$('#loginMessage').textContent,/Nie udało się wysłać/);assert.doesNotMatch(h.$('#loginMessage').textContent,/private server detail/);assert.equal(h.run('authBusy'),false);
});
test('AUTH3: nowego hasła nie da się zapisać bez sesji, przy niezgodności lub poza zakresem długości',async()=>{
 const h=harness();h.context.fixture=fixturePassword;await h.run('saveAccountPassword(fixture,fixture)');assert.equal(h.calls.update.length,0);
 h.run('currentUser={id:"existing-owner"}');
 for(const expression of ['saveAccountPassword("short","short")','saveAccountPassword("x".repeat(129),"x".repeat(129))','saveAccountPassword(fixture,"different-password")'])await h.run(expression);
 assert.equal(h.calls.update.length,0);
});
test('AUTH3: zmiana hasła sprawdza bieżącego użytkownika i zachowuje jego identyfikator',async()=>{
 const h=harness();h.context.fixture=fixturePassword;h.run('currentUser={id:"existing-owner",email:"owner@example.invalid"};openPasswordEditor()');
 assert.equal(h.run('loginMethod'),'password-update');assert.equal(h.$('#loginPassword').autocomplete,'new-password');assert.equal(h.$('#loginPasswordConfirm').required,true);
 assert.equal(await h.run('saveAccountPassword(fixture,fixture)'),true);assert.equal(h.calls.update.length,1);assert.equal(h.run('currentUser.id'),user.id);
 assert.equal(h.$('#loginDialog').hidden,true);assert.equal(h.$('#loginPasswordConfirm').value,'');assert.match(h.calls.toasts[0],/Hasło zapisane/);
});
test('AUTH3: inny lub wygasły użytkownik blokuje aktualizację',async()=>{
 for(const getUser of [()=>({data:{user:{id:'another-owner'}}}),()=>({error:{status:401}})]){
  const h=harness({getUser});h.context.fixture=fixturePassword;h.run('currentUser={id:"existing-owner"}');
  assert.equal(await h.run('saveAccountPassword(fixture,fixture)'),false);assert.equal(h.calls.update.length,0);assert.match(h.$('#loginMessage').textContent,/Sesja wygasła/);
 }
});
test('AUTH3: słabe hasło i błąd zapisu pozostawiają formularz bez fałszywego sukcesu',async()=>{
 for(const update of [()=>({error:{code:'weak_password'}}),()=>{throw Error('network')},()=>({data:{user:{id:'another-owner'}}})]){
  const h=harness({update});h.context.fixture=fixturePassword;h.run('currentUser={id:"existing-owner"};loginMethod="password-update"');
  assert.equal(await h.run('saveAccountPassword(fixture,fixture)'),false);assert.equal(h.calls.toasts.length,0);assert.equal(h.run('authBusy'),false);assert.equal(h.$('#loginPassword').value,'');
 }
});
test('AUTH4: recovery listener jest podpięty przed odczytem sesji i otwiera ustawienie hasła',async()=>{
 const h=harness({hash:'#access_token=fixture-token&type=recovery',session:{user},initialEvent:'PASSWORD_RECOVERY'});await h.run('initAuth()');
 assert.equal(h.run('passwordRecovery'),true);assert.equal(h.run('loginMethod'),'password-update');assert.equal(h.$('#loginDialog').hidden,false);
 assert.equal(h.run('authCallbackPending'),false);assert.equal(h.location.hash,'#dashboard');assert.ok(h.calls.history.every(url=>!url.includes('fixture-token')));
 assert.equal(h.calls.deferred.length,0);assert.equal(h.calls.restores,1); // Recovery is restored by getSession, outside the auth callback lock.
});
test('AUTH4: sam parametr type=recovery nie autoryzuje zmiany hasła',async()=>{
 const h=harness({hash:'#type=recovery',session:null});await h.run('initAuth()');
 assert.equal(h.run('passwordRecovery'),false);assert.equal(h.run('loginMethod'),'password');assert.equal(h.calls.update.length,0);
});
test('AUTH4: wygasły link pokazuje bezpieczny komunikat i usuwa parametry błędu z URL',async()=>{
 const h=harness({hash:'#error=access_denied&error_code=otp_expired'});await h.run('initAuth()');
 assert.match(h.$('#loginMessage').textContent,/wygasł/);assert.equal(h.location.hash,'#dashboard');assert.equal(h.calls.update.length,0);
});
test('AUTH4: wylogowanie usuwa prywatny stan i wpisane hasła',async()=>{
 const h=harness();await h.run('initAuth()');h.$('#loginPassword').value=fixturePassword;h.run('remotePlan={id:"private"};currentUser={id:"existing-owner"}');h.event('SIGNED_OUT',null);
 assert.equal(h.run('currentUser'),null);assert.equal(h.run('remotePlan'),null);assert.equal(h.$('#loginPassword').value,'');
});
test('AUTH5: przełączenie metody/anulowanie czyści oba hasła, a szkic blokuje przeładowanie',()=>{
 const h=harness();h.$('#loginPassword').value=fixturePassword;assert.equal(h.run('passwordFormDirty()'),true);
 h.run('chooseLoginMethod("email")');assert.equal(h.$('#loginPassword').value,'');assert.equal(h.$('#loginPassword').required,false);
 h.$('#loginPasswordConfirm').value=fixturePassword;h.run('closeLogin()');assert.equal(h.$('#loginPasswordConfirm').value,'');assert.equal(h.run('passwordFormDirty()'),false);
});
test('AUTH5: produkcja włącza hasło, nie zapisuje go w storage i nie tworzy kont w nowym flow',()=>{
 const config=readFileSync(new URL('../dist/supabase-config.js',import.meta.url),'utf8');assert.match(config,/passwordAuthEnabled:\s*true/);
 const passwordSource=source.slice(source.indexOf('function clearPasswordFields()'));
 assert.doesNotMatch(passwordSource,/localStorage|sessionStorage|console\.|signUp\(|createUser\(/);
 assert.match(html,/if\(authCallbackPending\)return/);assert.match(html,/settingsDirty\|\|passwordFormDirty\(\)/);
 assert.match(html,/id="loginPassword" type="password" autocomplete="current-password"/);
});
