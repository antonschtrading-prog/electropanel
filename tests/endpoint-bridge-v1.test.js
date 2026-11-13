'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'endpoint-bridge-v1.js'),'utf8');
const {epSymbolicConnectionsV1,epNormalizeEndpointBindingsV1,epEndpointBridgeAuditV1}=vm.runInNewContext(
 source+'\n({epSymbolicConnectionsV1,epNormalizeEndpointBindingsV1,epEndpointBridgeAuditV1})');
const project=()=>({
 lines:[{id:'L1',phase:'L1'}],loads:[{id:'LD1',circuitId:'L1'}],
 branchDevices:[{id:'BD-1',circuitId:'L1'}],sharedDevices:[],
 boardBindingsV1:[{boardDeviceId:'BD-1',modelDeviceId:'Q1'}],
 wiringModelV18:{terminals:[
  {id:'Q1-OUT',device_id:'Q1',conductor:'L1'},
  {id:'LD1-IN',device_id:'LD1',conductor:'L1'}],
  wires:[{id:'W1',from:'Q1-OUT',to:'LD1-IN'}],internal_links:[],
  sources:[],loads:[]},
 terminalLinks:[{id:'T:LD1:L1',loadId:'LD1',circuitId:'L1',kind:'L1',
  from:'BRANCH:BD-1/L1',to:'LOAD:LD1/L1'}],feedLinks:[],groupInputLinks:[],
 endpointBindingsV1:[{symbolicRef:'BRANCH:BD-1/L1',terminalId:'Q1-OUT'},
  {symbolicRef:'LOAD:LD1/L1',terminalId:'LD1-IN'}]
});
const codes=r=>Array.from(r.issues,x=>x.code);
test('fully declared symbolic wire matches only as a model assertion',()=>{
 const p=project(),r=epEndpointBridgeAuditV1(p);
 assert.equal(r.matchedEndpoints,2);assert.equal(r.expectedEndpoints,2);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
 assert.deepEqual(codes(r),['PHYSICAL_TERMINALS_UNVERIFIED']);
});
test('missing explicitly drawn wire blocks symbolic connection',()=>{
 const p=project();p.wiringModelV18.wires=[];
 const r=epEndpointBridgeAuditV1(p);
 assert.equal(r.status,'BLOCKED');
 assert.ok(codes(r).includes('DIRECT_WIRE_UNDECLARED'));
});
test('wrong conductor role and wrong apparatus model identity are blocked',()=>{
 const p=project();p.wiringModelV18.terminals[0].conductor='N';
 assert.ok(codes(epEndpointBridgeAuditV1(p)).includes('ROLE_MISMATCH'));
 p.wiringModelV18.terminals[0].conductor='L1';
 p.wiringModelV18.terminals[0].device_id='ANOTHER';
 assert.ok(codes(epEndpointBridgeAuditV1(p)).includes('WRONG_DEVICE_TERMINAL'));
});
test('change of symbolic route cannot silently relink previous terminal IDs',()=>{
 const p=project();p.terminalLinks[0].from='BRANCH:BD-2/L1';
 const r=epEndpointBridgeAuditV1(p);
 assert.ok(codes(r).includes('STALE_SYMBOLIC_ENDPOINT'));
 assert.equal(r.status,'BLOCKED');
});
test('missing explicit endpoint mapping is UNKNOWN, never automatic wiring',()=>{
 const p=project();p.endpointBindingsV1.pop();
 const r=epEndpointBridgeAuditV1(p);
 assert.equal(r.status,'UNKNOWN');
 assert.ok(codes(r).includes('ENDPOINT_UNBOUND'));
 assert.equal(r.matchedEndpoints,1);
});
test('duplicate symbolic references and suspicious input are rejected',()=>{
 const p=project();
 assert.throws(()=>epNormalizeEndpointBindingsV1([...p.endpointBindingsV1,p.endpointBindingsV1[0]]));
 assert.throws(()=>epNormalizeEndpointBindingsV1([{symbolicRef:'SOURCE:MAIN/L1',terminalId:'T',approved:true}]));
 assert.throws(()=>epNormalizeEndpointBindingsV1([{symbolicRef:'https://example.com',terminalId:'T'}]));
 assert.equal(epSymbolicConnectionsV1(p).length,1);
});
test('group feeds and neutral bus roles are supported but require explicit N wires',()=>{
 const p=project();
 p.wiringModelV18.terminals.push({id:'N-BUS',device_id:'BUS',conductor:'N'},
  {id:'N-LOAD',device_id:'LD1',conductor:'N'});
 p.terminalLinks.push({id:'T:LD1:N',from:'BUS:N_RCD1/N',to:'LOAD:LD1/N'});
 p.endpointBindingsV1.push({symbolicRef:'BUS:N_RCD1/N',terminalId:'N-BUS'},
  {symbolicRef:'LOAD:LD1/N',terminalId:'N-LOAD'});
 assert.ok(codes(epEndpointBridgeAuditV1(p)).includes('DIRECT_WIRE_UNDECLARED'));
 p.wiringModelV18.wires.push({id:'W-N',from:'N-BUS',to:'N-LOAD'});
 assert.equal(epEndpointBridgeAuditV1(p).status,'UNKNOWN');
});
test('nonexistent terminal model fails closed',()=>{
 const p=project();delete p.wiringModelV18;
 assert.equal(epEndpointBridgeAuditV1(p).engineeringApproved,false);
});
test('HTML and project import expose the explicit endpoint binding component',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.includes('src="endpoint-bridge-v1.js"'));
 assert.ok(html.includes('id="endpointSave"'));
 assert.ok(app.includes('p.endpointBindingsV1=epNormalizeEndpointBindingsV1'));
 assert.ok(app.includes('epEndpointBridgeAuditV1(project)'));
});
