import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('function renderLogin()'),html.indexOf('async function initAuth()'));
function harness({send,verify}={}){
 const elements=new Map(),calls=[],messages=[];
 const $=selector=>{if(!elements.has(selector))elements.set(selector,{value:'',hidden:false,focus(){},textContent:''});return elements.get(selector)};
 $('#loginEmail').value='USER@example.com';$('#loginDialog').hidden=false;
 const context=vm.createContext({$,Date,Map,clearInterval(){},setInterval(){return 1},toast:message=>messages.push(message),db:{auth:{
  signInWithOtp:async args=>{calls.push(['send',args]);return send?send(args):{error:null}},
  verifyOtp:async args=>{calls.push(['verify',args]);return verify?verify(args):{data:{session:{user:{email:args.email}}},error:null}}
 }}});
 vm.runInContext('const loginCodeEnabled=true;let authBusy=false,loginStep="email",loginPendingEmail="",loginCooldownTimer=null,currentUser=null;const loginResendAfter=new Map();\n'+source,context);
 return {$,calls,messages,run:code=>vm.runInContext(code,context)};
}

test('wysłanie kodu normalizuje e-mail i pozostawia otwarty formularz',async()=>{
 const h=harness();await h.run('sendLoginCode(" USER@example.com ")');
 assert.equal(h.calls[0][1].email,'user@example.com');assert.equal(h.calls[0][1].options.shouldCreateUser,true);
 assert.equal('emailRedirectTo' in h.calls[0][1].options,false);
 assert.equal(h.$('#loginDialog').hidden,false);assert.equal(h.$('#loginCodeField').hidden,false);
 assert.equal(h.$('#loginEmail').readOnly,true);assert.equal(h.$('#loginCode').required,true);
 assert.equal(h.$('#loginSubmit').textContent,'Zaloguj się');
});
test('ponowne wysłanie i podwójne kliknięcie nie omijają blokady',async()=>{
 const h=harness();await Promise.all([h.run('sendLoginCode("user@example.com")'),h.run('sendLoginCode("user@example.com")')]);
 await h.run('sendLoginCode("user@example.com")');assert.equal(h.calls.length,1);assert.equal(h.$('#resendLoginCode').disabled,true);
 h.run('loginResendAfter.set("user@example.com",Date.now()-1)');await h.run('sendLoginCode("user@example.com")');assert.equal(h.calls.length,2);
});
test('poprawny kod ustanawia sesję w tej samej karcie i jest usuwany z formularza',async()=>{
 const h=harness();await h.run('sendLoginCode("user@example.com")');h.$('#loginCode').value='123456';await h.run('verifyLoginCode("123456")');
 assert.equal(h.calls[1][1].type,'email');assert.equal(h.calls[1][1].token,'123456');
 assert.equal(h.run('currentUser.email'),'user@example.com');assert.equal(h.$('#loginDialog').hidden,true);assert.equal(h.$('#loginCode').value,'');
 assert.equal(h.run('authBusy'),false);assert.equal(h.run('loginPendingEmail'),'');
});
test('niepełny kod nie jest wysyłany do Supabase',async()=>{
 const h=harness();await h.run('sendLoginCode("user@example.com")');await h.run('verifyLoginCode("12ab")');assert.equal(h.calls.length,1);
 assert.match(h.$('#loginMessage').textContent,/cały kod/);
});
test('błędny lub wygasły kod nie loguje i pozwala wpisać nowy',async()=>{
 const h=harness({verify:()=>({error:{code:'otp_expired'},data:null})});await h.run('sendLoginCode("user@example.com")');h.$('#loginCode').value='123456';await h.run('verifyLoginCode("123456")');
 assert.equal(h.run('currentUser'),null);assert.equal(h.$('#loginDialog').hidden,false);assert.equal(h.$('#loginCode').value,'');
 assert.match(h.$('#loginMessage').textContent,/wygasł/);assert.equal(h.$('#loginSubmit').disabled,false);
});
test('limit wysyłki pokazuje komunikat bez przejścia do kodu',async()=>{
 const h=harness({send:()=>({error:{code:'over_email_send_rate_limit',status:429}})});await h.run('sendLoginCode("user@example.com")');
 assert.equal(h.run('loginStep'),'email');assert.equal(h.run('authBusy'),false);assert.match(h.$('#loginMessage').textContent,/limit Supabase/);
 await h.run('sendLoginCode("user@example.com")');assert.equal(h.calls.length,1);
});
test('błąd sieci przy wysyłce nie blokuje formularza',async()=>{
 const h=harness({send:()=>{throw Error('network')}});await h.run('sendLoginCode("user@example.com")');
 assert.equal(h.run('authBusy'),false);assert.equal(h.$('#loginSubmit').disabled,false);assert.match(h.$('#loginMessage').textContent,/połączenie/);
});
test('brak sesji lub błąd sieci przy weryfikacji nie daje fałszywego sukcesu',async()=>{
 for(const verify of [()=>({data:{session:null}}),()=>{throw Error('network')}]){
  const h=harness({verify});await h.run('sendLoginCode("user@example.com")');await h.run('verifyLoginCode("123456")');
  assert.equal(h.run('currentUser'),null);assert.equal(h.run('authBusy'),false);assert.equal(h.$('#loginDialog').hidden,false);assert.equal(h.messages.length,0);
 }
});
test('reset usuwa kod i adres oczekujący, ale nie omija limitu ponownej wysyłki',async()=>{
 const h=harness();await h.run('sendLoginCode("user@example.com")');h.$('#loginCode').value='123456';h.run('resetLogin()');
 assert.equal(h.$('#loginCode').value,'');assert.equal(h.run('loginPendingEmail'),'');assert.equal(h.$('#loginCode').disabled,true);
 assert.equal(h.$('#loginSubmit').disabled,true);
});
test('pole kodu obsługuje klawiaturę numeryczną i automatyczne uzupełnianie',()=>{
 assert.match(html,/id="loginCode"[^>]*inputmode="numeric"[^>]*autocomplete="one-time-code"/);
 assert.ok(!html.includes('sendLoginLink('));
});
