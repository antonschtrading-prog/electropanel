'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
global.epDesignReviewNoticeNormalizeV1=require('../design-review-notice-v1.js').epDesignReviewNoticeNormalizeV1;
const {epDesignReviewActionMatrixV1:run,epDesignReviewActionMatrixHtmlV1:html,
 epDesignReviewActionMatrixCsvV1:csv,EP_REVIEW_ACTION_SECTIONS_V1:sections}=require('../design-review-actions-v1.js');
const sample=(domains=['load'])=>({title:'Clinic',lines:[{id:'C1',name:'Lights'}],
 designReviewNoticeV1:{version:1,revision:3,pendingDomains:domains,
  lastChangedDomains:[domains[0]]}});
const issue=(section,code,level='UNKNOWN',circuitId='C1')=>
 ({section,code,level,circuitId});
const register=(entries=[],deferred=[])=>({entries,deferred});
test('new projects without saved impact do not invent an approval',()=>{
 const r=run({lines:[]},register());
 assert.equal(r.status,'NOT_APPLICABLE');assert.equal(r.engineeringApproved,false);
 assert.equal(r.rows.length,0);
});
test('a pending domain remains pending even with zero matched issues',()=>{
 const r=run(sample(),register());
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.summary.unmatched,1);
 assert.equal(r.rows[0].noMatchingIssues,true);
 assert.equal(r.rows[0].requiresIndependentReview,true);
 assert.equal(r.rows[0].status,'REVIEW_REQUIRED');
});
test('saved revision is retained in every domain row',()=>{
 const r=run(sample(['load','cable','device']),register());
 assert.deepEqual(r.rows.map(x=>x.revision),[3,3,3]);
 assert.equal(r.revision,3);
});
test('actual load issue links to saved load review and retains original circuit',()=>{
 const r=run(sample(),register([issue('loadCurrent','LOAD_CURRENT_STALE','UNKNOWN')]));
 assert.equal(r.summary.open,1);assert.equal(r.rows[0].tasks[0].lineId,'C1');
 assert.equal(r.rows[0].tasks[0].code,'LOAD_CURRENT_STALE');
});
test('blocked issue stays blocking, not accepted by saved record',()=>{
 const r=run(sample(['device']),register([issue('protection','ICN_BELOW_IK','BLOCKED')]));
 assert.equal(r.status,'BLOCKED');assert.equal(r.summary.blocking,1);
 assert.equal(r.rows[0].status,'BLOCKED');
});
test('deferred issue is visible separately but does not imply a completed review',()=>{
 const r=run(sample(['network']),register([], [issue('incomingMaximum','SOURCE_UNKNOWN','DEFERRED')]));
 assert.equal(r.summary.deferred,1);assert.equal(r.summary.open,0);
 assert.equal(r.status,'REVIEW_REQUIRED');
});
test('unrelated sections do not become fictitious review tasks',()=>{
 const r=run(sample(['enclosure']),register([issue('loadCurrent','X','BLOCKED')]));
 assert.equal(r.summary.blocking,0);assert.equal(r.summary.unmatched,1);
});
test('per-domain reporting does not mutate input project or register',()=>{
 const p=sample(['load','network','device']),reg=register([issue('workflowPreview','WRONG','BLOCKED')]);
 const before=JSON.stringify({p,reg});run(p,reg);assert.equal(JSON.stringify({p,reg}),before);
});
test('projects without a valid versioned notice fail closed',()=>{
 const p=sample();p.designReviewNoticeV1={approved:true};
 const r=run(p,register());assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='REVIEW_NOTICE_INVALID'));
});
test('missing registered issues does not fabricate problem codes',()=>{
 const r=run(sample(['load']),null);
 assert.deepEqual(r.rows[0].tasks,[]);
 assert.equal(r.rows[0].noMatchingIssues,true);
});
test('domain rows are in saved canonical order',()=>{
 const r=run(sample(['enclosure','load','network']),register());
 assert.deepEqual(r.rows.map(x=>x.domain),['load','network','enclosure']);
});
test('one problem may affect multiple domains but stays one source issue',()=>{
 const r=run(sample(['device','topology']),register([issue('deliveryTrace','SCHEMATIC_MISMATCH','BLOCKED')]));
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[0].tasks[0].code,'SCHEMATIC_MISMATCH');
 assert.equal(r.rows[1].tasks[0].code,'SCHEMATIC_MISMATCH');
 assert.equal(r.issues.length,0,'no duplicate issue creation');
});
test('orphan object id is preserved for useful action context',()=>{
 const r=run(sample(['topology']),register([{
  section:'wiringTrace',code:'MISSING_TERMINAL',level:'UNKNOWN',circuitId:null,objectId:'T-01'}]));
 assert.equal(r.rows[0].tasks[0].lineId,'T-01');
});
test('unknown issue level cannot be reported as verified',()=>{
 const r=run(sample(['load']),register([issue('workflowPreview','X','APPROVED')]));
 assert.equal(r.rows[0].tasks[0].level,'UNKNOWN');
});
test('empty name or hostile input is HTML-escaped',()=>{
 const r=run(sample(['topology']),register([issue('wiringTrace','<script>alert(1)</script>','BLOCKED','<img>')]));
 const out=html(r);
 assert.doesNotMatch(out,/<script>|<img>/);
 assert.match(out,/&lt;script&gt;/);
 assert.match(out,/&lt;img&gt;/);
});
test('HTML includes saved title and warning against automatic acceptance',()=>{
 const out=html(run(sample(['cable']),register()));
 assert.match(out,/Кабели и проверки проводников/);
 assert.match(out,/Отсутствие замечания не подтверждает выполнение/);
});
test('unmatched state renders explicit independent recheck action',()=>{
 const out=html(run(sample(['load']),register()));
 assert.match(out,/подтверждение всё равно требуется/);
});
test('large register is bounded for UI and CSV',()=>{
 const entries=Array.from({length:450},(_,i)=>issue('protection','E_'+i));
 const r=run(sample(['device']),register(entries));
 assert.equal(r.rows[0].tasks.length,200);
});
test('no persisted notices have a neutral HTML state',()=>{
 assert.match(html(run({lines:[]},register())),/Сохранённых требований/);
});
test('CSV emits BOM and wiring follow-ups with provenance',()=>{
 const r=run(sample(['topology','enclosure']),register([
  issue('singleLine','SCHEMATIC_WRONG','BLOCKED','C1'),
  issue('bom','BOM_WIDTH','UNKNOWN','C1')]));
 const out=csv(r);
 assert.match(out,/singleLine/);assert.match(out,/BOM_WIDTH/);
 assert.match(out,/review_revision/);assert.match(out,/C1/);
 assert.equal(out.charCodeAt(0),0xFEFF);
});
test('CSV escapes formula injection in code and external object id',()=>{
 const r=run(sample(['load']),register([issue('workflowPreview','=HYPERLINK(1)','BLOCKED','+CMD')]));
 const out=csv(r);
 assert.match(out,/"'=HYPERLINK\(1\)"/);
 assert.match(out,/"'\+CMD"/);
});
test('CSV never drops domain with no current issue',()=>{
 const r=run(sample(['load','device']),register());
 const out=csv(r);
 assert.match(out,/NO_MATCHING_ISSUE_NOT_APPROVED/);
 assert.equal(out.split('NO_MATCHING_ISSUE_NOT_APPROVED').length-1,2);
});
test('all six domains map to real engineering sections',()=>{
 assert.deepEqual(Object.keys(sections),['load','network','cable','device','topology','enclosure']);
 assert.ok(sections.enclosure.includes('bom'));
 assert.ok(sections.topology.includes('singleLine'));
});
test('print reports saved action matrix, without approval',()=>{
 const p=require('../engineering-print-v1.js').epEngineeringPrintV1;
 const r=run(sample(['load']),register([issue('loadCurrent','IB_OUTDATED')]));
 const out=p({projectTitle:'Clinic',sections:{reviewActions:r},overallStatus:'UNKNOWN'});
 assert.match(out,/Сохранённые задачи перепроверки/);
 assert.match(out,/IB_OUTDATED/);
 assert.match(out,/НЕ ДЛЯ МОНТАЖА/);
});
test('printed rows escape hostile issue codes',()=>{
 const p=require('../engineering-print-v1.js').epEngineeringPrintV1;
 const r=run(sample(['device']),register([issue('protection','<img onerror=x>')]));
 const out=p({sections:{reviewActions:r},overallStatus:'UNKNOWN'});
 assert.doesNotMatch(out,/<img onerror/);assert.match(out,/&lt;img/);
});
test('HTML wires module into browser before main app and registration',()=>{
 const doc=read('index.html');
 assert.ok(doc.indexOf('design-review-actions-v1.js')>doc.indexOf('design-review-notice-v1.js'));
 assert.ok(doc.indexOf('design-review-actions-v1.js')<doc.indexOf('app.js'));
 const b=read('engineering-bundle-v1.js');
 assert.match(b,/sections.reviewActions=section\(/);
 assert.match(b,/sections.issueRegister=section\(/);
});
test('browser view reuses a single dossier computation per render',()=>{
 const source=read('app.js');
 const start=source.indexOf('function renderEngineeringDiagnosticsV1(){');
 const end=source.indexOf('function ',start+50);
 const section=source.slice(start,end>start?end:start+9500);
 assert.match(section,/const engineeringBundle=/);
 assert.match(section,/engineeringBundle\?\.sections\?\.reviewActions/);
 assert.doesNotMatch(section,/const bundle=epEngineeringBundleV1\(state,catalogDevice\)/);
});
test('status mapping refuses to infer compliance from matching issue counts',()=>{
 const r=run(sample(['enclosure']),register([]));
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
 assert.equal(r.status,'REVIEW_REQUIRED');
});
