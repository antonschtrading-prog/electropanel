'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epMarkCalculationReviewV1:mark,epAcknowledgeCalculationReviewV1:ack,
 epApplyCircuitDependencyReviewV1:impact}=require('../calculation-review-v1.js');
const fields=['overloadInput','faultInput','overloadV30','lv43Input','route44Input'];
function fixture(){
 const baseLine=(id,phase)=>({id,phase,power:2,device:'B16',modules:1,catalogSku:id==='L1'?'C1':'C2',
   overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3},overloadV30:{context:'test'},
   lv43Input:{context:'test'},route44Input:{route:'test'},
   faultRouteInput:{reviewRequired:false},
   loadCurrentCalculation:{powerSource:'manual',stale:false,roundedIbA:10}});
 return {lines:[baseLine('L1','L1'),baseLine('L2','L2')],
  loads:[{id:'LD1',circuitId:'L1',powerKw:2},{id:'LD2',circuitId:'L2',powerKw:2}],
  sharedDevices:[{id:'R1',label:'RCD',templateId:'RCD_2P',catalogSku:'RCD1',
   modules:2,circuitIds:['L1']}],
  branchDevices:[{id:'BD1',circuitId:'L1',label:'B16',modules:1},
                 {id:'BD2',circuitId:'L2',label:'B16',modules:1}],
  catalogArticles:[{id:'C1',maker:'Maker',inA:16,poles:1,icnKa:6},
                   {id:'C2',maker:'Maker',inA:16,poles:1,icnKa:6}],
  earthing:'TN-S',network:{voltage:230},conductorRoutes:[],
  terminalLinks:[],feedLinks:[],groupInputLinks:[],endpointBindingsV1:[]};
}
function get(p,id='L1'){return p.lines.find(l=>l.id===id);}
test('unchanged project does not flag unrelated circuits',()=>{
 const p=fixture(),q=structuredClone(p);
 assert.equal(impact(p,q).status,'UNCHANGED');
 assert.deepEqual(impact(p,q).changedCircuits,[]);
 assert.equal(q.lines.some(l=>l.calculationReview?.required),false);
});
test("load power edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].power=3;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("load powerKw edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].powerKw=3;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("load source edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].source='manual';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("consumer addition triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.loads.push({id:'LD3',circuitId:'L1',powerKw:1});
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("consumer power correction triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.loads[0].powerKw=4;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("consumer removal triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.loads=q.loads.slice(1);
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("LOAD_SOURCE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("phase change triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].phase='3Ф';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CIRCUIT_PHASE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("earthing changed triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.earthing='TT';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("NETWORK_INPUT_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("network voltage changed triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.network.voltage=400;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("NETWORK_INPUT_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("project voltage changed triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.voltage=400;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("NETWORK_INPUT_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("cable reference edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].cableReferenceInput={installationMethod:'B'};
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CABLE_OR_ROUTE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("cable section edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].cableDesignInput={sectionMm2:4};
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CABLE_OR_ROUTE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("voltage drop edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].voltageDropDesignInput={lengthM:30};
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CABLE_OR_ROUTE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("fault route edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].faultRouteInput={lengthM:30};
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CABLE_OR_ROUTE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("conductor route update triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.conductorRoutes=[{circuitId:'L1',lengthM:30}];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("CABLE_OR_ROUTE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("branch label edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.branchDevices[0].label='C20';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("branch module edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.branchDevices[0].modules=2;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("branch template edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.branchDevices[0].templateId='RCBO';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("line catalog SKU edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].catalogSku='OTHER';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("line module edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].modules=2;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("line device name edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].device='C20';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("line template edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].templateId='B';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("used article rated current edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles[0].inA=20;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("used article breaking capacity edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles[0].icnKa=10;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("used article pole count edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles[0].poles=2;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("used article manufacturer edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles[0].maker='New';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("used article deleted triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles=[];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("PROTECTIVE_APPARATUS_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("upstream group SKU edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices[0].catalogSku='OTHER';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("UPSTREAM_DEVICE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("upstream group width edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices[0].modules=4;
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("UPSTREAM_DEVICE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("upstream group label edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices[0].label='Changed';
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("UPSTREAM_DEVICE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("upstream group members edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices[0].circuitIds.push('L2');
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("UPSTREAM_DEVICE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("upstream group removed triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices=[];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("UPSTREAM_DEVICE_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("terminal link edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.terminalLinks=[{from:'A',to:'B'}];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("TOPOLOGY_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("feed link edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.feedLinks=[{from:'A',to:'B'}];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("TOPOLOGY_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("group input link edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.groupInputLinks=[{groupId:'R1',origin:'A'}];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("TOPOLOGY_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("endpoint bindings edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.endpointBindingsV1=[{id:'A'}];
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("TOPOLOGY_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});
test("wiring model edit triggers targeted review",()=>{
 const p=fixture(),q=structuredClone(p);
 q.wiringModelV18={version:1};
 const r=impact(p,q);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.changedCircuits.some(x=>x.lineId==="L1"&&x.reasons.includes("TOPOLOGY_CHANGED")),JSON.stringify(r));
 assert.equal(get(q,"L1").calculationReview.required,true);
 assert.equal(q.engineeringApproved,undefined);
});

test('unrelated article addition does not invalidate existing calculations',()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles.push({id:'NEW',inA:25});
 assert.equal(impact(p,q).status,'UNCHANGED');
});
test('manual alteration of entered Ib is not treated as upstream project change',()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].overloadInput.ibA=11;
 assert.equal(impact(p,q).status,'UNCHANGED');
});
test('manual layout move does not invalidate electrical calculations',()=>{
 const p=fixture(),q=structuredClone(p);
 q.manualLayoutV1=[{deviceId:'BD1',railIndex:0,startModule:3}];
 assert.equal(impact(p,q).status,'UNCHANGED');
});
test('circuit rename does not invalidate electrical calculations',()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].name='Kitchen';
 assert.equal(impact(p,q).status,'UNCHANGED');
});
test('circuit reorder does not invalidate electrical calculations',()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines.reverse();
 assert.equal(impact(p,q).status,'UNCHANGED');
});
test('newly added circuit has no false historical calculation evidence',()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines.push({...structuredClone(p.lines[0]),id:'L3',calculationReview:undefined});
 const r=impact(p,q);assert.equal(r.status,'UNCHANGED');
 assert.equal(get(q,'L3').calculationReview,undefined);
});
test('consumer load edit invalidates only its assigned circuit',()=>{
 const p=fixture(),q=structuredClone(p);
 q.loads[0].powerKw=3;
 const r=impact(p,q);
 assert.deepEqual(r.changedCircuits.map(x=>x.lineId),['L1']);
 assert.equal(get(q,'L2').calculationReview,undefined);
 assert.equal(get(q,'L1').loadCurrentCalculation.stale,true);
 assert.equal(get(q,'L1').faultRouteInput.reviewRequired,false);
});
test('device article change does not invalidate arithmetic for unchanged load',()=>{
 const p=fixture(),q=structuredClone(p);
 q.catalogArticles[0].inA=20;
 impact(p,q);
 assert.equal(get(q,'L1').loadCurrentCalculation.stale,false);
 assert.equal(get(q,'L1').faultRouteInput.reviewRequired,true);
 assert.equal(get(q,'L2').calculationReview,undefined);
});
test('upstream RCD change preserves calculated load and only reopens protection',()=>{
 const p=fixture(),q=structuredClone(p);
 q.sharedDevices[0].label='New RCD';
 impact(p,q);
 assert.equal(get(q,'L1').loadCurrentCalculation.stale,false);
 assert.equal(get(q,'L1').faultRouteInput.reviewRequired,true);
 assert.equal(get(q,'L2').calculationReview,undefined);
});
test('network changes reopen route evidence but leave arithmetic Ib intact',()=>{
 const p=fixture(),q=structuredClone(p);
 q.earthing='TT';impact(p,q);
 for(const line of q.lines){
  assert.equal(line.loadCurrentCalculation.stale,false);
  assert.equal(line.faultRouteInput.reviewRequired,true);
 }
});
test('all pending fields survive multiple change categories',()=>{
 const p=fixture(),q=structuredClone(p);
 q.lines[0].calculationReview={required:true,pending:['faultInput'],reason:'OLD'};
 q.lines[0].power=3;q.lines[0].device='C20';
 impact(p,q);
 assert.deepEqual(new Set(get(q,'L1').calculationReview.pending),new Set(fields));
});
test('one acknowledged field never removes a different pending field',()=>{
 const line={overloadInput:{ibA:12},faultInput:{ikKa:3}};
 mark(line,'APPARATUS_CHANGED');
 assert.equal(ack(line,'overloadInput'),true);
 assert.deepEqual(line.calculationReview.pending,['faultInput']);
 assert.equal(line.calculationReview.required,true);
});
test('last acknowledged pending field clears review only after explicit acknowledgement',()=>{
 const line={overloadInput:{ibA:12}};
 mark(line,'APPARATUS_CHANGED');
 assert.equal(ack(line,'overloadInput'),true);
 assert.equal(line.calculationReview,undefined);
});
test('acknowledging an unrelated field cannot erase required review',()=>{
 const line={faultInput:{ikKa:3}};
 mark(line,'NETWORK_CHANGED');
 assert.equal(ack(line,'overloadInput'),false);
 assert.deepEqual(line.calculationReview.pending,['faultInput']);
});
test('unknown or crafted review field cannot be acknowledged',()=>{
 const line={overloadInput:{ibA:12}};
 mark(line,'DEVICE_CHANGED');
 assert.equal(ack(line,'__proto__'),false);
 assert.equal(ack(line,'constructor'),false);
 assert.equal(line.calculationReview.required,true);
});
test('mark rejects unsafe unknown fields instead of persisting them',()=>{
 const line={faultInput:{ikKa:3},hacker:{test:true}};
 mark(line,'NETWORK_CHANGED',['hacker','faultInput']);
 assert.deepEqual(line.calculationReview.pending,['faultInput']);
});
test('unverified saved review without pending array gets pending fields on update',()=>{
 const line={faultInput:{ikKa:3},calculationReview:{required:true,reason:'OLD'}};
 mark(line,'NEW',['faultInput']);
 assert.deepEqual(line.calculationReview.pending,['faultInput']);
});
test('force creates explicit pending review even when inputs are missing',()=>{
 const line={id:'L1'};
 assert.equal(mark(line,'LOAD_CHANGED',['overloadInput'],true).required,true);
 assert.deepEqual(line.calculationReview.pending,[]);
});
test('unforced marker does not create phantom input review',()=>{
 const line={id:'L1'};
 assert.equal(mark(line,'LOAD_CHANGED',['overloadInput'],false),null);
 assert.equal(line.calculationReview,undefined);
});
test('same prior review is stable under idempotent marking',()=>{
 const line={faultInput:{ikKa:3}};
 mark(line,'OLD');mark(line,'NEW');mark(line,'NEW');
 assert.deepEqual(line.calculationReview.pending,['faultInput']);
 assert.equal(line.calculationReview.reason,'NEW');
});
test('previous snapshot remains untouched after dependency invalidation',()=>{
 const p=fixture(),q=structuredClone(p),before=JSON.stringify(p);
 q.loads[0].powerKw=3;impact(p,q);
 assert.equal(JSON.stringify(p),before);
});
test('invalid project inputs fail closed without throwing',()=>{
 assert.equal(impact(null,{}).status,'BLOCKED');
 assert.equal(impact({},null).issues[0].code,'CIRCUIT_DEPENDENCY_PROJECT_INVALID');
});
test('absent linked current object does not create fake stale object',()=>{
 const p=fixture(),q=structuredClone(p);delete q.lines[0].loadCurrentCalculation;
 q.lines[0].power=3;impact(p,q);
 assert.equal(q.lines[0].loadCurrentCalculation,undefined);
});
