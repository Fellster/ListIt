import assert from 'node:assert/strict';
import {validateSharedList,sharedMetadata,validateItem} from '../src/security/sharedValidation.ts';
const item={id:'item1',title:'Recipe',done:false,fields:{Ingredients:'Pasta\nTomatoes',Instructions:'Boil.',Notes:'Serve hot'}};
const list={id:'list1',name:'Recipes',template:'Recipes',group:'Personal',items:[item]};
assert.doesNotThrow(()=>validateSharedList(list));assert.doesNotThrow(()=>validateItem({...item,fields:{...item.fields,'Prep time':'10 min','Source link':'https://example.com/recipe'}}));assert.equal(sharedMetadata({...list,font:undefined}).items,undefined);assert.equal(sharedMetadata({...list,font:undefined}).font,undefined);
for(const value of [{...item,fields:{Notes:[]}}, {...item,fields:{Photo:'data:image/png;base64,xx'}},{...item,title:''},{...item,done:1},{...item,id:'../other'},{...item,fields:{Instructions:'x'.repeat(30001)}}])assert.throws(()=>validateItem(value));
assert.throws(()=>validateSharedList({...list,items:[item,item]}));assert.throws(()=>validateSharedList({...list,items:Array.from({length:301},(_,i)=>({...item,id:'i'+i}))}));assert.throws(()=>validateSharedList({...list,name:'x'.repeat(121)}));assert.throws(()=>validateSharedList({...list,template:'Unknown'}));
console.log('PASS: shared metadata, text limits, fields, IDs, duplicate items and list cardinality validation');
