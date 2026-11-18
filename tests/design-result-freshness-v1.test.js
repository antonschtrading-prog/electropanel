'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
global.epDesignReviewNoticeNormalizeV1=require('../design-review-notice-v1.js').epDesignReviewNoticeNormalizeV1;
const {epDesignResultFreshnessV1:run,epDesignResultFreshnessHtmlV1:html,
 epDesignResultFreshnessCsvV1:csv,EP_FRESHNESS_DOMAINS_V1:domains,
 EP_FRESHNESS_SECTIONS_V1:sections}=require('../design-result-freshness-v1.js');
const print=require('../engineering-print-v1.js').epEngineeringPrintV1;
const base=()=>({title:'Retail',lines:[{id:'C1',name:'Lights',power:2}],
 evidence:{}});
const notice=(domains=['load'])=>({version:1,revision:7,
 pendingDomains:domains,lastChangedDomains:[domains[0]]});
const project=(domain='load',status='verified')=>{
 const p=base();p.evidence[domain]={status,source:'engineer',method:'manual'};
 return p;
};
const bundle=(parts={})=>({sections:{loadCurrent:{status:'DRAFT',issues:[]},
 singleLine:{status:'UNKNOWN',issues:[{code:'DRAFT_ONLY'}]},
 board:{status:'BLOCKED',issues:[{code:'DIN_POSITION_MISSING'}]},
 ...parts}});
