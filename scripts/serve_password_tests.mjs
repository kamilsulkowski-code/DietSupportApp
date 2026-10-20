import http from 'node:http';
import {readFileSync} from 'node:fs';

// Isolated QA: no Supabase, mail, or real credential changes. Only fictional sessions.
const port=Number(process.env.AUTH_TEST_PORT||4180),base='/DietSupportApp/';
const files=new Set(['index.html','pwa.js','pwa.css','manifest.webmanifest','sw.js','version.json','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']);
const source=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const mime={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',webmanifest:'application/manifest+json',json:'application/json',svg:'image/svg+xml',png:'image/png'};
const mock=`<script>
window.FORMA_SUPABASE={url:'https://isolated.invalid',anonKey:'fixture-only',passwordAuthEnabled:true};
const recoveryFixture=new URLSearchParams(location.search).get('scenario')==='recovery';
const fixtureUser={id:'isolated-owner',email:'fixture@example.invalid'};
window.supabase={createClient:()=>({auth:{
onAuthStateChange(fn){if(recoveryFixture)setTimeout(()=>fn('PASSWORD_RECOVERY',{user:fixtureUser}),0)},
getSession:async()=>({data:{session:recoveryFixture?{user:fixtureUser}:null}}),
getUser:async()=>({data:{user:fixtureUser}}),
signInWithPassword:async()=>({error:{code:'invalid_credentials'}}),
resetPasswordForEmail:async()=>({error:{status:429,code:'over_email_send_rate_limit'}}),
updateUser:async()=>({error:{code:'weak_password'}}),
signInWithOtp:async()=>({error:{status:429,code:'over_email_send_rate_limit'}}),
signOut:async()=>({error:null})},
from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({error:{message:'Isolated fixture'}})})
})};
</script>`;
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(req.method!=='GET'||!url.pathname.startsWith(base)){res.writeHead(404);res.end();return}
 const name=url.pathname===base?'index.html':url.pathname.slice(base.length);
 if(name==='supabase-config.js'){res.setHeader('content-type',mime.js);res.end('/* Isolated fixture is in HTML. */');return}
 if(!files.has(name)){res.writeHead(404);res.end();return}
 res.setHeader('cache-control','no-store');res.setHeader('content-type',mime[name.split('.').at(-1)]||'application/octet-stream');
 if(name==='index.html')res.end(source.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',mock).replace(/@import url\([^)]*\);/g,'').replace('<body>','<body><p style="padding:8px;background:#fff0b0;font:12px system-ui">TEST IZOLOWANY — fikcyjne konto; bez wysyłki e-mail, bazy i zmiany haseł.</p>'));
 else res.end(readFileSync(new URL('../dist/'+name,import.meta.url)));
}).listen(port,'127.0.0.1',()=>console.log(`Password QA: http://127.0.0.1:${port}${base}#settings; recovery fixture: ?scenario=recovery`));
