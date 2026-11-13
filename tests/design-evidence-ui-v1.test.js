'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessDesignEvidence,REQUIRED}=require('../design-evidence-gates-v1');
const {epDesignEvidenceHtmlV1}=require('../design-evidence-ui-v1');
test('panel displays all six design areas without physical inspection',()=>{
 const html=epDesignEvidenceHtmlV1(assessDesignEvidence({}));
 for(const label of ['Нагрузки','Параметры сети','Кабели','Аппараты','Соединения','Корпус'])assert.match(html,new RegExp(label));
 assert.match(html,/документировано 0\/6/);
 assert.match(html,/не принимаются/);
});
test('panel escapes untrusted reasons',()=>{
 const html=epDesignEvidenceHtmlV1({status:'<script>',counts:{verified:0},items:[{area:'load',status:'unknown',reason:'<img src=x>'}]});
 assert.doesNotMatch(html,/<script>|<img/);
 assert.match(html,/&lt;img/);
});
test('panel missing model fails closed',()=>assert.match(epDesignEvidenceHtmlV1(null),/недоступна/));
test('all evidence sections remain present in documented project',()=>{
 const evidence=Object.fromEntries(REQUIRED.map(k=>[k,{status:'verified',source:'datasheet',method:'calculation'}]));
 const report=assessDesignEvidence({evidence});
 assert.equal(report.items.length,6);
 assert.match(epDesignEvidenceHtmlV1(report),/документировано 6\/6/);
 assert.equal(report.installationApproved,false);
});
