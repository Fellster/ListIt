import fs from 'node:fs';
import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,collection,query,where,getDocs,runTransaction} from 'firebase/firestore';
import {publishShared,saveShared,subscribeShared} from '../src/redesign/sharing.ts';
const env=await initializeTestEnvironment({projectId:'demo-listit',firestore:{host:'127.0.0.1',port:8089,rules:fs.readFileSync('firestore.rules','utf8')}});
const context=(uid,email,verified=true)=>env.authenticatedContext(uid,{email,email_verified:verified,firebase:{sign_in_provider:'password'}}).firestore();
const owner=context('owner','owner@example.com'),target=context('target','target@example.com'),stranger=context('stranger','other@example.com'),unverified=context('unverified','target@example.com',false);
const shared=db=>doc(db,'listitSharedLists','list1'),inv=db=>doc(db,'listitInvitations','list1_target@example.com');
const item={id:'i1',title:'Milk',done:false,fields:{Store:'Target',Notes:'Organic'}};
const list={id:'list1',name:'Groceries',template:'Grocery',group:'Personal',items:[item]};
const read=(db,id='list1')=>new Promise((resolve,reject)=>{let stop=()=>{};const timer=setTimeout(()=>{stop();reject(Error('Shared listener timeout'))},10000);stop=subscribeShared(id,value=>{if(value){clearTimeout(timer);stop();resolve(value)}},error=>{clearTimeout(timer);stop();reject(error)},db)});
async function invalidItem(data){return assertFails(runTransaction(target,async tx=>{const ref=shared(target),snapshot=await tx.get(ref);tx.update(ref,{revision:snapshot.data().revision+1});tx.set(doc(ref,'items','i1'),data)}))}
try{
await env.clearFirestore();
await env.withSecurityRulesDisabled(async context=>{const db=context.firestore();await setDoc(doc(db,'lists','legacy'),{ownerId:'owner',members:[],memberEmails:['target@example.com'],sharedWith:{'target@example_com':{role:'editor'}}});await setDoc(doc(db,'lists/legacy/items/item'),{listId:'legacy',title:'Legacy item'});});
await assertSucceeds(getDoc(doc(target,'lists','legacy')));await assertFails(getDoc(doc(unverified,'lists','legacy')));await assertFails(updateDoc(doc(unverified,'lists/legacy/items/item'),{title:'Impersonation'}));await assertSucceeds(updateDoc(doc(target,'lists/legacy/items/item'),{title:'Verified editor'}));await assertFails(updateDoc(doc(target,'lists/legacy/items/item'),{listId:'different'}));
await assertSucceeds(publishShared(owner,{uid:'owner',email:'owner@example.com'},list));
assert.equal((await getDoc(shared(owner))).data().schemaVersion,2);assert.equal((await getDoc(shared(owner))).data().list.items,undefined);
await assertSucceeds(getDocs(query(collection(target,'listitSharedLists'),where('ownerId','==','target'))));
await assertSucceeds(setDoc(inv(owner),{listId:'list1',listName:'Groceries',ownerId:'owner',ownerEmail:'owner@example.com',email:'target@example.com',role:'viewer',status:'pending',expiresAt:Date.now()+600000}));
await assertFails(updateDoc(inv(owner),{status:'accepted'}));await assertFails(getDoc(shared(target)));await assertFails(getDoc(inv(unverified)));await assertFails(getDoc(inv(stranger)));
await assertSucceeds(updateDoc(inv(target),{status:'accepted',recipientName:'Taylor'}));
let record=await read(target);assert.deepEqual(record.list.items,[item]);
await assertSucceeds(getDocs(query(collection(target,'listitInvitations'),where('listId','==','list1'),where('status','==','accepted'))));await assertFails(getDocs(query(collection(stranger,'listitInvitations'),where('listId','==','list1'),where('status','==','accepted'))));
await assertFails(saveShared(record,{...record.list,name:'Viewer edit'},target));await assertFails(setDoc(doc(target,'listitSharedLists/list1/comments/c1'),{itemId:'i1',text:'No',authorId:'target',authorEmail:'target@example.com',createdAt:serverTimestamp()}));
await assertSucceeds(updateDoc(inv(owner),{role:'commenter'}));
await assertSucceeds(setDoc(doc(target,'listitSharedLists/list1/comments/c1'),{itemId:'i1',text:'Comment',authorId:'target',authorEmail:'target@example.com',createdAt:serverTimestamp()}));await assertFails(deleteDoc(doc(stranger,'listitSharedLists/list1/comments/c1')));await assertSucceeds(deleteDoc(doc(target,'listitSharedLists/list1/comments/c1')));
await assertFails(updateDoc(inv(target),{role:'editor'}));await assertSucceeds(updateDoc(inv(owner),{role:'editor'}));
record=await read(target);await assertSucceeds(saveShared(record,{...record.list,items:[{...item,title:'Oat milk',fields:{Store:'Target',Ingredients:'Oats\nWater',Instructions:'Blend.'}}]},target));record=await read(target);assert.equal(record.list.items[0].title,'Oat milk');
await assertFails(updateDoc(shared(target),{ownerId:'target'}));await assertFails(deleteDoc(shared(target)));await assertFails(updateDoc(doc(target,'listitSharedLists/list1/items/i1'),{title:'No revision'}));
for(const data of [{...item,title:''},{...item,title:'x'.repeat(2001)},{...item,done:'yes'},{...item,id:'other'},{...item,fields:[]},{...item,fields:{Store:{bad:'object'}}},{...item,fields:{Photo:'base64'}},{...item,fields:{Instructions:'x'.repeat(30001)}}])await invalidItem(data);
const revision=(await getDoc(shared(target))).data().revision;
for(const patch of [{list:{id:'list1',name:'Bad',template:'Unknown',group:'Personal'}},{itemIds:Array.from({length:301},(_,i)=>'i'+i)},{itemIds:['i1','i1']},{itemIds:[{id:'i1'}]},{itemIds:[1]},{itemIds:[true]},{list:{id:'list1',name:'Bad',template:'Grocery',group:'Personal',items:[]}}])await assertFails(updateDoc(shared(target),{...patch,revision:revision+1}));
await assertFails(setDoc(doc(target,'listitSharedLists/list1/items/unlisted'),{...item,id:'unlisted'}));
record=await read(owner);const edited={...record.list,items:[...record.list.items,{id:'i2',title:'Bread',done:false,fields:{}}]};await assertSucceeds(saveShared(record,edited,owner));record=await read(target);assert.equal(record.list.items.length,2);
await assertSucceeds(saveShared(record,{...record.list,items:record.list.items.filter(i=>i.id!=='i2')},target));assert.equal((await getDoc(doc(owner,'listitSharedLists/list1/items/i2'))).exists(),false);
await assertSucceeds(updateDoc(inv(target),{status:'declined'}));await assertFails(getDoc(shared(target)));await assertFails(updateDoc(inv(owner),{status:'accepted'}));await assertSucceeds(updateDoc(inv(owner),{status:'pending'}));await assertSucceeds(updateDoc(inv(target),{status:'accepted'}));await assertSucceeds(updateDoc(inv(owner),{status:'revoked'}));await assertFails(updateDoc(inv(owner),{status:'accepted'}));await assertFails(getDoc(doc(target,'listitSharedLists/list1/items/i1')));
await env.withSecurityRulesDisabled(async context=>{await updateDoc(inv(context.firestore()),{status:'pending',expiresAt:Date.now()-10000})});await assertFails(updateDoc(inv(target),{status:'accepted'}));
// Full-size migration proves the rules work for large atomic writes, and keeps
// item IDs/comments/invitations intact without touching private account order.
const oldList={id:'legacy-shared',name:'Existing list',template:'Other',group:'Personal',items:Array.from({length:300},(_,index)=>({id:'old'+index,title:'Item '+index,done:false,fields:{Notes:'Existing text'}}))};
await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'listitSharedLists','legacy-shared'),{ownerId:'owner',ownerEmail:'owner@example.com',revision:4,list:oldList})});
await assertSucceeds(saveShared({id:oldList.id,ownerId:'owner',ownerEmail:'owner@example.com',revision:4,list:oldList},{...oldList,name:'Migrated list'},owner));
const migrated=(await getDoc(doc(owner,'listitSharedLists','legacy-shared'))).data();assert.equal(migrated.schemaVersion,2);assert.equal(migrated.itemIds.length,300);assert.equal((await getDocs(collection(owner,'listitSharedLists','legacy-shared','items'))).size,300);assert.equal((await getDoc(doc(owner,'listitSharedLists','legacy-shared','items','old299'))).data().fields.Notes,'Existing text');
const recipeList={id:'recipe-list',name:'Recipes',template:'Recipes',group:'Personal',items:[{id:'pasta',title:'Pasta',done:false,fields:{Ingredients:'Pasta\nTomatoes',Instructions:'Boil.\nAdd sauce.',Notes:'Serve hot','Prep time':'10 min','Source link':'https://example.com/recipe'}}]};
await assertSucceeds(publishShared(owner,{uid:'owner',email:'owner@example.com'},recipeList));await setDoc(doc(owner,'listitInvitations','recipe-list_target@example.com'),{listId:'recipe-list',listName:'Recipes',ownerId:'owner',ownerEmail:'owner@example.com',email:'target@example.com',role:'viewer',status:'pending',expiresAt:Date.now()+600000});await updateDoc(doc(target,'listitInvitations','recipe-list_target@example.com'),{status:'accepted'});const recipeRead=await read(target,'recipe-list');assert.deepEqual(recipeRead.list.items,recipeList.items);
console.log('PASS: legacy verification, consent, roles, revocation, per-item schema/limits, revision enforcement, deletion and 300-item migration');
}finally{await env.cleanup()}
