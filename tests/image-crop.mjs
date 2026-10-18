import assert from 'node:assert/strict';
import {fullCrop,resizeCrop,moveCrop} from '../src/redesign/imageCrop.ts';
const full=fullCrop();assert.deepEqual(full,{left:0,top:0,right:1,bottom:1});
const cropped=resizeCrop(full,'nw',.2,.3);assert.deepEqual(cropped,{left:.2,top:.3,right:1,bottom:1});assert.deepEqual(full,fullCrop());
const tight=resizeCrop(cropped,'se',0,0);assert.ok(tight.right-tight.left>=.019);assert.ok(tight.bottom-tight.top>=.019);
const moved=moveCrop({left:.2,top:.3,right:.6,bottom:.8},100,-100);assert.ok(Math.abs(moved.left-.6)<1e-6);assert.equal(moved.top,0);assert.equal(moved.right,1);assert.equal(moved.bottom,.5);
assert.deepEqual(moveCrop(full,1,1),full);console.log('PASS: crop edges, minimum area, movement bounds and immutable geometry');
