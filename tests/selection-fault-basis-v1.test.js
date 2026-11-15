'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const fault=require('../fault-route-design-v2.js');
const {epSelectionFaultBasisV1:study}=require('../selection-fault-basis-v1.js');
const {epProtectiveDeviceShortlistV1:shortlist}=require('../protective-device-shortlist-v1.js');
const {epProtectiveCandidateRankingV1:rank}=require('../protective-candidate-ranking-v1.js');
const {epProtectionWorkbenchV1:work,epProtectionWorkbenchHtmlV1:html}=require('../protection-workbench-v1.js');
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
global.epSelectionFaultBasisV1=study;global.epProtectiveDeviceShortlistV1=shortlist;
global.epProtectiveCandidateRankingV1=rank;
const lookup=k=>EP_CATALOG[k]||null;
const catalog=()=>Object.entries(EP_CATALOG).map(([id,device])=>({id,device}));
function project(){
 return {earthing:'TN-S',lines:[{id:'L1',phase:'L1',
  catalogSku:'SE-A9F74116',modules:1,device:'iC60N C16',
  overloadInput:{ibA:10,izA:20},
  faultInput:{ikKa:2,voltageV:230},
  maximumFaultInput:{model:'SINGLE_PHASE_L_N',
   sourceModel:'DECLARED_RX',comparisonPoint:'PANEL-OUT-L1',
   u0V:230,cmax:1.1,sourceROhm:0.033,sourceXOhm:0.008,
   networkSource:'engineer-declared grid R/X at point',
   segments:[{lengthM:20,phaseROhmKm:0.05,neutralROhmKm:0.05,
    phaseXOhmKm:0.02,neutralXOhmKm:0.02,
    source:'engineer-sourced cable R/X',temperatureBasisConfirmed:true}]}}]};
}
test('computed same-point maximum replaces manual number in candidate Icn screening',()=>{
 const p=project(),before=JSON.stringify(p),l=p.lines[0],b=study(p,l,lookup);
 assert.equal(b.mode,'CALCULATED_MAXIMUM');
 assert.ok(b.ikMaxKa>6,'fixture must genuinely exceed 6 kA');
 const w=work(p,lookup,catalog(),'L1'),selected=w.selected;
 assert.equal(selected.faultBasis.ikMaxKa,b.ikMaxKa);
 const row=selected.ranking.rows.find(r=>r.catalogKey==='SE-A9F74116');
 assert.equal(row.classification,'EXCLUDED');
 assert.equal(row.ikComparisonSource,'CALCULATED_MAXIMUM');
 assert.equal(row.ikComparedKa,b.ikMaxKa);
 assert.ok(row.blockingReasons.includes('ICN_LT_DECLARED_IK'));
 assert.equal(selected.status,'BLOCKED');
 assert.equal(JSON.stringify(p),before);
});
test('selected 6 kA breaker failure does not falsely reject a separate 10 kA alternative',()=>{
 const p=project(),candidate={...EP_CATALOG['SE-A9F74116'],
  sku:'ALTERNATIVE-10KA',maker:'Example',icnKa:10,verificationStatus:'UNVERIFIED'};
 const entries=[{id:'SE-A9F74116',device:EP_CATALOG['SE-A9F74116']},
  {id:'CUSTOM-10KA',device:candidate}];
 const r=work(p,lookup,entries,'L1').selected.ranking.rows;
 const selected=r.find(x=>x.catalogKey==='SE-A9F74116');
 const alternative=r.find(x=>x.catalogKey==='CUSTOM-10KA');
 assert.equal(selected.classification,'EXCLUDED');
 assert.equal(alternative.classification,'PRELIMINARY_CANDIDATE');
 assert.ok(alternative.breakingHeadroomKa>0);
 assert.ok(alternative.openEvidence.includes('PRIMARY_MANUFACTURER_FACTS_INCOMPLETE'));
 assert.equal(alternative.engineeringApproved,false);
});
test('missing explicit comparison point makes maximum calculation unsuitable for ranking',()=>{
 const p=project();delete p.lines[0].maximumFaultInput.comparisonPoint;
 const result=work(p,lookup,catalog(),'L1');
 const b=result.selected.faultBasis;
 assert.equal(b.mode,'CALCULATED_UNUSABLE');
 assert.ok(b.issues.some(x=>x.code==='SELECTION_MAX_FAULT_POINT_UNDECLARED'));
 assert.equal(result.selected.ranking.rows.find(x=>x.catalogKey==='SE-A9F74116').classification,'INCOMPLETE');
 assert.equal(result.engineeringApproved,false);
});
test('a stale maximum input basis never becomes the authoritative fault current',()=>{
 const p=project();p.lines[0].maximumFaultInput.basis={phase:'OLD'};
 const b=study(p,p.lines[0],lookup);
 assert.equal(b.mode,'CALCULATED_UNUSABLE');
 assert.ok(b.issues.some(x=>x.code==='SELECTION_MAX_FAULT_BASIS_STALE'));
});
test('manual Ik understated at explicitly identical type and point is a blocking conflict',()=>{
 const p=project(),l=p.lines[0];
 l.faultInput.model='SINGLE_PHASE_L_N';
 l.faultInput.comparisonPoint='PANEL-OUT-L1';
 const b=study(p,l,lookup);
 assert.equal(b.mode,'CALCULATED_MAXIMUM');
 assert.ok(b.issues.some(x=>x.code==='SELECTION_MANUAL_IK_UNDERSTATES_SAME_POINT_MAX'&&x.level==='BLOCKED'));
 const selected=work(p,lookup,catalog(),'L1').selected;
 assert.equal(selected.status,'BLOCKED');
});
test('different manual and calculated comparison points are disclosed, not falsely reconciled',()=>{
 const p=project(),l=p.lines[0];
 l.faultInput.model='SINGLE_PHASE_L_N';l.faultInput.comparisonPoint='SOURCE-BUSBAR';
 const b=study(p,l,lookup);
 assert.equal(b.mode,'CALCULATED_MAXIMUM');
 assert.ok(b.issues.some(x=>x.code==='SELECTION_MANUAL_IK_DIFFERENT_OR_UNSCOPED_POINT'));
});
test('three-phase source does not substitute for L-N protection context',()=>{
 const p=project(),l=p.lines[0];l.phase='3Ф';
 l.catalogSku='SE-A9F74316';l.modules=3;
 l.maximumFaultInput={model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:'P-3',
  uLLV:400,cmax:1.1,sourceROhm:.05,sourceXOhm:.02,
  networkSource:'declared 3-phase grid R/X',
  segments:[{lengthM:10,r1OhmKm:.2,x1OhmKm:.03,
   source:'declared positive-sequence values',temperatureBasisConfirmed:true}]};
 const b=study(p,l,lookup);
 assert.equal(b.model,'THREE_PHASE_POSITIVE_SEQUENCE');
 assert.equal(b.voltageV,400);
 assert.ok(b.ikMaxKa>0);
 assert.equal(b.engineeringApproved,false);
});
test('invalid maximum impedance never yields a usable calculated candidate',()=>{
 const p=project();p.lines[0].maximumFaultInput.sourceROhm=-5;
 const b=study(p,p.lines[0],lookup);
 assert.equal(b.mode,'CALCULATED_UNUSABLE');
 assert.ok(b.issues.some(x=>x.level==='BLOCKED'));
});
test('workbench markup discloses fault model, precise point and source without mutating project',()=>{
 const p=project(),before=JSON.stringify(p),r=work(p,lookup,catalog(),'L1');
 const h=html(r);
 assert.match(h,/PANEL-OUT-L1/);
 assert.match(h,/CALCULATED_MAXIMUM/);
 assert.match(h,/Основание сравнения Icn/);
 assert.equal(JSON.stringify(p),before);
});