test('no notices and no evidence do not claim any checked calculations',()=>{
 const r=run(base(),bundle());
 assert.equal(r.status,'DRAFT');
 assert.equal(r.rows.length,6);
 assert.equal(r.summary.unrecorded,6);
 assert.equal(r.summary.declared,0);
 assert.ok(r.rows.every(x=>x.status==='NOT_DOCUMENTED'));
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
});
test('declared verified without pending notice is only a declaration',()=>{
 const r=run(project('load'),bundle());
 assert.equal(r.rows[0].status,'DECLARED_CURRENT');
 assert.equal(r.summary.declared,1);
 assert.equal(r.engineeringApproved,false);
});
test('new saved load change outranks previous verified declaration',()=>{
 const p=project('load');p.designReviewNoticeV1=notice();
 const r=run(p,bundle());
 assert.equal(r.rows[0].status,'PENDING_REVIEW');
 assert.equal(r.rows[0].noticeRevision,7);
 assert.equal(r.rows[0].requiresReview,true);
 assert.equal(r.summary.pending,1);
 assert.equal(r.summary.declared,0);
});
test('stale evidence outranks verified status and pending notice',()=>{
 const p=project('device');p.evidence.device.stale=true;
 p.designReviewNoticeV1=notice(['device']);
 const r=run(p,bundle());
 assert.equal(r.rows[3].status,'STALE');
 assert.equal(r.summary.stale,1);
 assert.equal(r.status,'BLOCKED');
});
test('failed engineering record remains a blocker even without pending notice',()=>{
 const p=project('network','failed');
 const r=run(p,bundle());
 assert.equal(r.rows[1].status,'FAILED');
 assert.equal(r.summary.failed,1);
 assert.equal(r.status,'BLOCKED');
});
test('failed and pending still report failure, not a false success',()=>{
 const p=project('cable','failed');p.designReviewNoticeV1=notice(['cable']);
 const r=run(p,bundle());assert.equal(r.rows[2].status,'FAILED');
 assert.equal(r.rows[2].noticeRevision,7);
 assert.equal(r.status,'BLOCKED');
});
test('unknown declared status cannot imply a fresh calculation',()=>{
 const r=run(project('enclosure','unknown'),bundle());
 assert.equal(r.rows[5].status,'UNCONFIRMED');
 assert.equal(r.summary.unrecorded,6);
});
test('unrecognized declared status stays unconfirmed, not verified',()=>{
 const r=run(project('enclosure','APPROVED'),bundle());
 assert.equal(r.rows[5].status,'UNCONFIRMED');
 assert.equal(r.engineeringApproved,false);
});
test('a no-notice prior verified record remains draft rather than installation-approved',()=>{
 const p=base();for(const d of domains)p.evidence[d]={status:'verified'};
 const r=run(p,bundle());
 assert.equal(r.summary.declared,5);
 assert.equal(r.summary.pending,1,'live blocked enclosure cannot be declared current');
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.ready_for_installation,false);
});
test('empty evidence and one pending domain still require review',()=>{
 const p=base();p.designReviewNoticeV1=notice(['topology']);
 const r=run(p,bundle());
 assert.equal(r.rows[4].status,'PENDING_REVIEW');
 assert.equal(r.summary.pending,1);
});
test('all six declared areas can be marked stale independently',()=>{
 const p=base();
 for(const d of domains)p.evidence[d]={status:'verified',stale:true};
 const r=run(p,bundle());
 assert.equal(r.summary.stale,6);
 assert.ok(r.rows.every(x=>x.status==='STALE'));
});
test('all domains maintain canonical ordering',()=>{
 const p=base();p.designReviewNoticeV1=notice(['enclosure','load']);
 const r=run(p,bundle());
 assert.deepEqual(r.rows.map(x=>x.domain),domains);
 assert.deepEqual(r.rows.filter(x=>x.noticeRevision!==null).map(x=>x.domain),['load','enclosure']);
});
test('invalid project fails closed',()=>{
 for(const p of [undefined,null,[],42,'bad'])assert.equal(run(p,bundle()).status,'BLOCKED');
});
test('non-object evidence fails closed without touching data',()=>{
 const p=base();p.evidence=['verified'];
 const r=run(p,bundle());assert.equal(r.status,'BLOCKED');
 assert.equal(r.issues[0].code,'RESULT_FRESHNESS_EVIDENCE_INVALID');
});
test('invalid individual evidence record fails closed',()=>{
 const p=base();p.evidence.load='verified';
 const r=run(p,bundle());assert.equal(r.status,'BLOCKED');
 assert.equal(r.issues[0].code,'RESULT_FRESHNESS_EVIDENCE_ENTRY_INVALID');
});
test('tampered persisted review notice fails closed',()=>{
 const p=base();p.designReviewNoticeV1={revision:7,approved:true};
 const r=run(p,bundle());assert.equal(r.status,'BLOCKED');
 assert.equal(r.issues[0].code,'RESULT_FRESHNESS_NOTICE_INVALID');
});
test('missing normalizer does not convert invalid records into valid records',()=>{
 const old=global.epDesignReviewNoticeNormalizeV1;
 try{delete global.epDesignReviewNoticeNormalizeV1;
  const r=run(base(),bundle());
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.issues[0].code,'RESULT_FRESHNESS_NOTICE_ENGINE_MISSING');
 }finally{global.epDesignReviewNoticeNormalizeV1=old;}
});
test('section statuses come from actual current bundle, not saved status',()=>{
 const p=project('topology');p.designReviewNoticeV1=notice(['topology']);
 const r=run(p,bundle());
 const line=r.rows[4].reportSections.find(x=>x.section==='singleLine');
 assert.equal(line.status,'UNKNOWN');
 assert.equal(line.issueCount,1);
});
test('missing section remains UNAVAILABLE without fabricating a calculation result',()=>{
 const r=run(base(),{sections:{}});
 const line=r.rows[0].reportSections.find(x=>x.section==='loadCurrent');
 assert.equal(line.status,'UNAVAILABLE');
 assert.equal(line.issueCount,null);
});
test('errors in a present engineering section remain visible',()=>{
 const r=run(base(),bundle());
 assert.equal(r.rows[5].reportSections.find(x=>x.section==='board').status,'BLOCKED');
 assert.equal(r.rows[5].reportSections.find(x=>x.section==='board').issueCount,1);
});
test('unknown section status is not reported as verified',()=>{
 const r=run(base(),{sections:{loadCurrent:{status:42,issues:[{}]}}});
 assert.equal(r.rows[0].reportSections[0].status,'UNAVAILABLE');
 assert.equal(r.rows[0].reportSections[0].issueCount,1);
});
test('evidence source and method survive without mutation',()=>{
 const p=project('network');p.evidence.network.method='calculated source impedance';
 const snap=JSON.stringify(p);
 const r=run(p,bundle());
 assert.equal(r.rows[1].source,'engineer');
 assert.equal(r.rows[1].method,'calculated source impedance');
 assert.equal(JSON.stringify(p),snap);
});
test('foreign input fields do not become approval flags',()=>{
 const p=project('load');p.evidence.load.installationApproved=true;
 const r=run(p,bundle());
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.rows[0].engineeringApproved,undefined);
});
test('CSV contains all six domains and the calculation section status',()=>{
 const r=run(base(),bundle());const c=csv(r);
 assert.equal(c.charCodeAt(0),0xFEFF);
 for(const d of domains)assert.match(c,new RegExp('"'+d+'"'));
 assert.match(c,/NOT_DOCUMENTED/);
 assert.match(c,/singleLine/);
 assert.match(c,/BLOCKED/);
});
test('CSV neutralizes formulas in evidence provenance',()=>{
 const p=project('load');p.evidence.load.source='=HYPERLINK(1)';
 p.evidence.load.method='+SUM(1,2)';
 const c=csv(run(p,bundle()));
 assert.match(c,/"'=HYPERLINK\(1\)"/);
 assert.match(c,/"'\+SUM\(1,2\)"/);
});
test('CSV has stable header even when audit is blocked',()=>{
 const p=base();p.designReviewNoticeV1={bad:1};
 const c=csv(run(p,bundle()));
 assert.match(c,/engineering_approved/);
 assert.equal(c.split('\r\n').length,2);
});
test('HTML shows pending instead of falsely fresh after saved change',()=>{
 const p=project('load');p.designReviewNoticeV1=notice();
 const h=html(run(p,bundle()));
 assert.match(h,/PENDING_REVIEW/);
 assert.match(h,/не подтверждение соответствия нормам/);
 assert.doesNotMatch(h,/class="ep-approved"/);
});
test('HTML escapes untrusted labels and provenance',()=>{
 const p=project('network');p.evidence.network.source='<script>alert(1)</script>';
 const h=html(run(p,bundle()));
 assert.doesNotMatch(h,/<script>/);
 assert.match(h,/&lt;script&gt;/);
});
test('HTML and CSV refuse to assert success on malformed data',()=>{
 const p=base();p.evidence.load=7;
 assert.match(html(run(p,bundle())),/недоступна/);
 assert.match(csv(run(p,bundle())),/domain/);
});
test('rendering never changes engineering source records',()=>{
 const p=project('device');const b=bundle();
 const before=JSON.stringify({p,b});html(run(p,b));csv(run(p,b));
 assert.equal(JSON.stringify({p,b}),before);
});
test('scope includes six areas and calculations from real app modules',()=>{
 assert.deepEqual(Object.keys(sections),domains);
 assert.ok(sections.topology.includes('singleLine'));
 assert.ok(sections.enclosure.includes('bom'));
 assert.ok(sections.load.includes('loadCurrent'));
});
test('integration includes module and an engineer-facing CSV control',()=>{
 const index=root('index.html');
 assert.ok(index.indexOf('design-result-freshness-v1.js')>index.indexOf('design-review-actions-v1.js'));
 assert.ok(index.indexOf('design-result-freshness-v1.js')<index.indexOf('app.js'));
 const app=root('app.js'),bund=root('engineering-bundle-v1.js');
 assert.match(app,/id="exportResultFreshnessCsvBtn"/);
 assert.match(app,/epDesignResultFreshnessCsvV1\(report\)/);
 assert.match(bund,/sections.resultFreshness=section/);
});
test('printed project dossier includes current, stale and pending state',()=>{
 const p=project('load');p.designReviewNoticeV1=notice();
 const r=run(p,bundle());
 const out=print({projectTitle:'Retail',sections:{resultFreshness:r},overallStatus:'UNKNOWN'});
 assert.match(out,/Актуальность расчётных результатов/);
 assert.match(out,/PENDING_REVIEW/);
 assert.match(out,/НЕ ДЛЯ МОНТАЖА/);
});
test('printed project dossier escapes hostile provenance',()=>{
 const p=project('load');p.evidence.load.source='<img src=x>';
 const r=run(p,bundle());
 const out=print({sections:{resultFreshness:r},overallStatus:'UNKNOWN'});
 assert.doesNotMatch(out,/<img src=x>/);
 assert.match(out,/&lt;img/);
});
test('no automatic changes to manual engineering decisions',()=>{
 const p=project('load');p.evidence.load={status:'verified',source:'manual',stale:true};
 const before=JSON.stringify(p);run(p,bundle());
 assert.equal(JSON.stringify(p),before);
});

