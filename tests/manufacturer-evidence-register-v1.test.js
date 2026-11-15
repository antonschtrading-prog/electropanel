'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epManufacturerEvidenceRegisterV1:audit,
 epLetThroughEvidenceBindingV1:bind,
 epAddManufacturerEvidenceRecordV1:add}=require('../manufacturer-evidence-register-v1.js');
const {epBreakerLetThroughV1:calc}=require('../breaker-let-through-v1.js');
const {epManufacturerEvidenceHtmlV1:ui}=require('../manufacturer-evidence-ui-v1.js');
const article=()=>({sku:'A9F73110',maker:'Schneider Electric',
 series:'Acti9',kind:'MCB',inA:10,poles:1,
 icnVoltageV:230,icnStandard:'IEC/EN 60898-1',verificationStatus:'UNVERIFIED'});
const bands=()=>[{minProspectiveA:1000,maxProspectiveA:6000,maxLetThroughA2s:200000}];
const input=()=>({catalogKey:'SE-A9F73110',articleSku:'A9F73110',
 articleInA:10,deviceStandard:'IEC/EN 60898-1',
 testVoltageV:230,testFrequencyHz:50,applicationVoltageV:230,
 applicationFrequencyHz:50,protectionPoles:1,
 faultModel:'SINGLE_PHASE_L_N',comparisonPoint:'L1-END',
 currentBasis:'DECLARED_SCENARIO',prospectiveCurrentA:3000,
 prospectiveSource:'calculated independent network study',
 conductorRole:'PHASE',conductorMaterial:'Cu',
 sectionMm2:6,kA_SqrtS_PerMm2:115,
 manufacturerSource:'manufacturer upper I2t documentation',
 testConditionSource:'datasheet scope',cableSource:'Cu cable source',
 kSource:'k coefficient referenced',manufacturerEnvelopeConfirmed:true,
 conductorApplicationReviewed:true,temperatureBasisConfirmed:true,
 bands:bands().map(x=>({...x,source:'manufacturer curve, page 5'}))});
const record=()=>({id:'DOC-1',kind:'LET_THROUGH_I2T',catalogKey:'SE-A9F73110',
 manufacturerSku:'A9F73110',manufacturerName:'Schneider Electric',
 series:'Acti9',documentTitle:'manufacturer let-through graph',
 documentUrl:'https://example.org/manual.pdf',documentRevision:'edition 1',
 documentLocation:'page 5, graph 2',reviewedAt:'2026-11-15',
 reviewedBy:'engineer',sourceType:'MANUFACTURER_DOCUMENT',
 documentChecked:true,scope:{deviceStandard:'IEC/EN 60898-1',nominalCurrentA:10,
 poles:1,testVoltageV:230,testFrequencyHz:50,
 faultModel:'SINGLE_PHASE_L_N'},bands:bands()});
const project=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',
 catalogSku:'SE-A9F73110',cableDesignInput:{sectionMm2:6,material:'Cu'},
 letThroughInput:input()}]});
