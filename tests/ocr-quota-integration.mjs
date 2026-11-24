import assert from 'node:assert/strict';
import {createOcrQuota} from '../server/ocrQuota.ts';
const origin='http://127.0.0.1:8089/v1';const projectId='demo-listit';
const token=uid=>[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:uid,user_id:uid,iss:`https://securetoken.google.com/${projectId}`,aud:projectId,email:uid+'@example.com',email_verified:true,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,firebase:{sign_in_provider:'password'}})).toString('base64url'),''].join('.');
if(Date.now()%60000>55000)await new Promise(resolve=>setTimeout(resolve,60100-Date.now()%60000));
const limit=createOcrQuota({origin,projectId});
const results=await Promise.all(Array.from({length:9},()=>limit('concurrent',token('concurrent'))));assert.equal(results.filter(result=>result.allowed).length,5);assert.ok(results.filter(result=>!result.allowed).every(result=>result.retryAfter>0));
assert.equal((await limit('independent',token('independent'))).allowed,true);
// Exhaust the daily counter under disabled rules to avoid spending time or calls
// waiting through ten real minute windows. The rate check itself uses user rules.
const window=Math.floor(Date.now()/86400000);const name=`projects/${projectId}/databases/(default)/documents/listitOcrUsage/daily/windows/day_${window}`;
const seeded=await fetch(`${origin}/${name}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{kind:{stringValue:'day'},window:{integerValue:String(window)},count:{integerValue:'50'},updatedAt:{timestampValue:new Date().toISOString()}}})});assert.ok(seeded.ok,await seeded.text());
const daily=await limit('daily',token('daily'));assert.equal(daily.allowed,false);assert.ok(daily.retryAfter>0);
const minute=Math.floor(Date.now()/60000);const minuteName=`projects/${projectId}/databases/(default)/documents/listitOcrUsage/concurrent/windows/minute_${minute}`;
const reset=await fetch(`${origin}/${minuteName}?updateMask.fieldPaths=count`,{method:'PATCH',headers:{Authorization:`Bearer ${token('concurrent')}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{count:{integerValue:'1'}}})});assert.equal(reset.status,403);
assert.equal((await fetch(`${origin}/${minuteName}`,{method:'DELETE',headers:{Authorization:`Bearer ${token('concurrent')}`}})).status,403);
assert.equal((await fetch(`${origin}/${minuteName}`,{headers:{Authorization:`Bearer ${token('independent')}`}})).status,403);
let calls=0;const failing=createOcrQuota({projectId,fetcher:async()=>{calls++;throw Error('network')}});await assert.rejects(()=>failing('u','token'));assert.ok(calls>0);
console.log('PASS: real Firestore REST quota rules, concurrent requests, independent users, daily cap and fail-closed errors');
