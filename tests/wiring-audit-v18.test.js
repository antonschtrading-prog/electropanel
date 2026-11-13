'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto');
const src=fs.readFileSync(path.join(__dirname,'..','wiring-audit-v18.js'),'utf8');
const {epWiringAuditCoreV18,epWiringAuditV18}=vm.runInNewContext(src+'\n({epWiringAuditCoreV18,epWiringAuditV18})',
 {crypto:crypto.webcrypto,TextEncoder,Uint8Array,Set,Map});
const source=()=>({terminals:[
 {id:'s',device_id:'SRC',conductor:'L1'},{id:'a',device_id:'Q1',conductor:'L1'},
 {id:'b',device_id:'Q1',conductor:'L1'},{id:'l',device_id:'LOAD',conductor:'L1'}],
 wires:[{id:'w1',from:'s',to:'a'},{id:'w2',from:'b',to:'l'}],
 internal_links:[{id:'k1',device_id:'Q1',from:'a',to:'b',state:'closed'}],
 sources:[{terminal:'s',conductor:'L1'}],
 loads:[{id:'C1',terminal:'l',conductor:'L1'}]});
const code=r=>Array.from(r.diagnostics,x=>x.code);
test('Python v4.14 reference wiring path and canonical fingerprint',async()=>{
 const p=source(),r=await epWiringAuditV18(p);
 assert.ok(code(r).includes('DECLARED_PATH_PRESENT'));
 assert.equal(r.counts.FAIL,0);assert.equal(r.ready_for_installation,false);
 assert.equal(r.input_sha256,'d51d520dd7bb6750b3590809fd77524b7cd41e18a26b84e813d0f57e559ca47a');
 assert.equal(r.hash_status,'CALCULATED_LOCAL_SHA256');
});
test('open and unknown contacts are not assumed conductive',()=>{
 const p=source();p.internal_links[0].state='open';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('LOAD_PATH_DISCONNECTED'));
 p.internal_links[0].state='unknown';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('PATH_CONTACT_STATE_UNRESOLVED'));
 assert.ok(!code(epWiringAuditCoreV18(p)).includes('DECLARED_PATH_PRESENT'));
 p.internal_links=[];
 assert.ok(code(epWiringAuditCoreV18(p)).includes('LOAD_PATH_DISCONNECTED'));
});
test('L to PE, missing terminals and misdeclared internal contacts are detected',()=>{
 const p=source();p.terminals[3].conductor='PE';p.loads[0].conductor='PE';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('CONDUCTOR_CROSS_CONNECTION'));
 p.terminals[3].conductor='L1';p.loads[0].conductor='L1';
 p.wires[0].to='missing';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('LINK_ENDPOINT_UNKNOWN'));
 p.wires[0].to='a';p.internal_links[0].device_id='WRONG';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('CONTACT_DEVICE_MISMATCH'));
});
test('duplicate IDs and unknown or wrong supply are explicit failures',()=>{
 const p=source();p.terminals.push({...p.terminals[0]});
 assert.ok(code(epWiringAuditCoreV18(p)).includes('TERMINAL_DUPLICATE'));
 p.wires[1].id='w1';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('WIRE_ID_DUPLICATE'));
 p.sources[0].conductor='N';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('SOURCE_KIND_MISMATCH'));
 p.sources=[];
 assert.ok(code(epWiringAuditCoreV18(p)).includes('LOAD_SOURCE_UNDEFINED'));
});
test('missing endpoints, malformed arrays and invalid contact states fail closed',()=>{
 const p=source();p.internal_links[0].state='energized';
 assert.ok(code(epWiringAuditCoreV18(p)).includes('CONTACT_STATE_INVALID'));
 p.wires='bad';assert.throws(()=>epWiringAuditCoreV18(p),/wires must be/);
 assert.throws(()=>epWiringAuditCoreV18([]),/Expected wiring object/);
});
test('no cryptographic API means no invented SHA or safety approval',async()=>{
 const isolated=vm.runInNewContext(src+'\n({epWiringAuditV18})',{TextEncoder,Uint8Array,Set,Map});
 const r=await isolated.epWiringAuditV18(source());
 assert.equal(r.input_sha256,null);assert.equal(r.hash_status,'NOT_COMPUTED');
 assert.equal(r.ready_for_installation,false);
});
test('browser integration and Pages assets are included',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.includes('<script src="wiring-audit-v18.js"></script>'));
 assert.ok(html.includes('id="wiring18Save"'));
 assert.ok(app.includes('state.wiringModelV18=model'));
 assert.ok(app.includes("epWiringAuditCoreV18(project.wiringModelV18)"));
});
