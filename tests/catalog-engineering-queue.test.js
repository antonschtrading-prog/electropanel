'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCircuitDesignReviewV1}=require('../circuit-design-review-v1.js');
global.epCircuitDesignReviewV1=epCircuitDesignReviewV1;
const {epDesignWorkQueueV1,epDesignWorkQueueHtmlV1}=require('../design-work-queue-v1.js');
function fixture(){
 const p={lines:[{id:'L1',name:'Circuit',phase:'L1',device:'B16',modules:1,catalogSku:'SKU1',
  overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3}}],branchDevices:[{id:'BD1',circuitId:'L1',modules:1,label:'B16'}]};
 const articles={SKU1:{kind:'MCB',label:'B16',maker:'Demo',series:'S',sku:'M-B16',
  poles:1,modules:1,inA:16,icnKa:6,verificationStatus:'VERIFIED'}};
 return {p,articles};
}
test('consistent catalogue circuit has no catalogue discrepancy',()=>{
 const {p,articles}=fixture();const review=epCircuitDesignReviewV1(p,id=>articles[id]||null);
 assert.equal(review.rows[0].current,'PASS');
 assert.equal(review.rows[0].cable,'PASS');
 assert.equal(review.rows[0].breaking,'PASS');
 assert.equal(review.issues.filter(x=>x.code.startsWith('CATALOG_')).length,0);
});
test("no catalogue selection is an unknown rather than an accepted protection",()=>{
 const {p,articles}=fixture();let badLookup=false;
 delete p.lines[0].catalogSku;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_ARTICLE_MISSING"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
});
test("unresolved selected SKU is blocking",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].catalogSku='BAD';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_ARTICLE_UNKNOWN"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_ARTICLE_UNKNOWN"),JSON.stringify(queue.items));
});
test("lookup failure is blocking",()=>{
 const {p,articles}=fixture();let badLookup=false;
 badLookup=true;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_LOOKUP_FAILED"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_LOOKUP_FAILED"),JSON.stringify(queue.items));
});
test("RCD is not a branch breaker",()=>{
 const {p,articles}=fixture();let badLookup=false;
 articles.SKU1.kind='RCD';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_PROTECTION_KIND_UNSUPPORTED"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_PROTECTION_KIND_UNSUPPORTED"),JSON.stringify(queue.items));
});
test("relay is not a branch breaker",()=>{
 const {p,articles}=fixture();let badLookup=false;
 articles.SKU1.kind='RELAY';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_PROTECTION_KIND_UNSUPPORTED"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_PROTECTION_KIND_UNSUPPORTED"),JSON.stringify(queue.items));
});
test("RCBO is accepted as branch protection",()=>{
 const {p,articles}=fixture();let badLookup=false;
 articles.SKU1.kind='RCBO';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.equal(row.reasons.some(x=>x.code==='CATALOG_PROTECTION_KIND_UNSUPPORTED'||x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("single phase two pole SKU is flagged",()=>{
 const {p,articles}=fixture();let badLookup=false;
 articles.SKU1.poles=2;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_PHASE_POLES_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_PHASE_POLES_MISMATCH"),JSON.stringify(queue.items));
});
test("three phase one pole SKU is flagged",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].phase='3Ф';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_PHASE_POLES_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_PHASE_POLES_MISMATCH"),JSON.stringify(queue.items));
});
test("three phase four pole SKU accepted",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].phase='3Ф';articles.SKU1.poles=4;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.equal(row.reasons.some(x=>x.code==='CATALOG_PROTECTION_KIND_UNSUPPORTED'||x.code==='CATALOG_PHASE_POLES_MISMATCH'),false);
});
test("line module count stale",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].modules=2;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_MODULES_STALE"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_MODULES_STALE"),JSON.stringify(queue.items));
});
test("line device label stale",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].device='C25';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_LABEL_STALE"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_LABEL_STALE"),JSON.stringify(queue.items));
});
test("branch module count stale",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.branchDevices[0].modules=2;
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_BRANCH_MODULES_STALE"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_BRANCH_MODULES_STALE"),JSON.stringify(queue.items));
});
test("branch label stale",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.branchDevices[0].label='C25';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_BRANCH_LABEL_STALE"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_BRANCH_LABEL_STALE"),JSON.stringify(queue.items));
});
test("duplicate branch device detected",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.branchDevices.push({...p.branchDevices[0],id:'BD2'});
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_BRANCH_DUPLICATED"&&x.level==="BLOCKED"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_BRANCH_DUPLICATED"),JSON.stringify(queue.items));
});
test("unverified data generates evidence task",()=>{
 const {p,articles}=fixture();let badLookup=false;
 articles.SKU1.verificationStatus='UNVERIFIED';
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CATALOG_EVIDENCE_NOT_VERIFIED"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CATALOG_EVIDENCE_NOT_VERIFIED"),JSON.stringify(queue.items));
});
test("stale load calculation flagged",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].loadCurrentCalculation={stale:true};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="LOAD_CURRENT_STALE"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="LOAD_CURRENT_STALE"),JSON.stringify(queue.items));
});
test("overload review remains actionable",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['overloadInput']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_overloadInput"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CALCULATION_REVIEW_overloadInput"),JSON.stringify(queue.items));
});
test("fault review remains actionable",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['faultInput']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_faultInput"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CALCULATION_REVIEW_faultInput"),JSON.stringify(queue.items));
});
test("overloadV30 review remains actionable",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['overloadV30']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_overloadV30"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CALCULATION_REVIEW_overloadV30"),JSON.stringify(queue.items));
});
test("lv43 review remains actionable",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['lv43Input']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_lv43Input"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CALCULATION_REVIEW_lv43Input"),JSON.stringify(queue.items));
});
test("fault route review remains actionable",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['route44Input']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_route44Input"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="CALCULATION_REVIEW_route44Input"),JSON.stringify(queue.items));
});
test("no review fields falls back to general task",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:[]};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_REQUIRED"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="REVIEW_REQUIRED"),JSON.stringify(queue.items));
});
test("invalid unrecognised review field cannot fabricate a task",()=>{
 const {p,articles}=fixture();let badLookup=false;
 p.lines[0].calculationReview={required:true,pending:['<script>']};
 const lookup=id=>{if(badLookup)throw Error('offline');return articles[id]||null;};
 const review=epCircuitDesignReviewV1(p,lookup);const row=review.rows[0];
 assert.ok(row.reasons.some(x=>x.code==="CALCULATION_REVIEW_REQUIRED"&&x.level==="UNKNOWN"),JSON.stringify(row.reasons));
 const queue=epDesignWorkQueueV1(p,lookup);assert.ok(queue.items.some(x=>x.code==="REVIEW_REQUIRED"),JSON.stringify(queue.items));
});

test('catalogue blocking tasks appear before unverified evidence and review tasks',()=>{
 const {p,articles}=fixture();articles.SKU1.kind='RCD';articles.SKU1.verificationStatus='UNVERIFIED';
 p.lines[0].calculationReview={required:true,pending:['faultInput']};
 const queue=epDesignWorkQueueV1(p,id=>articles[id]);
 const kinds=queue.items.filter(x=>x.code.startsWith('CATALOG_')||x.code.startsWith('CALCULATION_REVIEW_'));
 assert.deepEqual(kinds.map(x=>x.priority),[1,2,3]);
 assert.equal(queue.engineeringApproved,false);
});
test('work queue escapes circuit ID and task text in HTML',()=>{
 const html=epDesignWorkQueueHtmlV1({items:[{lineId:'<svg onload=alert(1)>',priority:1,code:'X',
   action:'<button>unsafe</button>',section:'catalogue'}],
   summary:{urgent:1,missing:0,review:0}},null);
 assert.doesNotMatch(html,/<svg onload=/);
 assert.match(html,/&lt;svg onload=/);
 assert.match(html,/&lt;button&gt;unsafe/);
});
