'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epSupplyDeviceGraphV1:graph,epSupplyDeviceGraphHtmlV1:html}=require('../supply-device-graph-v1.js');
const f=(c,k,from,to)=>({id:'F:'+c+':'+k,circuitId:c,kind:k,from,to,origin:'explicit-feed-declaration'});
const gi=(g,k)=>({id:'GI:'+g+':'+k,groupId:g,kind:k,from:'SOURCE:MAIN/'+k,to:'GROUP:'+g+'/IN-'+k,origin:'explicit-group-input'});
const bare=()=>({lines:[{id:'L1',phase:'L1'}],sharedDevices:[],branchModelVersion:1,
 branchDevices:[{id:'BD1',circuitId:'L1'}],feedLinks:[f('L1','L1','SOURCE:MAIN/L1','BRANCH:BD1/IN-L1'),f('L1','N','SOURCE:MAIN/N','BUS:N_MAIN/N')],groupInputLinks:[]});
test('direct branch gets a source phase and N bus, without physical approval',()=>{
 const p=bare(),before=JSON.stringify(p),r=graph(p);
 assert.equal(r.edges.length,2);assert.equal(r.nodes.length,2);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.physicalContinuity,'NOT_VERIFIED');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');assert.equal(r.engineeringApproved,false);
 assert.deepEqual(r.edges.map(x=>x.kind),['L1','N']);
 assert.equal(JSON.stringify(p),before);
});
test('shared RCD has explicit main input and protected output declarations',()=>{
 const p=bare();p.sharedDevices=[{id:'RCD1',circuitIds:['L1']}];
 p.groupInputLinks=[gi('RCD1','L1'),gi('RCD1','N')];
 p.feedLinks=[f('L1','L1','GROUP:RCD1/OUT-L1','BRANCH:BD1/IN-L1'),f('L1','N','GROUP:RCD1/OUT-N','BUS:N_RCD1/N')];
 const r=graph(p);
 assert.equal(r.nodes.length,3);assert.equal(r.edges.length,4);
 assert.ok(r.edges.some(x=>x.from==='SOURCE:MAIN'&&x.to==='GROUP:RCD1'));
 assert.ok(r.edges.some(x=>x.from==='GROUP:RCD1'&&x.to==='BRANCH:BD1'));
 assert.equal(r.physicalContinuity,'NOT_VERIFIED');
});
test('missing declarations are unknown, altered connection is blocked',()=>{
 const p=bare();p.feedLinks.pop();
 assert.ok(graph(p).issues.some(x=>x.code==='SUPPLY_GRAPH_BRANCH_FEED_MISSING'));
 p.feedLinks=[f('L1','L1','SOURCE:MAIN/L1','BRANCH:WRONG/IN-L1')];
 const r=graph(p);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='SUPPLY_GRAPH_BRANCH_FEED_CONFLICT'));
});
test('unexpected extra phase or duplicate declaration fails closed',()=>{
 const p=bare();p.feedLinks.push(f('L1','L2','SOURCE:MAIN/L2','BRANCH:BD1/IN-L2'));
 assert.equal(graph(p).status,'BLOCKED');
 p.feedLinks.push(p.feedLinks[0]);assert.ok(graph(p).issues.some(x=>x.code==='SUPPLY_GRAPH_FEED_DUPLICATED'));
});
test('multiple group membership and invalid IDs are blockers',()=>{
 const p=bare();p.sharedDevices=[{id:'RCD1',circuitIds:['L1']},{id:'RCD2',circuitIds:['L1']}];
 assert.ok(graph(p).issues.some(x=>x.code==='SUPPLY_GRAPH_MULTIPLE_GROUP_PARENTS'));
 const q=bare();q.branchDevices.push({id:'BD1',circuitId:'L1'});
 assert.ok(graph(q).issues.some(x=>x.code==='SUPPLY_GRAPH_BRANCH_INVALID'));
});
test('line-to-line hierarchy does not become proven electrical path',()=>{
 const p=bare();p.lines.push({id:'L2',phase:'L1'});p.branchDevices.push({id:'BD2',circuitId:'L2'});
 p.protectionLinks=[{downstreamLineId:'L1',upstreamLineId:'L2'}];
 const r=graph(p);assert.ok(r.issues.some(x=>x.code==='SUPPLY_GRAPH_PROTECTION_PATH_UNREPRESENTED'));
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
});
test('rendering escapes untrusted provenance and device IDs',()=>{
 const x=html({status:'UNKNOWN',nodes:[{}],edges:[{from:'<img src=x onerror=alert(1)>',to:'X',kind:'L1',sourceId:'A',physicalContinuity:'NOT_VERIFIED'}]});
 assert.ok(x.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!x.includes('<img src=x onerror=alert(1)>'));
});
test('invalid project or links do not throw and never approve',()=>{
 for(const p of [null,{}, {lines:[],sharedDevices:[],branchDevices:[],branchModelVersion:1,feedLinks:null,groupInputLinks:null}]){
  const r=graph(p);assert.equal(r.engineeringApproved,false);assert.notEqual(r.status,'PASS');
 }
});
