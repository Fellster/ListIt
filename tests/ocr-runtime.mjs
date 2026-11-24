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
 const {default:handler}=await import(pathToFileURL(join(directory,'api/ocr-scan.js')).href);
 let status,payload;const headers={};
 const response={setHeader:(name,value)=>{headers[name]=value},status:code=>{status=code;return response},json:value=>{payload=value}};
 await handler({method:'GET',headers:{}},response);
 assert.equal(status,405);assert.equal(headers.Allow,'POST');assert.equal(payload.success,false);
 await handler({method:'POST',headers:{},body:{}},response);
 assert.equal(status,401);assert.equal(payload.error,'Sign in before scanning.');
 console.log('PASS: compiled OCR ESM function loads and handles requests without a TypeScript loader');
} finally {await rm(directory,{recursive:true,force:true})}
