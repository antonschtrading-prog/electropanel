'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'board-binding-v1.js'),'utf8');
const api=vm.runInNewContext(source+'\n({epBoardDevicesV1,epBoardBindingSnapshotV1,epBoardBindingsAuditV1,epNewBoardBindingV1,epNormalizeBoardBindingsV1})');
function project(){
 return {earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'ONE',device:'C16',modules:1}],
  branchDevices:[{id:'BD-1',circuitId:'L1',label:'C16',modules:1,templateId:null}],
  sharedDevices:[],
  deviceModelV19:{devices:[{id:'Q1',poles:1,kind:'MCB'}],
   terminals:[{id:'Q1-IN',device_id:'Q1',conductor:'L1'},
    {id:'Q1-OUT',device_id:'Q1',conductor:'L1'}]},
  boardBindingsV1:[]};
}
const lookup=sku=>sku==='ONE'?{poles:1,modules:1}:null;
const codes=r=>Array.from(r.issues,x=>x.code);
test('manual linkage preserves real board apparatus ID and remains unapproved',()=>{
 const p=project();p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'Q1','BD-1'));
 const r=api.epBoardBindingsAuditV1(p,lookup);
 assert.equal(r.matched,1);assert.equal(r.boardTotal,1);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.equal(r.status,'UNKNOWN');
 assert.ok(codes(r).includes('TERMINAL_IDENTITY_NOT_MANUFACTURER_VERIFIED'));
});
test('article, phase or DIN geometry changes invalidate an existing declaration',()=>{
 for(const change of [
  p=>p.lines[0].catalogSku='OTHER',
  p=>p.lines[0].phase='L2',
  p=>p.branchDevices[0].modules=2,
  p=>p.branchDevices[0].label='B10'
 ]){
  const p=project();p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'Q1','BD-1'));change(p);
  const r=api.epBoardBindingsAuditV1(p,lookup);
  assert.equal(r.status,'BLOCKED');
  assert.ok(codes(r).includes('BOARD_DEVICE_CHANGED'));
 }
});
test('an incorrect pole count cannot be reconciled with selected 1P article',()=>{
 const p=project();p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'Q1','BD-1'));
 p.deviceModelV19.devices[0].poles=2;
 const r=api.epBoardBindingsAuditV1(p,lookup);
 assert.ok(codes(r).includes('CATALOG_POLES_CONFLICT'));assert.equal(r.status,'BLOCKED');
});
test('phase conductor mismatch is detected without inventing contact continuity',()=>{
 const p=project();p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'Q1','BD-1'));
 p.deviceModelV19.terminals.push({id:'Q1-L3',device_id:'Q1',conductor:'L3'});
 assert.ok(codes(api.epBoardBindingsAuditV1(p,lookup)).includes('TERMINAL_PHASE_CONFLICT'));
});
test('missing device and board identities never silently rebind',()=>{
 const p=project();p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'Q1','BD-1'));
 p.branchDevices=[];
 assert.ok(codes(api.epBoardBindingsAuditV1(p,lookup)).includes('BOARD_DEVICE_MISSING'));
 p.branchDevices=[{id:'BD-1',circuitId:'L1',label:'C16',modules:1,templateId:null}];
 p.deviceModelV19.devices=[];
 assert.ok(codes(api.epBoardBindingsAuditV1(p,lookup)).includes('MODEL_DEVICE_MISSING'));
});
test('all project devices must be explicitly mapped, no silent auto-binding',()=>{
 const p=project();
 let r=api.epBoardBindingsAuditV1(p,lookup);
 assert.equal(r.matched,0);
 assert.ok(codes(r).includes('MODEL_DEVICE_UNBOUND'));
 assert.ok(codes(r).includes('BOARD_DEVICE_UNBOUND'));
});
test('shared RCD pole count is checked against known 2P template',()=>{
 const p=project();
 p.sharedDevices=[{id:'RCD1',label:'Group RCD',templateId:'RCD_2P',modules:2,circuitIds:['L1']}];
 p.deviceModelV19.devices.push({id:'R1',kind:'RCD',poles:4});
 p.boardBindingsV1.push(api.epNewBoardBindingV1(p,'R1','RCD1'));
 const r=api.epBoardBindingsAuditV1(p,lookup);
 assert.equal(r.status,'BLOCKED');
 assert.ok(codes(r).includes('SHARED_RCD_POLE_CONFLICT'));
});
test('safe JSON schema rejects hidden approvals and duplicate device binding',()=>{
 const p=project(),record=api.epNewBoardBindingV1(p,'Q1','BD-1');
 const round=api.epNormalizeBoardBindingsV1(JSON.parse(JSON.stringify([record])));
 assert.equal(round[0].modelDeviceId,'Q1');assert.equal(round[0].snapshot.phase,'L1');
 assert.throws(()=>api.epNormalizeBoardBindingsV1([{...record,approved:true}]));
 assert.throws(()=>api.epNormalizeBoardBindingsV1([{...record,snapshot:{...record.snapshot,certified:true}}]));
 assert.throws(()=>api.epNormalizeBoardBindingsV1([record,record]));
});
test('static HTML includes explicit binding controls and script before application',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.includes('id="bindingModelDevice"')&&html.includes('id="bindingBoardDevice"'));
 assert.ok(html.indexOf('src="board-binding-v1.js"')<html.indexOf('src="app.js"'));
 assert.ok(app.includes('p.boardBindingsV1=epNormalizeBoardBindingsV1'));
 assert.ok(app.includes('epBoardBindingsAuditV1(project,catalogDevice)'));
});
