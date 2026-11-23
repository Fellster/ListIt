import {collection,doc,getDoc,onSnapshot,runTransaction,setDoc,writeBatch,type Firestore,type Unsubscribe} from 'firebase/firestore';
import {auth,db} from '../firebase';
import {sharedMetadata,validateMetadata,validateSharedList,validateItem,validId} from '../security/sharedValidation';
import type {Item,List} from './model';
export type Role='viewer'|'commenter'|'editor';
export type Shared={id:string;ownerId:string;ownerEmail:string;list:List;revision:number;schemaVersion?:number};
export type Invitation={id:string;listId:string;listName:string;ownerId:string;ownerEmail:string;email:string;role:Role;expiresAt:number;status:'pending'|'accepted'|'declined'|'revoked'};
export const sharedRef=(id:string,database:Firestore=db)=>doc(database,'listitSharedLists',id);
export const inviteRef=(id:string,email:string)=>doc(db,'listitInvitations',id+'_'+email.toLowerCase());
const clean=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export async function publishShared(database:Firestore,user:{uid:string;email:string},list:List){
 const metadata=sharedMetadata(list);const ref=sharedRef(list.id,database);let previous:any;
 try{const snap=await getDoc(ref);if(snap.exists())previous=snap.data()}catch(error){if((error as {code?:string}).code!=='permission-denied')throw error}
 if(previous){if(previous.ownerId!==user.uid)throw Error('Only the owner can share this list.');if(previous.schemaVersion!==2)await saveShared({id:list.id,...previous},list,database);return list.id}
 const batch=writeBatch(database);batch.set(ref,{ownerId:user.uid,ownerEmail:user.email.toLowerCase(),list:metadata,revision:0,schemaVersion:2,itemIds:list.items.map(item=>item.id)});
 for(const item of list.items)batch.set(doc(ref,'items',item.id),clean(item));await batch.commit();return list.id;
}
export async function publishList(list:List){const user=auth.currentUser;if(!user?.email)throw Error('Sign in first.');return publishShared(db,{uid:user.uid,email:user.email},list)}
export async function invite(list:List,email:string,role:Role){email=email.trim().toLowerCase();if(!/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email))throw Error('Enter a valid email address.');const user=auth.currentUser;if(!user?.email)throw Error('Sign in first.');if(email===user.email.toLowerCase())throw Error('You already own this list.');await publishList(list);const ref=inviteRef(list.id,email);let accepted=false;try{accepted=(await getDoc(ref)).data()?.status==='accepted'}catch(error){if((error as {code?:string}).code!=='permission-denied')throw error}await setDoc(ref,{listId:list.id,listName:list.name,ownerId:user.uid,ownerEmail:user.email.toLowerCase(),email,role,expiresAt:Date.now()+7*86400000-60000,status:accepted?'accepted':'pending'},{merge:true});return ref.id}
export async function saveShared(record:Shared,list:List,database:Firestore=db){
 const metadata=sharedMetadata(list);if(list.id!==record.id)throw Error('The shared list ID cannot change.');
 await runTransaction(database,async tx=>{const ref=sharedRef(record.id,database);const snap=await tx.get(ref);if(!snap.exists()||snap.data().revision!==record.revision)throw Error('Shared list changed on another device. Wait for the latest update and try again.');const stored=snap.data();const migrating=stored.schemaVersion!==2;const before=new Map(record.list.items.map(item=>[item.id,item]));
 tx.update(ref,{list:metadata,itemIds:list.items.map(item=>item.id),schemaVersion:2,revision:record.revision+1});
 for(const item of list.items)if(migrating||JSON.stringify(before.get(item.id))!==JSON.stringify(item))tx.set(doc(ref,'items',item.id),clean(item));
 if(!migrating){const remaining=new Set(list.items.map(item=>item.id));for(const id of stored.itemIds||[])if(!remaining.has(id))tx.delete(doc(ref,'items',id))}
 });
}
// Existing array-based lists remain readable; the first owner/editor save migrates
// them atomically, keeping every list ID, item ID, invitation and comment in place.
export function subscribeShared(id:string,onValue:(value:Shared|null)=>void,onError:(error:Error)=>void,database:Firestore=db):Unsubscribe{
 let stopItems:Unsubscribe|undefined;let parent:any;let items:Map<string,Item>|null=null;let timer:ReturnType<typeof setTimeout>|undefined;let alive=true;
 function emit(){if(!alive||!parent)return;try{if(parent.schemaVersion===2){if(!items)return;validateMetadata(parent.list,id);if(!Array.isArray(parent.itemIds)||parent.itemIds.some((id:unknown)=>!validId(id)))throw Error('Invalid shared item order.');const list={...parent.list,items:parent.itemIds.map((id:string)=>items!.get(id)).filter(Boolean)};validateSharedList(list);onValue({id,...parent,list})}else{validateSharedList(parent.list);onValue({id,...parent})}}catch(error){onValue(null);onError(error as Error)}}
 function schedule(){clearTimeout(timer);timer=setTimeout(emit,0)}
 const stop=onSnapshot(sharedRef(id,database),{includeMetadataChanges:true},snapshot=>{if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;if(!snapshot.exists()){parent=null;stopItems?.();stopItems=undefined;items=null;onValue(null);return}parent=snapshot.data();if(parent.schemaVersion===2&&!stopItems){stopItems=onSnapshot(collection(sharedRef(id,database),'items'),{includeMetadataChanges:true},snapshot=>{if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;try{items=new Map(snapshot.docs.map(doc=>{const item=doc.data();validateItem(item);if(item.id!==doc.id)throw Error('Invalid shared item ID.');return [doc.id,item]}));schedule()}catch(error){items=null;onValue(null);onError(error as Error)}},error=>{items=null;onValue(null);onError(error)})}schedule()},error=>{onValue(null);onError(error)});
 return()=>{alive=false;clearTimeout(timer);stop();stopItems?.()};
}
