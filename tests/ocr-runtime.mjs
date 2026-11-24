// Exercise emitted JavaScript without tsx's extensionless-import resolution.
import assert from 'node:assert/strict';
import ts from 'typescript';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=await mkdtemp(join(root,'.ocr-runtime-'));
try {
 for(const file of ['api/ocr-scan.ts','server/ocrQuota.ts']) {
  await mkdir(join(directory,file.split('/')[0]),{recursive:true});
  const source=await readFile(join(root,file),'utf8');
  const emitted=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  await writeFile(join(directory,file.replace(/\.ts$/,'.js')),emitted);
 }
 const {default:handler,createOcrHandler}=await import(pathToFileURL(join(directory,'api/ocr-scan.js')).href);
 let status,payload;const headers={};
 const response={setHeader:(name,value)=>{headers[name]=value},status:code=>{status=code;return response},json:value=>{payload=value}};
 await handler({method:'GET',headers:{}},response);
 assert.equal(status,405);assert.equal(headers.Allow,'POST');assert.equal(payload.success,false);
 await handler({method:'POST',headers:{},body:{}},response);
 assert.equal(status,401);assert.equal(payload.error,'Sign in before scanning.');
 const originalFetch=globalThis.fetch;let attempts=0,claims=0;
 const scan=createOcrHandler({verify:async()=>({uid:'test',email_verified:true}),key:()=> 'test-key',consume:async()=>{claims++;return {allowed:true}}});
 const request={method:'POST',headers:{authorization:'Bearer test-token'},body:{image:'data:image/jpeg;base64,aGVsbG8='}};
 try {
  globalThis.fetch=async()=>{attempts++;return attempts<3?new Response(JSON.stringify({error:{code:503,message:'Overloaded',status:'UNAVAILABLE'}}),{status:503,headers:{'Content-Type':'application/json'}}):new Response(JSON.stringify({candidates:[{content:{parts:[{text:'[{"title":"Milk"}]'}],role:'model'}}]}),{status:200,headers:{'Content-Type':'application/json'}})};
  await scan(request,response);assert.equal(status,200);assert.equal(attempts,3);assert.equal(claims,1);assert.equal(payload.items[0].title,'Milk');
  attempts=0;globalThis.fetch=async()=>{attempts++;return new Response(JSON.stringify({error:{code:503,message:'Overloaded',status:'UNAVAILABLE'}}),{status:503,headers:{'Content-Type':'application/json'}})};
  await scan(request,response);assert.equal(status,502);assert.equal(attempts,3);assert.match(payload.error,/503/);
  for(const code of [403,429]) {
   attempts=0;globalThis.fetch=async()=>{attempts++;return new Response(JSON.stringify({error:{code,message:'Rejected'}}),{status:code,headers:{'Content-Type':'application/json'}})};
   await scan(request,response);assert.equal(status,502);assert.equal(attempts,1);
  }
 } finally {globalThis.fetch=originalFetch}
 console.log('PASS: Gemini SDK retries temporary failures, stops after three attempts, claims one allowance and does not retry key/quota errors');
 console.log('PASS: compiled OCR ESM function loads and handles requests without a TypeScript loader');
} finally {await rm(directory,{recursive:true,force:true})}
