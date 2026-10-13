import {GoogleGenAI,Type} from '@google/genai';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const projectId='gen-lang-client-0532438240';
const signingKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

type Request={method?:string;headers:Record<string,string|string[]|undefined>;body?:any};
type Response={status:(n:number)=>Response;json:(value:unknown)=>unknown;setHeader:(name:string,value:string)=>unknown};
type Dependencies={verify:(token:string)=>Promise<{uid:string;email_verified?:boolean;firebase?:{sign_in_provider?:string}}>;key:()=>string|undefined;generate:(key:string,image:string,mimeType:string)=>Promise<string>};
const defaults:Dependencies={
 verify:async token=>{const {payload}=await jwtVerify(token,signingKeys,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${projectId}`,audience:projectId,requiredClaims:['exp','iat','auth_time','sub']});const now=Math.floor(Date.now()/1000);if(!payload.sub||payload.sub.length>128||typeof payload.iat!=='number'||payload.iat>now||typeof payload.auth_time!=='number'||payload.auth_time>now)throw Error('Invalid identity claims');return {uid:payload.sub,email_verified:payload.email_verified===true,firebase:payload.firebase as {sign_in_provider?:string}|undefined}},
 key:()=>process.env.GEMINI_API_KEY?.trim(),
 generate:async(key,image,mimeType)=>{const ai=new GoogleGenAI({apiKey:key});const result=await ai.models.generateContent({model:process.env.GEMINI_OCR_MODEL||'gemini-2.5-flash',contents:{parts:[{inlineData:{mimeType,data:image}},{text:'Transcribe the handwritten or printed list in this image. Return one item for each written line or bullet. Keep the written wording. Do not infer missing words, stores, dates, or quantities. Ignore decorative stationery headings. Return an empty array if no list text can be read.'}]},config:{responseMimeType:'application/json',responseSchema:{type:Type.ARRAY,items:{type:Type.OBJECT,properties:{title:{type:Type.STRING}},required:['title']}}}});return result.text||'[]'}
};
export function createOcrHandler(deps:Dependencies=defaults){return async(req:Request,res:Response)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({success:false,error:'Use POST to scan a photo.'})}
 const header=req.headers.authorization;const token=typeof header==='string'&&header.startsWith('Bearer ')?header.slice(7):'';
 if(!token)return res.status(401).json({success:false,error:'Sign in before scanning.'});
 try{const user=await deps.verify(token);if(!user.email_verified||user.firebase?.sign_in_provider==='anonymous')return res.status(403).json({success:false,error:'Verify your email before scanning.'})}catch{return res.status(401).json({success:false,error:'Your sign-in expired. Sign in again before scanning.'})}
 let body=req.body;try{if(typeof body==='string')body=JSON.parse(body)}catch{return res.status(400).json({success:false,error:'Invalid scan request.'})}
 const raw=body?.image;if(typeof raw!=='string'||!raw)return res.status(400).json({success:false,error:'Choose a photo to scan.'});
 const mimeType=raw.startsWith('data:')?raw.slice(5,raw.indexOf(';')):body?.mimeType||'image/jpeg';
 if(!['image/jpeg','image/png','image/webp'].includes(mimeType))return res.status(400).json({success:false,error:'Use a JPG, PNG, or WebP image.'});
 const image=raw.includes('base64,')?raw.split('base64,')[1]:raw;
 if(image.length>3500000)return res.status(413).json({success:false,error:'Photo is too large. Try a smaller photo.'});
 if(!/^[A-Za-z0-9+/]+={0,2}$/.test(image))return res.status(400).json({success:false,error:'Invalid photo data.'});
 const key=deps.key();if(!key)return res.status(503).json({success:false,error:'Scanning needs GEMINI_API_KEY configured in Vercel for this preview.'});
 try{const parsed=JSON.parse(await deps.generate(key,image,mimeType));if(!Array.isArray(parsed))throw Error('Invalid OCR result');const items=parsed.filter(item=>typeof item?.title==='string'&&item.title.trim()).slice(0,200).map(item=>({title:item.title.trim().slice(0,2000)}));return res.status(200).json({success:true,count:items.length,items})}catch(e){console.error('OCR failed:',(e as {status?:number}).status||'generation');return res.status(502).json({success:false,error:'Scanning could not complete. Check the Gemini API key, model availability, and quota, then try again.'})}
}}
export default createOcrHandler();
