import {fields,templates,type Item,type List} from '../redesign/model';
export const MAX_SHARED_ITEMS=300;
export const MAX_SHARED_BYTES=900000;
export const FIELD_LIMITS:Record<string,number>=Object.fromEntries([...new Set([...Object.values(fields).flat(),'Prep time','Cook time','Servings','Source link','Exercise'])].map(key=>[key,['Ingredients','Instructions'].includes(key)?30000:key==='Notes'?20000:key==='Source link'?2048:256]));
const listKeys=['id','name','template','group','theme','font','sharedId'];
export const validId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
const map=(value:unknown):value is Record<string,any>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
function text(value:unknown,max:number,required=false){return typeof value==='string'&&value.length<=max&&(!required||value.trim().length>0)}
export function validateItem(value:unknown):asserts value is Item{
 if(!map(value)||Object.keys(value).some(key=>!['id','title','done','fields'].includes(key))||!validId(value.id)||!text(value.title,2000,true)||typeof value.done!=='boolean'||!map(value.fields))throw Error('This shared item has invalid data.');
 for(const [key,entry] of Object.entries(value.fields)){if(!Object.hasOwn(FIELD_LIMITS,key)||!text(entry,FIELD_LIMITS[key]))throw Error('A shared item detail is invalid or too long.');}
 if(new TextEncoder().encode(JSON.stringify(value)).length>80000)throw Error('This shared item is too large. Shorten its text.');
}
export function validateMetadata(value:unknown,id:string):asserts value is Omit<List,'items'>{
 if(!map(value)||Object.keys(value).some(key=>!listKeys.includes(key))||value.id!==id||!validId(id)||!text(value.name,120,true)||![...templates.Personal,...templates.Work].includes(value.template)||!['Personal','Work'].includes(value.group)||('font'in value&&!text(value.font,80))||('theme'in value&&!text(value.theme,64))||('sharedId'in value&&value.sharedId!==id))throw Error('This shared list has invalid details.');
}
export function validateSharedList(value:unknown):asserts value is List{
 if(!map(value))throw Error('Invalid shared list.');const {items,...metadata}=value;validateMetadata(metadata,value.id);
 if(!Array.isArray(items)||items.length>MAX_SHARED_ITEMS)throw Error('A shared list can contain up to 300 items.');
 const ids=new Set<string>();for(const item of items){validateItem(item);if(ids.has(item.id))throw Error('This list contains duplicate item IDs.');ids.add(item.id)}
 if(new TextEncoder().encode(JSON.stringify(value)).length>MAX_SHARED_BYTES)throw Error('This shared list is too large. Shorten its text or split it into smaller lists.');
}
export function sharedMetadata(list:List){const copy=JSON.parse(JSON.stringify(list));validateSharedList(copy);const {items,...metadata}=copy;return JSON.parse(JSON.stringify(metadata)) as Omit<List,'items'>}
