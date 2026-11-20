'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFaultLoopScreen}=require('../fault-loop-screen-v1');
const x={u0V:230,zsOhm:2,iaA:100,cmin:0.95,source:'declared engineering inputs'};
test('screen calculates declared values without approving',()=>{const r=epFaultLoopScreen(x);assert.equal(r.prospectiveIa,109.25);assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false)});
test('insufficient prospective current blocks',()=>assert.equal(epFaultLoopScreen({...x,zsOhm:3}).status,'BLOCKED'));
test('missing cmin is unknown',()=>assert.equal(epFaultLoopScreen({...x,cmin:undefined}).prospectiveIa,null));
test('invalid impedance blocks',()=>assert.equal(epFaultLoopScreen({...x,zsOhm:0}).status,'BLOCKED'));
test('invalid cmin blocks',()=>assert.equal(epFaultLoopScreen({...x,cmin:1.2}).status,'BLOCKED'));
