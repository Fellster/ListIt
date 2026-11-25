import assert from 'node:assert/strict';
import {rememberStores,servicesFromLists,sameService,summaryFields,serviceName,rememberServices,sortByService} from '../src/redesign/stores.ts';
const item={id:'show',title:'Show',done:false,fields:{Season:'2','Streaming service':'Hulu',Episode:'3',Notes:'Watch'}};
assert.deepEqual(summaryFields(item,'TV').map(([key])=>key),['Streaming service','Season','Episode','Notes']);
assert.deepEqual(Object.keys(item.fields),['Season','Streaming service','Episode','Notes']);
assert.deepEqual(summaryFields(item,'Other'),Object.entries(item.fields));
assert.deepEqual(servicesFromLists([{template:'TV',items:[item]},{template:'Grocery',items:[item]}]),['Hulu']);
assert.deepEqual(rememberStores(['Netflix',' Hulu '],['hulu','Apple TV+','NETFLIX']),['Apple TV+','Hulu','Netflix']);
assert(sameService(' HULU ','hulu'));assert(!sameService('Hulu','Netflix'));
console.log('PASS: TV service-first summaries without field mutation, TV-only discovery, alphabetical history and normalized filtering');

for(const value of ['Apple','apple','Apple +','Apple TV+','Apple TV +','APPLE+'])assert.equal(serviceName(value),'Apple+');
assert.deepEqual(rememberServices(['Apple','Netflix'],['Apple TV+','Apple+','Hulu']),['Apple+','Hulu','Netflix']);
assert.equal(summaryFields({...item,fields:{Season:'2','Streaming service':'Apple TV+'}},'TV')[0][1],'Apple+');
const rows=['Hulu','Apple','Netflix','Apple TV+','hulu',''].map((name,index)=>({...item,id:String(index),fields:{'Streaming service':name}}));
assert.deepEqual(sortByService(rows).map(i=>i.id),['1','3','0','4','2','5']);
assert.deepEqual(rows.map(i=>i.id),['0','1','2','3','4','5']);assert.equal(sortByService(rows).length,rows.length);
console.log('PASS: Apple+ alias display/history and stable service grouping retains every show without changing shared order');
