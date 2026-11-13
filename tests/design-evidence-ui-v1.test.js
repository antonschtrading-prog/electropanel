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

test('evidence editor renders six save actions and source/method fields',()=>{
 const html=epDesignEvidenceHtmlV1(assessDesignEvidence({}));
 assert.equal((html.match(/data-save-evidence=/g)||[]).length,6);
 assert.equal((html.match(/data-evidence-field="source"/g)||[]).length,6);
 assert.equal((html.match(/data-evidence-field="method"/g)||[]).length,6);
});
test('evidence editor escapes hostile source and method values',()=>{
 const report=assessDesignEvidence({evidence:{load:{status:'unknown',source:'"><img src=x>',method:'"><svg onload=alert(1)>'}}});
 const html=epDesignEvidenceHtmlV1(report);
 assert.doesNotMatch(html,/<img|<svg/);
 assert.match(html,/&quot;&gt;&lt;img/);
});
