'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const root=path.join(__dirname,'..');
const js=['wiring-audit-v18.js','device-audit-v19.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
const api=vm.runInNewContext(js+'\n({epDeviceAuditV19,epDeviceAuditCoreV19,epWiringDeviceModelConsistencyV19})',
 {crypto:crypto.webcrypto,TextEncoder,Uint8Array,Set,Map});
const sample=()=>({devices:[{id:'Q1',kind:'breaker',poles:2,evidence:{
 manufacturer:'Acme Demo',model:'Q1',document_id:'demo',revision:'1',source_url:'https://example.org/demo'}}],
 terminals:[{id:'L_in',device_id:'Q1',conductor:'L1'},
  {id:'L_out',device_id:'Q1',conductor:'L1'},
  {id:'N_in',device_id:'Q1',conductor:'N'},
  {id:'N_out',device_id:'Q1',conductor:'N'}],
 internal_links:[{device_id:'Q1',from:'L_in',to:'L_out',state:'closed',gang_id:'g'},
  {device_id:'Q1',from:'N_in',to:'N_out',state:'closed',gang_id:'g'}],
 wires:[],neutral_zones:[{id:'N1',terminals:['N_in','N_out']}]});
const codes=r=>Array.from(r.diagnostics,x=>x.code);
test('Python original v1.9 fixture has no FAIL but remains unverified',async()=>{
 const r=await api.epDeviceAuditV19(sample());
 assert.equal(r.counts.FAIL,0);
 assert.ok(codes(r).includes('DEVICE_SOURCE_UNVERIFIED'));
 assert.equal(r.input_sha256,'66c4431914a92a757526235d6b25289033b9a8ef6b53b1ba1c88656ebf3550aa');
 assert.equal(r.ready_for_installation,false);
});
test('multi-pole gang mismatches and unknown contact are detected',()=>{
 const x=sample();x.internal_links.pop();
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('GANG_POLE_COUNT_MISMATCH'));
 x.internal_links[0].state='unknown';
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('CONTACT_STATE_UNRESOLVED'));
 x.internal_links.push({...sample().internal_links[1],state:'open'});
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('GANG_STATE_CONFLICT'));
});
test('protective earth can never pass through a switchable internal contact',()=>{
 const x=sample();x.terminals[0].conductor='PE';x.terminals[1].conductor='PE';
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('PE_THROUGH_SWITCH'));
});
test('neutral zones detect overlap, shorted independent N domains, incomplete assignment',()=>{
 const x=sample();
 x.neutral_zones.push({id:'N2',terminals:['N_in']});
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('NEUTRAL_ZONE_OVERLAP'));
 x.neutral_zones=[{id:'N1',terminals:['N_in']},{id:'N2',terminals:['N_out']}];
 x.wires=[{from:'N_in',to:'N_out'}];
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('NEUTRAL_ZONE_CROSS_LINK'));
 x.neutral_zones=[{id:'N1',terminals:['N_in']}];
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('NEUTRAL_ZONE_INCOMPLETE'));
});
test('invalid poles, missing evidence and unsupported claims remain flagged',()=>{
 const x=sample();x.devices[0].poles=0;
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('POLE_COUNT_INVALID'));
 x.devices[0].poles=2;delete x.devices[0].evidence;
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('DEVICE_SOURCE_MISSING'));
 x.devices[0].evidence={...sample().devices[0].evidence,sha256:'not-a-hash'};
 assert.ok(codes(api.epDeviceAuditCoreV19(x)).includes('DEVICE_SOURCE_HASH_INVALID'));
});
test('device and wiring declarations must match except device-only gang metadata',()=>{
 const x=sample();
 const wiring={terminals:x.terminals,wires:x.wires,
  internal_links:x.internal_links.map(({gang_id,...v})=>v)};
 assert.equal(api.epWiringDeviceModelConsistencyV19(wiring,x).status,'DECLARED_MATCH_ONLY');
 const invalid={...wiring,wires:[{id:'W1',from:'N_in',to:'N_out'}]};
 assert.equal(api.epWiringDeviceModelConsistencyV19(invalid,x).status,'BLOCKED');
 assert.ok(Array.from(api.epWiringDeviceModelConsistencyV19(invalid,x).issues)
  .includes('MODEL_GROUP_MISMATCH_wires'));
 assert.equal(api.epWiringDeviceModelConsistencyV19(null,x).status,'UNKNOWN');
});
test('no hash if cryptographic API unavailable; never invent certification',async()=>{
 const ctx=vm.runInNewContext(js+'\n({epDeviceAuditV19})',{TextEncoder,Uint8Array,Set,Map});
 const r=await ctx.epDeviceAuditV19(sample());
 assert.equal(r.input_sha256,null);assert.equal(r.ready_for_installation,false);
});
