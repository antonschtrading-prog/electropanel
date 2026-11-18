'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('function removeLine(id){');
const end=source.indexOf('\nfunction safeText(',start);
assert.ok(start>=0&&end>start);
const deletion=source.slice(start,end);
function run(overrides={}){
 const state={
  lines:[{id:'L1'},{id:'L2'}],loads:[],conductorRoutes:[],terminalLinks:[],feedLinks:[],
  sharedDevices:[],groupInputLinks:[],branchDevices:[{id:'Q1',circuitId:'L1'},{id:'Q2',circuitId:'L2'}],
  deviceCoordinationEvidenceV1:[{from:'BRANCH:Q1',to:'BRANCH:Q2'},{from:'BRANCH:Q2',to:'BRANCH:Q1'},{from:'BRANCH:Q2',to:'OTHER'}],
  ...overrides
 };
 const checkpoints=[];let changes=0;
 const ctx={state,selectedLine:null,checkpoint:()=>checkpoints.push(JSON.stringify(state)),
  changed:()=>{changes++},ensureV2:()=>{},epFireControlCircuitDeleteV1:undefined};
 vm.createContext(ctx);vm.runInContext(deletion+'\nthis.removeLine=removeLine;',ctx);
 return {ctx,state,checkpoints,changes:()=>changes,remove:id=>ctx.removeLine(id)};
}
test('deletion clears coordination evidence even without fault scenarios',()=>{
 const x=run();assert.equal(x.remove('L1'),true);
 assert.equal(x.state.deviceCoordinationEvidenceV1.length,1);
 assert.equal(x.state.deviceCoordinationEvidenceV1[0].from,'BRANCH:Q2');
 assert.equal(x.state.deviceCoordinationEvidenceV1[0].to,'OTHER');
 assert.equal(x.checkpoints.length,1);
});
test('deletion tolerates incomplete supply object without links',()=>{
 const x=run({deviceSupplyV1:{version:1}});
 assert.doesNotThrow(()=>x.remove('L1'));
 assert.equal(x.state.lines.length,1);
});
test('deletion removes only affected supply links and retains other links',()=>{
 const x=run({deviceSupplyV1:{links:[{from:'BRANCH:Q1',to:'BUS'},{from:'BUS',to:'BRANCH:Q1'},{from:'BRANCH:Q2',to:'BUS'}]}});
 x.remove('L1');assert.equal(x.state.deviceSupplyV1.links.length,1);
 assert.equal(x.state.deviceSupplyV1.links[0].from,'BRANCH:Q2');
});
test('deletion clears fault scenarios without requiring coordination evidence',()=>{
 const x=run({deviceCoordinationEvidenceV1:undefined,deviceFaultScenariosV1:[{deviceNodeId:'BRANCH:Q1'},{deviceNodeId:'BRANCH:Q2'}]});
 x.remove('L1');assert.equal(x.state.deviceFaultScenariosV1.length,1);
 assert.equal(x.state.deviceFaultScenariosV1[0].deviceNodeId,'BRANCH:Q2');
});
test('deleting nonexistent circuit is a no-op without history entry',()=>{
 const x=run();const before=JSON.stringify(x.state);
 assert.equal(x.remove('MISSING'),false);
 assert.equal(JSON.stringify(x.state),before);
 assert.equal(x.checkpoints.length,0);assert.equal(x.changes(),0);
});
test('history snapshot retains coordination links before cleanup',()=>{
 const x=run();x.remove('L1');
 const old=JSON.parse(x.checkpoints[0]);
 assert.equal(old.deviceCoordinationEvidenceV1.length,3);
 assert.equal(x.state.deviceCoordinationEvidenceV1.length,1);
});
test('deletion tolerates missing branch device without inventing node IDs',()=>{
 const x=run({branchDevices:[{id:'Q2',circuitId:'L2'}]});
 const old=JSON.stringify(x.state.deviceCoordinationEvidenceV1);
 assert.doesNotThrow(()=>x.remove('L1'));
 assert.equal(JSON.stringify(x.state.deviceCoordinationEvidenceV1),old);
});

test('deletion clears only fault-current bindings of the removed branch',()=>{
 const x=run({calculatedDeviceFaultBindingsV1:[{deviceNodeId:'BRANCH:Q1'},{deviceNodeId:'BRANCH:Q2'}]});
 x.remove('L1');assert.equal(x.state.calculatedDeviceFaultBindingsV1.length,1);
 assert.equal(x.state.calculatedDeviceFaultBindingsV1[0].deviceNodeId,'BRANCH:Q2');
});
test('missing branch device leaves unrelated fault-current bindings intact',()=>{
 const x=run({branchDevices:[{id:'Q2',circuitId:'L2'}],
  calculatedDeviceFaultBindingsV1:[{deviceNodeId:'BRANCH:undefined'},{deviceNodeId:'BRANCH:Q2'}]});
 x.remove('L1');assert.equal(x.state.calculatedDeviceFaultBindingsV1.length,2);
});
test('deletion preserves undo snapshot before fire-control dependency cleanup',()=>{
 const x=run({fireControlScenariosV1:[{id:'F1',circuitId:'L1'}]});
 x.ctx.epFireControlCircuitDeleteV1=(state,id)=>{state.fireControlScenariosV1=state.fireControlScenariosV1.filter(x=>x.circuitId!==id)};
 x.remove('L1');
 assert.equal(x.state.fireControlScenariosV1.length,0);
 assert.equal(JSON.parse(x.checkpoints[0]).fireControlScenariosV1.length,1);
});

test('deletion accepts legacy project with no loads array',()=>{const x=run({loads:undefined});assert.doesNotThrow(()=>x.remove('L1'));assert.equal(x.state.lines.length,1)});

test('deletion accepts legacy project with no conductor routes',()=>{const x=run({conductorRoutes:undefined});assert.doesNotThrow(()=>x.remove('L1'));assert.equal(x.state.lines.length,1)});

test('deletion accepts legacy project with no terminal links',()=>{const x=run({terminalLinks:undefined});assert.doesNotThrow(()=>x.remove('L1'));assert.equal(x.state.lines.length,1)});

test('deletion accepts legacy project with no feed links',()=>{const x=run({feedLinks:undefined});assert.doesNotThrow(()=>x.remove('L1'));assert.equal(x.state.lines.length,1)});

test('shared RCD keeps surviving circuit and group reference',()=>{const x=run({sharedDevices:[{id:'R1',circuitIds:['L1','L2']}],groupInputLinks:[{groupId:'R1'}]});x.remove('L1');assert.deepEqual(Array.from(x.state.sharedDevices[0].circuitIds),['L2']);assert.equal(x.state.groupInputLinks.length,1)});

test('last shared RCD member removal deletes orphan group input',()=>{const x=run({sharedDevices:[{id:'R1',circuitIds:['L1']}],groupInputLinks:[{groupId:'R1'},{groupId:'OTHER'}]});x.remove('L1');assert.equal(x.state.sharedDevices.length,0);assert.equal(x.state.groupInputLinks.length,0)});

test('manual placements remove deleted branch and retain survivor',()=>{const x=run({manualLayoutV1:[{deviceId:'Q1'},{deviceId:'Q2'}]});x.remove('L1');assert.equal(x.state.manualLayoutV1.length,1);assert.equal(x.state.manualLayoutV1[0].deviceId,'Q2')});
