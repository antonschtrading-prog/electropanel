'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDesignChangeImpactV1:impact,epInvalidateDesignEvidenceV1:invalidate}=require('../design-change-impact-v1.js');
const original=()=>({title:'Commercial panel',lines:[{id:'C1',name:'Lighting',phase:'L1',power:2,modules:1}],
 loads:[{id:'P1',circuitId:'C1',powerKw:2}],railCount:1,railCapacity:12,branchDevices:[],sharedDevices:[]});
const areas=['load','network','cable','device','topology','enclosure'];
const expected={load:['load','cable','device','topology','enclosure'],
 network:['network','cable','device','topology'],
 cable:['cable','device','topology','enclosure'],
 device:['device','topology','enclosure'],
 topology:['topology','enclosure'],enclosure:['enclosure']};
const cases=[
 ['supply network data','supplyNetworkV1','network',{upstream:{ukPercent:6}}],
 ['declared incoming fault study','incomingMaximumStudiesV1','network',[{lineId:'C1',ikMaxKa:6}]],
 ['calculated fault point references','calculatedDeviceFaultBindingsV1','network',[{id:'A1',lineId:'C1'}]],
 ['conductor route bank','cableRoutesV1','cable',[{lineId:'C1',lengthM:18}]],
 ['circuit data source','consumerLoadsV1','load',[{id:'P1',powerKw:2}]],
 ['manufacturer coordination evidence','deviceCoordinationEvidenceV1','device',[{source:'test',deviceId:'A1'}]],
 ['device fault scenario evidence','deviceFaultScenariosV1','device',[{id:'A1',ikKa:7}]],
 ['protection matrix','protectionEvidenceMatrixV1','device',[{id:'M1'}]],
 ['protection hierarchy','protectionLinks','topology',[{upstream:'A1',downstream:'A2'}]],
 ['device supply declarations','deviceSupplyV1','topology',{edges:[]}],
 ['incoming terminal links','incomingTerminalBindingsV1','topology',[{id:'T1',deviceId:'A1'}]],
 ['fire alarm design links','fireControlV1','topology',{controllers:[{id:'FC1'}]}],
 ['supply device graph','supplyDeviceGraphV1','topology',{edges:[{from:'A',to:'B'}]}],
 ['neutral section groups','neutralSegregationV1','topology',{groups:[]}],
 ['cabinet sizing limits','cabinetSizingPreferencesV1','enclosure',{reservePercent:20}],
 ['enclosure layout mode','enclosureLayoutV1','enclosure',{orientation:'vertical'}]
];
for(const [label,key,area,value] of cases){
 test('change-impact tracks '+label,()=>{
  const a=original(),b=structuredClone(a),before=JSON.stringify(a);
  b[key]=value;
  const result=impact(a,b);
  assert.deepEqual(result.changed,[area]);
  assert.deepEqual(result.affected,expected[area]);
  assert.equal(result.status,'REVIEW_REQUIRED');
  assert.equal(result.engineeringApproved,false);
  assert.equal(JSON.stringify(a),before);
 });
 test('unchanged '+label+' is idempotent',()=>{
  const a=original();a[key]=structuredClone(value);
  const b=structuredClone(a);
  assert.equal(impact(a,b).status,'UNCHANGED');
  assert.equal(impact(a,b).affected.length,0);
 });
}
const lineCases=[
 ['cable impedance','route44Input','cable',{lengthM:12,zOhm:0.5}],
 ['cable circuit design','cableInput','cable',{sectionMm2:4}],
 ['LV cable calculation','lv43Input','cable',{method:'B1'}]
];
for(const [label,key,area,value] of lineCases){
 test('line edit tracks '+label,()=>{
  const a=original(),b=structuredClone(a);
  b.lines[0][key]=value;
  assert.deepEqual(impact(a,b).changed,[area]);
  assert.deepEqual(impact(a,b).affected,expected[area]);
 });
}
test('changes in several independent domains are de-duplicated in affected',()=>{
 const a=original(),b=structuredClone(a);
 b.supplyNetworkV1={zOhm:0.1};
 b.cabinetSizingPreferencesV1={reservePercent:10};
 b.deviceSupplyV1={edges:[]};
 const result=impact(a,b);
 assert.deepEqual(result.changed,['network','topology','enclosure']);
 assert.equal(result.affected.filter(x=>x==='enclosure').length,1);
 assert.deepEqual(result.affected,['network','cable','device','topology','enclosure']);
});
test('impact resets only selected evidence even with new topology requirements',()=>{
 const a=original(),b=structuredClone(a);
 b.deviceSupplyV1={edges:[]};
 b.evidence=Object.fromEntries(areas.map(area=>[area,{status:'verified',source:'engineer',method:'manual'}]));
 const next=invalidate(b,impact(a,b));
 assert.deepEqual(next.evidence.topology,{status:'unknown',source:'engineer',method:'manual',stale:true});
 assert.deepEqual(next.evidence.enclosure,{status:'unknown',source:'engineer',method:'manual',stale:true});
 for(const area of ['load','network','cable','device'])assert.equal(next.evidence[area].status,'verified');
 assert.equal(b.evidence.topology.status,'verified');
});
test('project title and design stage metadata alone do not invalidate calculations',()=>{
 const a=original(),b=structuredClone(a);
 b.title='Renamed';b.designStageV1='DETAILED';
 assert.equal(impact(a,b).status,'UNCHANGED');
});
test('cabinet geometry does not rewrite manual apparatus specification',()=>{
 const a=original(),b=structuredClone(a);
 b.cabinetSizingPreferencesV1={reservePercent:25};
 const before=JSON.stringify(b),result=impact(a,b);
 assert.equal(result.engineeringApproved,false);
 assert.equal(JSON.stringify(b),before);
});
test('a deleted optional topology declaration is detected',()=>{
 const a=original();a.deviceSupplyV1={edges:[{from:'a',to:'b'}]};
 const b=structuredClone(a);delete b.deviceSupplyV1;
 assert.deepEqual(impact(a,b).affected,expected.topology);
});
test('changing circuit power does not depend on manufacturer catalogue',()=>{
 const a=original(),b=structuredClone(a);
 b.lines[0].power=3;
 assert.deepEqual(impact(a,b).affected,expected.load);
});
