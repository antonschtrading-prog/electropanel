'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epSchematicCrossViewV1,epCrossViewAuditV1}=require('../cross-view-audit-v1.js');
const BASE={
 lines:[{id:'L1',name:'Lighting',phase:'L1',device:'B16',modules:1,catalogSku:'MCB16'},
        {id:'L2',name:'Sockets',phase:'L2',device:'B16',modules:1,catalogSku:'MCB16'}],
 sharedDevices:[{id:'R1',label:'RCD group',templateId:'RCD_2P',modules:2,catalogSku:'RCD40',circuitIds:['L1']}],
 branchDevices:[{id:'BD1',circuitId:'L1',modules:1,label:'B16'},
                {id:'BD2',circuitId:'L2',modules:1,label:'B16'}]};
const ARTICLES={
 MCB16:{maker:'Maker',series:'M',label:'B16',kind:'MCB',modules:1,poles:1,inA:16,icnKa:6},
 RCD40:{maker:'Maker',series:'R',label:'RCD40',kind:'RCD',modules:2,poles:2,inA:40,icnKa:6}};
const node=(view,id)=>{const value=view.nodes.find(x=>x.id===id);assert.ok(value,'missing '+id);return value;};
function fixture(){
 const p=structuredClone(BASE),articles=structuredClone(ARTICLES);
 const lookup=id=>articles[id]||null;
 const v=epSingleLineDraftV1(p,lookup);
 return {p,articles,v,lookup};
}
test('baseline projected scheme matches catalogue, circuits, shared RCD and group links',()=>{
 const {p,v,lookup}=fixture();
 assert.deepEqual(epSchematicCrossViewV1(p,v,lookup).issues,[]);
 const r=epCrossViewAuditV1(p,{rows:[]}, {placements:[]}, {items:[]},v,lookup);
 assert.equal(r.issues.some(x=>x.code.startsWith('SCHEMATIC_')),false);
});
test('missing schematic is always blocking',()=>{
 const {p,lookup}=fixture();
 assert.equal(epSchematicCrossViewV1(p,null,lookup).issues[0].code,'SCHEMATIC_VIEW_INVALID');
});
test('a missing catalogue lookup does not silently validate a selected SKU',()=>{
 const {p,v}=fixture();
 assert.ok(epSchematicCrossViewV1(p,v,null).issues.some(x=>x.code==='SCHEMATIC_CATALOG_LOOKUP_MISSING'));
});
test('catalogue lookup exceptions are reported as blocking',()=>{
 const {p,v}=fixture();
 assert.ok(epSchematicCrossViewV1(p,v,()=>{throw Error('fail');}).issues.some(x=>x.code==='SCHEMATIC_CATALOG_LOOKUP_FAILED'));
});

