'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epNeutralSegregationHtmlV1:html}=require('../neutral-segregation-ui-v1');
const r=()=>({status:'UNKNOWN',issues:[],rows:[{lineId:'L1',groupId:'RCD1',expectedBus:'N_RCD1',
 declaredBus:'N_RCD1',protectiveBus:'PE_MAIN',status:'UNKNOWN'}]});
test('N/PE matrix shows declared and expected buses',()=>{
 const h=html(r(),'L1');assert.match(h,/N_RCD1/);assert.match(h,/PE_MAIN/);
 assert.match(h,/data-neutral-focus="L1"/);assert.match(h,/ep-circuit-active/);
});
test('N/PE matrix never claims verified RCD contact state',()=>{
 const h=html(r());assert.match(h,/не проверены/);
});
test('N/PE matrix escapes hostile circuit IDs',()=>{
 const x=r();x.rows[0].lineId='"><script>alert(1)</script>';
 const h=html(x);assert.doesNotMatch(h,/<script>/);
 assert.match(h,/&quot;&gt;&lt;script&gt;/);
});
test('invalid matrix report fails closed',()=>assert.match(html(null),/недоступна/));
