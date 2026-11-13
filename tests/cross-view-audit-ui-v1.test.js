'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCrossViewAuditHtmlV1:html,epCrossViewAuditCsvV1:csv}=require('../cross-view-audit-ui-v1');
test('empty cross-view issues do not imply approval',()=>{
 const h=html({status:'UNKNOWN',issues:[],checkedCircuits:2});
 assert.match(h,/инженерная проверка всё равно требуется/);
 assert.match(h,/электрическую безопасность/);
});
test('blocking issue navigates to selected circuit',()=>{
 const h=html({status:'BLOCKED',issues:[{level:'BLOCKED',code:'SKU_STALE',lineId:'L1'}],checkedCircuits:1},'L1');
 assert.match(h,/data-crossview-focus="L1"/);assert.match(h,/ep-circuit-active/);
});
test('untrusted issue codes and circuit IDs are escaped',()=>{
 const h=html({status:'BLOCKED',issues:[{level:'BLOCKED',code:'<script>',lineId:'"><img src=x>'}],checkedCircuits:1});
 assert.doesNotMatch(h,/<script>|<img/);assert.match(h,/&lt;script&gt;/);
 assert.match(h,/&quot;&gt;&lt;img/);
});
test('CSV neutralizes formula injection',()=>{
 const s=csv({issues:[{level:'BLOCKED',code:'=HYPERLINK(1)',lineId:' +SUM(1)'}]});
 assert.match(s,/"'=HYPERLINK\(1\)"/);
 assert.match(s,/"' \+SUM\(1\)"/);
});
test('missing report renders fail-closed message',()=>assert.match(html(null),/не подтверждены/));
