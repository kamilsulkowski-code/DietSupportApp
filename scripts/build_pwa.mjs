import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
export const pwaFiles=['index.html','pwa.js','pwa.css','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
export function buildWorker(){
 const template=readFileSync(new URL('scripts/service-worker.template.js',root),'utf8');
 const hash=createHash('sha256').update(template);
 for(const path of pwaFiles)hash.update(path+'\0').update(readFileSync(new URL('dist/'+path,root)));
 return template.replace('__FORMA_PWA_BUILD__',hash.digest('hex').slice(0,20));
}
const expected=buildWorker(),target=new URL('dist/sw.js',root);
if(process.argv.includes('--check')){
 let actual='';try{actual=readFileSync(target,'utf8')}catch{}
 if(actual!==expected){console.error('PWA cache is stale. Run: node scripts/build_pwa.mjs');process.exitCode=1}
 else console.log('OK: PWA shell fingerprint is current.');
}else{writeFileSync(target,expected);console.log('Built dist/sw.js with a content-addressed cache.');}
