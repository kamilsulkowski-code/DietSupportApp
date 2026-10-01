import http from 'node:http';
import { readFileSync } from 'node:fs';
import { task3Fixture } from './fixtures/task3.mjs';

// Isolated copy of the real UI. No database access, OTP or paid API calls.
const source = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1:4174');
  const scenario = url.searchParams.get('scenario') ?? 'normal';
  if (!['normal','short','negative'].includes(scenario)) {res.writeHead(404);res.end();return;}
  if (url.pathname === '/device') {
    const width = Number(url.searchParams.get('width'));
    if (![320,390,1440].includes(width)) {res.writeHead(400);res.end();return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="pl"><meta charset="utf-8"><title>Test interfejsu ${width}px</title><body style="margin:0;font:14px system-ui"><p>Izolowany test interfejsu: ${width}px. Dane kontrolne.</p><iframe title="Plan dnia ${width}px" src="/?scenario=${scenario}" style="display:block;width:${width}px;height:900px;border:0"></iframe></body></html>`);
    return;
  }
  const fixture = task3Fixture(scenario);
  const page = source.replace(/<script src=[^>]+><\/script>/g,'')
    .replace('render();\ninitAuth();',`state={...defaultSettings,calories:2200,selectedPlanDay:${fixture.selectedIndex}};remotePlan=${JSON.stringify(fixture.plan)};remoteShopping=null;render();`)
    .replace('<body>','<body><div style="padding:8px;background:#fff0b0;text-align:center;font:14px system-ui">TEST IZOLOWANY: dane kontrolne, bez połączenia z bazą i API</div>');
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(page);
});
server.listen(4174,'127.0.0.1',()=>console.log('Test UI: http://127.0.0.1:4174/?scenario=normal (normal / short / negative)'));