test('a previously linked current marked stale is highlighted even without evidence record',()=>{
 const p=base();p.lines[0].overloadInput={ibA:8.696};
 p.lines[0].loadCurrentCalculation={powerSource:'circuit',roundedIbA:8.696,
  inputs:{powerKw:2},stale:true};
 const r=run(p,bundle());
 assert.equal(r.rows[0].status,'STALE');
 assert.equal(r.rows[0].staleCircuits[0].code,'LINKED_IB_STALE');
 assert.equal(r.rows[3].status,'STALE','protection depends on load current');
 assert.equal(r.status,'BLOCKED');
});
test('overridden linked current is identified and manual Ib is never overwritten',()=>{
 const p=base();p.lines[0].overloadInput={ibA:10.5};
 p.lines[0].loadCurrentCalculation={powerSource:'circuit',roundedIbA:8.696,
  inputs:{powerKw:2}};
 const before=JSON.stringify(p),r=run(p,bundle());
 assert.equal(r.rows[0].staleCircuits[0].code,'LINKED_IB_OVERRIDDEN_OR_MISSING');
 assert.equal(JSON.stringify(p),before);
});
test('changing linked circuit power makes current evidence stale',()=>{
 const p=base();p.lines[0].overloadInput={ibA:8.696};
 p.lines[0].loadCurrentCalculation={powerSource:'circuit',roundedIbA:8.696,
  inputs:{powerKw:1.5}};
 const r=run(p,bundle());
 assert.equal(r.rows[0].status,'STALE');
 assert.equal(r.rows[0].staleCircuits[0].code,'LINKED_POWER_CHANGED');
});
test('matching linked Ib is not falsely declared stale',()=>{
 const p=base();p.lines[0].overloadInput={ibA:8.696};
 p.lines[0].loadCurrentCalculation={powerSource:'circuit',roundedIbA:8.696,
  inputs:{powerKw:2}};
 const r=run(p,bundle());
 assert.equal(r.rows[0].staleCircuits.length,0);
 assert.equal(r.rows[0].status,'NOT_DOCUMENTED');
});
test('engineer-entered manual Ib is outside the linked-current freshness gate',()=>{
 const p=base();p.lines[0].overloadInput={ibA:13};
 p.lines[0].loadCurrentCalculation={powerSource:'manual',roundedIbA:9,
  inputs:{powerKw:1}};
 const r=run(p,bundle());
 assert.equal(r.rows[0].staleCircuits.length,0);
 assert.equal(r.rows[0].status,'NOT_DOCUMENTED');
});
test('missing linked overload input remains stale rather than silently inferred',()=>{
 const p=base();p.lines[0].loadCurrentCalculation={powerSource:'circuit',
  roundedIbA:9,inputs:{powerKw:2}};
 const r=run(p,bundle());
 assert.equal(r.rows[0].status,'STALE');
 assert.equal(r.rows[0].staleCircuits[0].code,'LINKED_IB_OVERRIDDEN_OR_MISSING');
});
test('explicit live section blocker outranks declared verified status',()=>{
 const p=project('enclosure','verified');
 const r=run(p,bundle());
 assert.equal(r.rows[5].status,'PENDING_REVIEW');
 assert.equal(r.rows[5].liveBlocked,true);
 assert.equal(r.summary.declared,0);
});
test('unrelated blocked section does not invalidate verified load evidence',()=>{
 const p=project('load','verified');
 const r=run(p,bundle());
 assert.equal(r.rows[0].liveBlocked,false);
 assert.equal(r.rows[0].status,'DECLARED_CURRENT');
});
test('stale linked circuit identifiers are escaped when rendered',()=>{
 const p=base();p.lines[0].id='<img src=x>';
 p.lines[0].loadCurrentCalculation={powerSource:'circuit',stale:true};
 const h=html(run(p,bundle()));
 assert.match(h,/&lt;img src=x&gt;/);
 assert.doesNotMatch(h,/<img src=x>/);
});
test('per-circuit stale detection is bounded to 400 lines',()=>{
 const p=base();p.lines=Array.from({length:450},(_,i)=>({
  id:'L'+i,power:1,loadCurrentCalculation:{powerSource:'circuit',stale:true}
 }));
 const r=run(p,bundle());
 assert.equal(r.rows[0].staleCircuits.length,400);
});
