// Persistent, atomic limits using the caller's Firebase ID token. Firestore
// rules enforce monotonic counters; clients cannot reset or delete a counter.
export type QuotaResult={allowed:boolean;retryAfter?:number};
type Options={projectId:string;databaseId?:string;origin?:string;fetcher?:typeof fetch;now?:()=>number};
export const OCR_PER_MINUTE=5;
export const OCR_PER_DAY=50;
export function createOcrQuota({projectId,databaseId='(default)',origin='https://firestore.googleapis.com/v1',fetcher=fetch,now=Date.now}:Options){
 const root=`projects/${projectId}/databases/${databaseId}/documents`;
 return async(uid:string,token:string):Promise<QuotaResult>=>{
  for(let attempt=0;attempt<6;attempt++){
   const time=now();const windows=[{kind:'minute',ms:60000,limit:OCR_PER_MINUTE},{kind:'day',ms:86400000,limit:OCR_PER_DAY}];
   const records=await Promise.all(windows.map(async window=>{const index=Math.floor(time/window.ms);const name=`${root}/listitOcrUsage/${encodeURIComponent(uid)}/windows/${window.kind}_${index}`;const response=await fetcher(`${origin}/${name}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(6000)});if(response.status===404)return {...window,index,name,count:0,updateTime:undefined};if(!response.ok)throw Error('Scan allowance unavailable');const data=await response.json();const count=Number(data.fields?.count?.integerValue);if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid scan allowance');return {...window,index,name,count,updateTime:data.updateTime as string};}));
   const exhausted=records.filter(record=>record.count>=record.limit);if(exhausted.length)return {allowed:false,retryAfter:Math.max(...exhausted.map(record=>Math.max(1,Math.ceil(((record.index+1)*record.ms-time)/1000))))};
   const writes=records.map(record=>({update:{name:record.name,fields:{kind:{stringValue:record.kind},window:{integerValue:String(record.index)},count:{integerValue:String(record.count+1)}}},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}],currentDocument:record.updateTime?{updateTime:record.updateTime}:{exists:false}}));
   const response=await fetcher(`${origin}/${root}:commit`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({writes}),signal:AbortSignal.timeout(6000)});
   if(response.ok)return {allowed:true};
   if([409,412].includes(response.status))continue;
   const body=await response.json().catch(()=>({}));if(['ABORTED','ALREADY_EXISTS','FAILED_PRECONDITION'].includes(body.error?.status))continue;
   // Rules may reject a stale create/update before checking its precondition.
   // Re-read on contention (or a clock rollover); never skip the atomic claim.
   if(response.status===403)continue;
   throw Error('Scan allowance unavailable');
  }
  throw Error('Scan allowance busy');
 };
}
