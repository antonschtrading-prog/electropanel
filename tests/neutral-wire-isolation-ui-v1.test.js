'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epNeutralWireIsolationHtmlV1:html}=require('../neutral-wire-isolation-ui-v1');
const fixture=()=>({status:'BLOCKED',pairs:[{fromBus:'N_RCD1',toBus:'N_RCD2',
 status:'BLOCKED',path:['n1','junction','n2']}],issues:[{code:'N_ISOLATION_CROSS_BUS_DECLARED_PATH',level:'BLOCKED'}]});
test('neutral isolation UI shows two buses and terminal path',()=>{
 const h=html(fixture());assert.match(h,/N_RCD1/);assert.match(h,/N_RCD2/);
 assert.match(h,/n1 → junction → n2/);assert.match(h,/BLOCKED/);
});
test('UI never asserts absence of path means physical separation',()=>{
 assert.match(html(fixture()),/не доказывает физическое разделение/);
});
test('UI escapes malicious bus names',()=>{
 const p=fixture();p.pairs[0].fromBus='<script>alert(1)</script>';
 const h=html(p);assert.doesNotMatch(h,/<script>/);assert.match(h,/&lt;script&gt;/);
});
test('missing audit is not rendered as success',()=>{
 assert.match(html(null),/недоступна/);
});