test('creating document record is atomic and source-indexed, no automatic approval',()=>{
 const p=project(),before=JSON.stringify(p),r=add(p,record());
 assert.ok(r.project);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.project.manufacturerEvidenceRecords.length,1);
 assert.equal(r.report.engineeringApproved,false);
 assert.equal(r.report.status,'UNKNOWN');
 assert.equal(r.project.manufacturerEvidenceRecords[0].documentLocation,'page 5, graph 2');
});
test('exact document scope and current band bind to calculation without certifying it',()=>{
 const p=project();p.manufacturerEvidenceRecords=[record()];
 p.lines[0].letThroughInput.evidenceRecordId='DOC-1';
 global.epLetThroughEvidenceBindingV1=bind;
 global.epManufacturerEvidenceRegisterV1=audit;
 const direct=bind(p,p.lines[0],article(),p.lines[0].letThroughInput);
 assert.equal(direct.matched,true);
 assert.equal(direct.issues.length,0);
 const result=calc(p,p.lines[0],article());
 assert.equal(result.numericalStatus,'PRELIMINARY_PASS');
 assert.equal(result.evidenceBinding.matched,true);
 assert.equal(result.engineeringApproved,false);
});
test('unlinked evidence is transparent and never treated as manufacturer verification',()=>{
 const p=project();
 const r=bind(p,p.lines[0],article(),p.lines[0].letThroughInput);
 assert.equal(r.matched,false);
 assert.ok(r.issues.some(i=>i.code==='LET_THROUGH_EVIDENCE_RECORD_UNLINKED'));
});
test('tampering with linked graph scope or intervals blocks source association',()=>{
 for(const edit of [
  p=>p.lines[0].letThroughInput.bands[0].maxLetThroughA2s=999999,
  p=>p.lines[0].letThroughInput.testFrequencyHz=60,
  p=>p.manufacturerEvidenceRecords[0].manufacturerSku='OTHER',
  p=>p.lines[0].catalogSku='OTHER',
  p=>p.lines[0].letThroughInput.faultModel='THREE_PHASE_POSITIVE_SEQUENCE'
 ]){
  const p=project();p.manufacturerEvidenceRecords=[record()];
  p.lines[0].letThroughInput.evidenceRecordId='DOC-1';
  edit(p);
  const b=bind(p,p.lines[0],article(),p.lines[0].letThroughInput);
  assert.equal(b.status,'BLOCKED');
  assert.equal(b.matched,false);
 }
});
test('invalid URL, date, overlapping bands and duplicate IDs cannot be appended',()=>{
 for(const edit of [
  r=>r.documentUrl='javascript:alert(1)',
  r=>r.reviewedAt='2026-02-30',
  r=>r.bands.push({...bands()[0]}),
  r=>r.scope.nominalCurrentA=0
 ]){
  const p=project(),r=record();edit(r);
  const out=add(p,r);
  assert.equal(out.project,null);
 }
 const p=project();p.manufacturerEvidenceRecords=[record()];
 assert.equal(add(p,record()).code,'EVIDENCE_RECORD_ALREADY_EXISTS');
});
test('reviewed third-party mirror is still not an authenticated manufacturer source',()=>{
 const p=project(),r=record();r.sourceType='THIRD_PARTY_MIRROR';
 const out=add(p,r);
 assert.ok(out.project);
 assert.ok(out.report.issues.some(i=>i.code==='EVIDENCE_MIRROR_REQUIRES_ORIGINAL'));
 assert.equal(out.report.engineeringApproved,false);
});
test('registry and linked I2t survive JSON import as declarative data only',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
 const p=project();p.manufacturerEvidenceRecords=[record()];
 p.lines[0].letThroughInput.evidenceRecordId='DOC-1';
 const draft={lines:[{id:'L1',catalogSku:'SE-A9F73110'}]};
 const ctx=vm.createContext({});ctx.raw=p;ctx.draft=draft;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','project-state-v2.js'),'utf8'),ctx);
 const restored=vm.runInContext('epRestoreProjectExtensionsV2(raw,draft)',ctx);
 assert.equal(restored.manufacturerEvidenceRecords[0].id,'DOC-1');
 assert.equal(restored.lines[0].letThroughInput.evidenceRecordId,'DOC-1');
 assert.equal(restored.manufacturerEvidenceRecords[0].engineeringApproved,undefined);
});
test('source replacement invalidates cable and device dependent project decisions',()=>{
 const {epDesignChangeImpactV1}=require('../design-change-impact-v1.js');
 const before=project(),after=structuredClone(before);
 after.manufacturerEvidenceRecords=[record()];
 const impact=epDesignChangeImpactV1(before,after);
 assert.ok(impact.changed.includes('device'));
 assert.ok(impact.affected.includes('device'));
 assert.equal(impact.engineeringApproved,false);
});
test('evidence form shows selected document requirements and HTML escapes strings',()=>{
 const p=project(),s=ui(p,'L1',()=>article());
 assert.match(s,/name="evidenceUrl"/);
 assert.match(s,/name="evidenceLocation"/);
 assert.match(s,/неизменяемая/);
 assert.match(s,/A9F73110/);
 p.lines[0].letThroughInput.evidenceRecordId='<svg onload=alert(1)>';
 const html=ui(p,'L1',()=>article());
 assert.doesNotMatch(html,/<svg /);
 assert.match(html,/&lt;svg /);
});
