'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCircuitDossierV1=require('../circuit-dossier-v1.js').epCircuitDossierV1;
const {epCircuitWorkspaceV1:work,epCircuitWorkspaceHtmlV1:html}=require('../circuit-workspace-v1.js');
const p=()=>({railCount:1,railCapacity:2,lines:[
 {id:'L1',name:'Кухня',phase:'L1',modules:1,catalogSku:'A',overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3},route44Input:{}},
 {id:'L2',name:'Освещение',phase:'L2',modules:1,calculationReview:{required:true}},
 {id:'L3',name:'Насос',phase:'L3',modules:1}]});
const lookup=()=>({maker:'ABB',series:'S200',modules:1,source:'https://example.org'});
test('case insensitive search by Cyrillic name',()=>{const r=work(p(),lookup,'КУХ');assert.equal(r.visible,1);assert.equal(r.rows[0].circuitId,'L1');});
test('search by manufacturer and series',()=>{assert.equal(work(p(),lookup,'abb').visible,1);assert.equal(work(p(),lookup,'s200').visible,1);});
test('blocked filter isolates stale review and capacity overflow',()=>{const r=work(p(),lookup,'','blocked');assert.ok(r.rows.some(x=>x.circuitId==='L2'));assert.ok(r.rows.some(x=>x.circuitId==='L3'));});
test('unplaced filter shows overflow',()=>{const r=work(p(),lookup,'','unplaced');assert.deepEqual(r.rows.map(x=>x.circuitId),['L3']);});
test('article missing filter shows lines without SKUs',()=>{assert.equal(work(p(),lookup,'','article_missing').visible,2);});
test('review filter shows only stale calculation',()=>{assert.deepEqual(work(p(),lookup,'','review').rows.map(x=>x.circuitId),['L2']);});
test('invalid mode falls back to all',()=>{const r=work(p(),lookup,'','not-a-mode');assert.equal(r.filter,'all');assert.equal(r.visible,3);});
test('search never changes project',()=>{const x=p(),before=JSON.stringify(x);work(x,lookup,'abc');assert.equal(JSON.stringify(x),before);});
test('HTML escapes user-controlled line name',()=>{const x=p();x.lines[0].name='<svg onload=alert(1)>';const h=html(work(x,lookup));assert.doesNotMatch(h,/<svg/);assert.match(h,/&lt;svg/);});
test('empty search results are clearly labelled',()=>assert.match(html(work(p(),lookup,'not-found')),/Нет цепей/));
test('workspace never grants engineering approval',()=>{const x=work(p(),lookup);assert.equal(x.engineeringApproved,false);assert.equal(x.ready_for_installation,false);});

test('workspace counters cover all lines independently of search filter',()=>{
 const a=work(p(),lookup,'Кухня'),b=work(p(),lookup);
 assert.deepEqual(a.counts,b.counts);
 assert.equal(a.counts.missingArticle,2);
 assert.equal(a.counts.unplaced,1);
 assert.equal(a.counts.staleReview,1);
 assert.match(html(a),/без артикула: 2/);
});

test('selected circuit is highlighted and has navigation buttons',()=>{
 const h=html(work(p(),lookup),'L1');
 assert.match(h,/class="ep-circuit-active"/);
 assert.match(h,/data-focus-circuit="L1"/);
 assert.match(h,/data-open-load-circuit="L1"/);
});
test('selection controls escape malicious circuit IDs',()=>{
 const x=p();x.lines[0].id='L1"><img src=x onerror=alert(1)>';
 const h=html(work(x,lookup),x.lines[0].id);
 assert.doesNotMatch(h,/<img/);
 assert.match(h,/&quot;&gt;&lt;img/);
});
