import assert from 'node:assert/strict';
import {createOcrHandler} from '../api/ocr-scan.ts';
async function run(request,overrides={}){let code=200,value;const headers={};let calls=0;const deps={verify:async()=>({uid:'test',email_verified:true}),key:()=> 'test-key',consume:async()=>({allowed:true}),generate:async()=>{calls++;return JSON.stringify([{title:'Milk'},{title:'Bread'}])},...overrides};const handler=createOcrHandler(deps);const response={status(n){code=n;return this},json(v){value=v;return this},setHeader(name,value){headers[name]=value}};await handler(request,response);return {code,value,calls,headers}}
const valid={method:'POST',headers:{authorization:'Bearer test-token'},body:{image:'data:image/jpeg;base64,aGVsbG8='}};
assert.equal((await run({...valid,method:'GET'})).code,405);
assert.equal((await run({...valid,headers:{}})).code,401);
assert.equal((await run(valid,{verify:async()=>{throw Error('bad token')}})).code,401);
assert.equal((await run(valid,{verify:async()=>({uid:'test',email_verified:false})})).code,403);
assert.equal((await run(valid,{key:()=>undefined})).code,503);
assert.equal((await run({...valid,body:{image:'!invalid!'}})).code,400);
assert.equal((await run({...valid,body:{image:'A'.repeat(3500001)}})).code,413);
const success=await run(valid);assert.equal(success.code,200);assert.deepEqual(success.value.items,[{title:'Milk'},{title:'Bread'}]);assert.equal(success.calls,1);
assert.equal((await run(valid,{generate:async()=>'{invalid'})).code,502);
console.log('PASS: OCR method, authentication, verification, missing key, payload validation/limits, line output and upstream errors');

const limited=await run(valid,{consume:async()=>({allowed:false,retryAfter:42})});assert.equal(limited.code,429);assert.equal(limited.calls,0);assert.equal(limited.headers['Retry-After'],'42');
const quotaFailure=await run(valid,{consume:async()=>{throw Error('offline')}});assert.equal(quotaFailure.code,503);assert.equal(quotaFailure.calls,0);
assert.equal((await run(valid,{verify:async()=>({uid:'test',email_verified:true,firebase:{sign_in_provider:'anonymous'}})})).code,403);
console.log('PASS: OCR quota exhaustion, fail-closed allowance errors and anonymous-user denial');
