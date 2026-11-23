import type {Item,List} from './model';
const key=(value:string)=>value.trim().normalize('NFKC').toLocaleLowerCase();
export function rememberStores(...groups:string[][]){const seen=new Map<string,string>();for(const group of groups)for(const value of group){const name=value.trim();if(name&&!seen.has(key(name)))seen.set(key(name),name)}return [...seen.values()].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base',numeric:true}))}
export function storesFromLists(lists:List[]){return lists.filter(list=>list.template==='Grocery').flatMap(list=>list.items.map(item=>item.fields.Store||''))}
export function sortByStore(items:Item[]){return [...items].sort((a,b)=>{const first=key(a.fields.Store||''),second=key(b.fields.Store||'');if(!first)return second?1:0;if(!second)return -1;return first.localeCompare(second,undefined,{sensitivity:'base',numeric:true})})}
