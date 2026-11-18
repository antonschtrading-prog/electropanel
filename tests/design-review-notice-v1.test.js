'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const {epDesignReviewNoticeNormalizeV1:normalize,epDesignReviewNoticeUpdateV1:update,
 EP_REVIEW_DOMAINS_V1:domains}=require('../design-review-notice-v1.js');
const {epDesignChangeImpactV1:impact}=require('../design-change-impact-v1.js');
const p=()=>({title:'Shop',lines:[{id:'L1',power:2,phase:'L1',modules:1}],
 loads:[{id:'P1',circuitId:'L1',powerKw:2}],branchDevices:[],sharedDevices:[],
 railCount:1,railCapacity:12});
test('new load edit persists all downstream engineering areas in predictable order',()=>{
 const a=p(),b=structuredClone(a);b.lines[0].power=3;
 const next=update(null,impact(a,b));
 assert.equal(next.version,1);assert.equal(next.revision,1);
 assert.deepEqual(next.pendingDomains,['load','cable','device','topology','enclosure']);
 assert.deepEqual(next.lastChangedDomains,['load']);
});
test('later independent change accumulates pending notices without losing older review',()=>{
 const a=p(),b=structuredClone(a);b.lines[0].power=4;
 const first=update(null,impact(a,b));
 const c=structuredClone(b);c.railCapacity=18;
 const second=update(first,impact(b,c));
 assert.deepEqual(second.pendingDomains,first.pendingDomains);
 assert.deepEqual(second.lastChangedDomains,['enclosure']);
 assert.equal(second.revision,2);
 assert.equal(first.revision,1);
});
test('topology changes remain pending across unrelated revisions',()=>{
 const a=p(),b=structuredClone(a);b.terminalLinks=[{id:'X',from:'A',to:'B'}];
 const first=update(null,impact(a,b));
 const c=structuredClone(b);c.title='New';
 const unchanged=update(first,impact(b,c));
 assert.deepEqual(unchanged,first);
 assert.ok(unchanged.pendingDomains.includes('topology'));
});
test('unchanged project does not create spurious persisted notices',()=>{
 const a=p(),b=structuredClone(a);
 assert.equal(update(null,impact(a,b)),null);
});
test('restored serialized warning record retains exactly the allowed fields',()=>{
 const raw=JSON.parse(JSON.stringify(update(null,{status:'REVIEW_REQUIRED',affected:['device','enclosure'],changed:['device']})));
 assert.deepEqual(normalize(raw),raw);
});
test('pending array order is canonical after a safe import',()=>{
 const raw={version:1,revision:9,pendingDomains:['enclosure','device'],lastChangedDomains:['device']};
 assert.deepEqual(normalize(raw).pendingDomains,['device','enclosure']);
});
test('duplicate domains in serialized project are rejected',()=>{
 assert.throws(()=>normalize({version:1,revision:1,pendingDomains:['load','load'],lastChangedDomains:[]}),/DOMAINS_INVALID/);
});
test('an unknown domain never becomes a valid recheck',()=>{
 assert.throws(()=>normalize({version:1,revision:1,pendingDomains:['securityOverride'],lastChangedDomains:[]}),/DOMAINS_INVALID/);
});
test('an imported approval flag cannot be smuggled into a review notice',()=>{
 assert.throws(()=>normalize({version:1,revision:1,pendingDomains:['load'],lastChangedDomains:[],engineeringApproved:true}),/NOTICE_INVALID/);
});
test('invalid revision or version fail closed',()=>{
 for(const revision of [0,-1,1.5,Infinity,1e12]){
  assert.throws(()=>normalize({version:1,revision,pendingDomains:['load'],lastChangedDomains:[]}));
 }
 assert.throws(()=>normalize({version:2,revision:1,pendingDomains:['load'],lastChangedDomains:[]}));
});
test('invalid data types or huge arrays are rejected',()=>{
 for(const data of [false,[],{version:1,revision:1,pendingDomains:'load',lastChangedDomains:[]}]){
  assert.throws(()=>normalize(data));
 }
});
test('unknown change-impact input cannot forge an approval',()=>{
 assert.throws(()=>update(null,{status:'APPROVED',affected:['load'],changed:['load']}));
 assert.throws(()=>update(null,{status:'REVIEW_REQUIRED',affected:['fake'],changed:['load']}));
 assert.throws(()=>update(null,{status:'REVIEW_REQUIRED',affected:['load'],changed:['fake']}));
});
test('updater never mutates source record or impact',()=>{
 const old={version:1,revision:1,pendingDomains:['network','device'],lastChangedDomains:['network']};
 const event={status:'REVIEW_REQUIRED',affected:['enclosure'],changed:['enclosure']};
 const previous=JSON.stringify({old,event});update(old,event);
 assert.equal(JSON.stringify({old,event}),previous);
});
test('retained pending domains cover every known engineering area',()=>{
 const notice=normalize({version:1,revision:7,pendingDomains:[...domains],lastChangedDomains:[]});
 assert.deepEqual(notice.pendingDomains,domains);
});
test('browser loader includes the notice engine after dependency engine',()=>{
 const html=root('index.html');
 assert.ok(html.indexOf('design-change-impact-v1.js')<html.indexOf('design-review-notice-v1.js'));
 assert.ok(html.indexOf('design-review-notice-v1.js')<html.indexOf('app.js'));
});
test('project import uses explicit validation for preserved review notice',()=>{
 const source=root('project-state-v2.js');
 assert.match(source,/raw.designReviewNoticeV1!==undefined/);
 assert.match(source,/epDesignReviewNoticeNormalizeV1\(raw.designReviewNoticeV1\)/);
});
test('change handler preserves review notices and UI renders saved state',()=>{
 const source=root('app.js');
 assert.match(source,/state.designReviewNoticeV1=epDesignReviewNoticeUpdateV1/);
 assert.match(source,/epDesignReviewActionMatrixV1\(state,engineeringBundle\?\.sections\?\.issueRegister\)/);
 assert.match(source,/epDesignReviewActionMatrixHtmlV1\(report\)/);
});
test('review notice is advisory, not a new electrical approval flag',()=>{
 const a=p(),b=structuredClone(a);b.lines[0].power=5;
 const saved=update(null,impact(a,b));
 assert.equal(saved.engineeringApproved,undefined);
 assert.equal(saved.ready_for_installation,undefined);
});
