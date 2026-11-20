'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProtectionLinksValidateV1:validate,epProtectionLinksUpdateV1:update,
 epProtectionLinksHtmlV1:html}=require('../protection-links-editor-v1.js');
const {epProtectionTopologyV1}=require('../protection-topology-v1.js');
global.epProtectionTopologyV1=epProtectionTopologyV1;
const project=()=>({lines:[{id:'MAIN',name:'Главный ввод'},{id:'A',name:'Освещение'},{id:'B',name:'Розетки'}]});
const edge=(d,u)=>({downstreamLineId:d,upstreamLineId:u});
test('radial hierarchy editing is immutable, deterministic and versioned',()=>{
 const p=project(),before=JSON.stringify(p);
 const x=update(p,'A','MAIN');assert.equal(x.protectionLinksVersion,1);
 assert.deepEqual(x.protectionLinks,[edge('A','MAIN')]);assert.equal(JSON.stringify(p),before);
 const y=update(x,'B','A');assert.equal(y.protectionLinks.length,2);
 const z=update(y,'A',null);assert.deepEqual(z.protectionLinks,[edge('B','A')]);
 assert.equal(y.protectionLinks.length,2);
});
test('cannot create a cycle, duplicate downstream, missing endpoint or self-link',()=>{
 let p=update(project(),'A','MAIN');
 p=update(p,'B','A');
 for(const [down,up] of [['MAIN','B'],['A','A'],['X','A'],['B','X']]){
  const original=JSON.stringify(p);assert.throws(()=>update(p,down,up),/PROTECTION_LINKS_/);
  assert.equal(JSON.stringify(p),original);
 }
 assert.throws(()=>validate(project(),[edge('A','MAIN'),edge('A','B')]),/DUPLICATE/);
});
test('malformed import, excessive list, duplicate and missing IDs are rejected',()=>{
 const p=project();
 for(const bad of [null,{},[null],[edge('A','MISSING')],[{downstreamLineId:'A',upstreamLineId:2}],
  Array(401).fill(edge('A','MAIN'))])assert.throws(()=>validate(p,bad),/PROTECTION_LINKS_/);
 assert.throws(()=>validate({lines:[{id:'A'},{id:'A'}]},[]),/LINE_IDS/);
});
test('labels are escaped in editable hierarchy view',()=>{
 const p=project();p.lines[0].name='<img src=x onerror=alert(1)>';
 p.protectionLinks=[edge('A','MAIN')];
 const output=html(p);
 assert.ok(output.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!output.includes('<img src=x onerror=alert(1)>'));
 assert.match(output,/NOT_ASSESSED/);
});
test('even valid links never imply selectivity or installation approval',()=>{
 const p=update(project(),'A','MAIN'),r=epProtectionTopologyV1(p,p.protectionLinks);
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
});
