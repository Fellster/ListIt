import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp,collection,query,where,getDocs} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-listit',firestore:{host:'127.0.0.1',port:8089,rules:fs.readFileSync('firestore.rules','utf8')}});
const owner=env.authenticatedContext('owner',{email:'owner@example.com',email_verified:true}).firestore();
const target=env.authenticatedContext('target',{email:'target@example.com',email_verified:true}).firestore();
const stranger=env.authenticatedContext('stranger',{email:'other@example.com',email_verified:true}).firestore();
const unverified=env.authenticatedContext('unverified',{email:'target@example.com',email_verified:false}).firestore();
const shared=(db)=>doc(db,'listitSharedLists','list1');const inv=(db)=>doc(db,'listitInvitations','list1_target@example.com');
try{
await assertSucceeds(setDoc(shared(owner),{ownerId:'owner',ownerEmail:'owner@example.com',list:{id:'list1',name:'Groceries',items:[]},revision:0}));
await assertSucceeds(setDoc(inv(owner),{listId:'list1',listName:'Groceries',ownerId:'owner',ownerEmail:'owner@example.com',email:'target@example.com',role:'viewer',status:'pending',expiresAt:Date.now()+600000}));
await assertSucceeds(getDocs(query(collection(owner,'listitSharedLists'),where('ownerId','==','owner'))));await assertSucceeds(getDocs(query(collection(target,'listitInvitations'),where('email','==','target@example.com'))));await assertSucceeds(getDocs(query(collection(owner,'listitInvitations'),where('ownerId','==','owner'))));
await assertFails(getDoc(shared(target)));await assertFails(getDoc(inv(stranger)));await assertFails(getDoc(inv(unverified)));
await assertSucceeds(updateDoc(inv(target),{status:'accepted'}));await assertSucceeds(getDoc(shared(target)));
await assertFails(updateDoc(shared(target),{list:{id:'list1',name:'Hacked',items:[]},revision:1}));
await assertFails(setDoc(doc(target,'listitSharedLists/list1/comments/c1'),{itemId:'i1',text:'comment',authorId:'target',authorEmail:'target@example.com',createdAt:serverTimestamp()}));
await assertSucceeds(updateDoc(inv(owner),{role:'commenter'}));
await assertSucceeds(setDoc(doc(target,'listitSharedLists/list1/comments/c1'),{itemId:'i1',text:'comment',authorId:'target',authorEmail:'target@example.com',createdAt:serverTimestamp()}));
await assertFails(updateDoc(shared(target),{list:{id:'list1',items:[]},revision:1}));await assertFails(updateDoc(inv(target),{role:'editor'}));
await assertSucceeds(updateDoc(inv(owner),{role:'editor'}));await assertSucceeds(updateDoc(shared(target),{list:{id:'list1',name:'Edited',items:[]},revision:1}));
await assertFails(updateDoc(shared(target),{ownerId:'target'}));await assertFails(deleteDoc(shared(target)));
await assertSucceeds(updateDoc(inv(owner),{status:'revoked'}));await assertFails(getDoc(shared(target)));await assertFails(getDoc(doc(target,'listitSharedLists/list1/comments/c1')));await assertFails(updateDoc(inv(target),{status:'accepted'}));
await env.withSecurityRulesDisabled(async context=>{await updateDoc(inv(context.firestore()),{status:'pending',expiresAt:Date.now()-10000})});await assertFails(updateDoc(inv(target),{status:'accepted'}));
console.log('PASS: pending access, verified email, viewer, commenter, editor, ownership, revocation and role escalation checks');
}finally{await env.cleanup()}