test("source is missing",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes=v.nodes.filter(n=>n.id!=='SOURCE:MAIN');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_SOURCE_MISSING"),JSON.stringify(issues));
});
test("source is wrongly typed",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'SOURCE:MAIN').type='circuit';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_SOURCE_TYPE_MISMATCH"),JSON.stringify(issues));
});
test("duplicate schematic node",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes.push({...node(v,'CIRCUIT:L1')});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_NODE_DUPLICATE"),JSON.stringify(issues));
});
test("malformed schematic node",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes.push({id:null});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_NODE_INVALID"),JSON.stringify(issues));
});
test("orphan schematic node",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes.push({id:'CIRCUIT:ORPHAN',type:'circuit'});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_NODE_ORPHAN"),JSON.stringify(issues));
});
test("branch link missing",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').branchId=null;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_BRANCH_STALE"),JSON.stringify(issues));
});
test("circuit internal ID stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').lineId='L2';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_ID_STALE"),JSON.stringify(issues));
});
test("circuit type stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').type='rcd';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_TYPE_MISMATCH"),JSON.stringify(issues));
});
test("circuit name stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').name='Changed';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_LABEL_STALE"),JSON.stringify(issues));
});
test("circuit phase stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').phase='L3';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_PHASE_STALE"),JSON.stringify(issues));
});
test("circuit SKU stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').sku='RCD40';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_SKU_STALE"),JSON.stringify(issues));
});
test("circuit missing",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes=v.nodes.filter(n=>n.id!=='CIRCUIT:L1');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_MISSING"),JSON.stringify(issues));
});
test("shared RCD missing",()=>{
 const {p,v,articles,lookup}=fixture();
 v.nodes=v.nodes.filter(n=>n.id!=='RCD:R1');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MISSING"),JSON.stringify(issues));
});
test("shared RCD wrong node type",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'RCD:R1').type='circuit';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_TYPE_MISMATCH"),JSON.stringify(issues));
});
test("shared RCD label stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'RCD:R1').name='Obsolete';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_LABEL_STALE"),JSON.stringify(issues));
});
test("shared RCD SKU stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'RCD:R1').sku='MCB16';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_SKU_STALE"),JSON.stringify(issues));
});
test("shared RCD template stale",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'RCD:R1').templateId='RCD_4P';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_TEMPLATE_STALE"),JSON.stringify(issues));
});
test("circuit manufacturer stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.maker='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_MAKER_STALE"),JSON.stringify(issues));
});
test("circuit series stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.series='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_SERIES_STALE"),JSON.stringify(issues));
});
test("circuit label stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.label='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_LABEL_STALE"),JSON.stringify(issues));
});
test("circuit rating stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.inA=20;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_RATING_STALE"),JSON.stringify(issues));
});
test("circuit breaking capacity stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.icnKa=10;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_BREAKING_CAPACITY_STALE"),JSON.stringify(issues));
});
test("circuit poles stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.MCB16.poles=2;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_POLES_STALE"),JSON.stringify(issues));
});
test("RCD manufacturer stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.maker='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MAKER_STALE"),JSON.stringify(issues));
});
test("RCD series stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.series='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_SERIES_STALE"),JSON.stringify(issues));
});
test("RCD article label stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.label='Updated';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_LABEL_STALE"),JSON.stringify(issues));
});
test("RCD rating stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.inA=63;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_RATING_STALE"),JSON.stringify(issues));
});
test("RCD breaking capacity stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.icnKa=10;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_BREAKING_CAPACITY_STALE"),JSON.stringify(issues));
});
test("RCD poles stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.poles=4;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_POLES_STALE"),JSON.stringify(issues));
});
test("RCD DIN width stale",()=>{
 const {p,v,articles,lookup}=fixture();
 articles.RCD40.modules=3;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MODULES_STALE"),JSON.stringify(issues));
});
test("extra group member duplication",()=>{
 const {p,v,articles,lookup}=fixture();
 p.sharedDevices[0].circuitIds.push('L1');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MEMBER_DUPLICATE"),JSON.stringify(issues));
});
test("nonexistent RCD member",()=>{
 const {p,v,articles,lookup}=fixture();
 p.sharedDevices[0].circuitIds.push('UNKN');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MEMBER_ORPHAN"),JSON.stringify(issues));
});
test("group member assigned twice",()=>{
 const {p,v,articles,lookup}=fixture();
 p.sharedDevices.push({id:'R2',label:'Other',catalogSku:'RCD40',templateId:'RCD_2P',modules:2,circuitIds:['L1']});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_MEMBER_CONFLICT"),JSON.stringify(issues));
});
test("missing declared edge",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges=v.edges.filter(e=>e.to!=='CIRCUIT:L1');
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_MISSING"),JSON.stringify(issues));
});
test("unexpected edge",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges.push({from:'SOURCE:MAIN',to:'CIRCUIT:L1',kind:'declared_group_association'});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_UNEXPECTED"),JSON.stringify(issues));
});
test("duplicate edge",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges.push({...v.edges[0]});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_DUPLICATE"),JSON.stringify(issues));
});
test("orphan edge",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges.push({from:'BAD',to:'CIRCUIT:L1',kind:'declared_group_association'});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_ORPHAN"),JSON.stringify(issues));
});
test("invalid edge kind",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges[0].kind='wire';
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_KIND_STALE"),JSON.stringify(issues));
});
test("invalid edge record",()=>{
 const {p,v,articles,lookup}=fixture();
 v.edges.push({from:null,to:null});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_EDGE_INVALID"),JSON.stringify(issues));
});
test("invalid project group members",()=>{
 const {p,v,articles,lookup}=fixture();
 p.sharedDevices[0].circuitIds=null;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_GROUP_CIRCUITS_INVALID"),JSON.stringify(issues));
});
test("missing article projection",()=>{
 const {p,v,articles,lookup}=fixture();
 node(v,'CIRCUIT:L1').article=null;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_ARTICLE_PROJECTION_MISSING"),JSON.stringify(issues));
});
test("unexpected article projection",()=>{
 const {p,v,articles,lookup}=fixture();
 p.lines[0].catalogSku=null;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_ARTICLE_UNEXPECTED"),JSON.stringify(issues));
});
test("catalogue article no longer resolves",()=>{
 const {p,v,articles,lookup}=fixture();
 delete articles.MCB16;
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_ARTICLE_UNRESOLVED"),JSON.stringify(issues));
});
test("project duplicate circuit ID",()=>{
 const {p,v,articles,lookup}=fixture();
 p.lines.push({...p.lines[0]});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_PROJECT_CIRCUIT_DUPLICATE"),JSON.stringify(issues));
});
test("project duplicate shared ID",()=>{
 const {p,v,articles,lookup}=fixture();
 p.sharedDevices.push({...p.sharedDevices[0]});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_PROJECT_GROUP_DUPLICATE"),JSON.stringify(issues));
});
test("project duplicate branch owner",()=>{
 const {p,v,articles,lookup}=fixture();
 p.branchDevices.push({...p.branchDevices[0],id:'BD3'});
 const issues=epSchematicCrossViewV1(p,v,lookup).issues;
 assert.ok(issues.some(x=>x.code==="SCHEMATIC_BRANCH_DUPLICATE"),JSON.stringify(issues));
});
