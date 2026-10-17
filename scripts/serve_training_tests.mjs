import http from 'node:http';
import {readFileSync} from 'node:fs';

// Isolated actual UI, no Supabase configuration, emails or paid AI requests.
const source=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:4175');
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.setHeader('Cache-Control','no-store');
 if(url.pathname==='/device'){
  const width=Number(url.searchParams.get('width'));
  if(![320,390,1440].includes(width)){res.writeHead(400);res.end();return}
  res.end(`<!doctype html><html lang="pl"><meta charset="utf-8"><title>Test treningów ${width}px</title><body style="margin:0"><iframe title="Ustawienia treningów ${width}px" src="/" style="display:block;width:${width}px;height:1000px;border:0"></iframe></body></html>`);return;
 }
 if(url.pathname!=='/'){res.writeHead(404);res.end();return}
 res.end(source.replace(/<script src=[^>]+><\/script>/g,'')
  .replace('render();\ninitAuth();','currentUser=null;remotePlan=null;render();navigate("settings");')
  .replace('<body>','<body><div style="background:#fff0b0;text-align:center">TEST IZOLOWANY — bez bazy i API</div>'));
}).listen(4175,'127.0.0.1',()=>console.log('Test treningów: http://127.0.0.1:4175/'));
