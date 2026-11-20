'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epSingleLineDraftV1:build}=require('../single-line-draft-v1');
const {epSingleLineSvgV1:svg}=require('../single-line-svg-v1');
const project=()=>({lines:[
 {id:'L1',name:'Освещение',phase:'L1',catalogSku:'ABB',modules:1},
 {id:'L2',name:'Розетки',phase:'L2',modules:1},
 {id:'L3',name:'Кондиционер',phase:'L3',modules:1}],
 branchDevices:[{id:'BR1',circuitId:'L1'},{id:'BR2',circuitId:'L2'},{id:'BR3',circuitId:'L3'}],
 sharedDevices:[{id:'RCD1',label:'УЗО группа 1',templateId:'RCD_4P',circuitIds:['L1','L2']}]});
const lookup=sku=>sku==='ABB'?{maker:'ABB',series:'S200',label:'S201-C16',inA:16,icnKa:6,poles:1}:null;
test('one-line includes source, RCD group, branch circuits and direct source circuit',()=>{
 const r=build(project(),lookup);
 assert.equal(r.nodes.length,5);assert.equal(r.edges.length,4);
 assert.equal(r.edges.find(x=>x.to==='CIRCUIT:L1').from,'RCD:RCD1');
 assert.equal(r.edges.find(x=>x.to==='CIRCUIT:L3').from,'SOURCE:MAIN');
 assert.equal(r.engineeringApproved,false);
});
test('selected catalogue manufacturer and ratings appear in SVG',()=>{
 const h=svg(build(project(),lookup),'L1');
 assert.match(h,/ABB/);assert.match(h,/S201-C16/);assert.match(h,/In 16 A/);
 assert.match(h,/data-single-line-focus="L1"/);assert.match(h,/ep-circuit-active/);
 assert.match(h,/НЕ электрический провод/);
});
test('missing article is explicitly unknown, not invented',()=>{
 const r=build(project(),lookup);
 assert(r.issues.some(x=>x.code==='SINGLE_LINE_ARTICLE_MISSING'&&x.lineId==='L2'));
 assert.match(svg(r),/Артикул не выбран/);
});
test('wrong catalogue article is blocking',()=>{
 const p=project();p.lines[1].catalogSku='INVALID';
 assert.equal(build(p,lookup).status,'BLOCKED');
});
test('duplicate RCD ownership blocks schematic',()=>{
 const p=project();p.sharedDevices.push({id:'RCD2',circuitIds:['L1']});
 assert(build(p,lookup).issues.some(x=>x.code==='SINGLE_LINE_MULTIPLE_RCD'));
});
test('orphan RCD group reference blocks schematic',()=>{
 const p=project();p.sharedDevices[0].circuitIds.push('MISSING');
 assert(build(p,lookup).issues.some(x=>x.code==='SINGLE_LINE_GROUP_ORPHAN'));
});
test('duplicate circuit identity blocks schematic',()=>{
 const p=project();p.lines.push({...p.lines[0]});
 assert(build(p,lookup).issues.some(x=>x.code==='SINGLE_LINE_CIRCUIT_INVALID'));
});
test('orphan branch is blocking',()=>{
 const p=project();p.branchDevices.push({id:'BAD',circuitId:'MISSING'});
 assert(build(p,lookup).issues.some(x=>x.code==='SINGLE_LINE_BRANCH_ORPHAN'));
});
test('invalid project fails closed',()=>{
 assert.equal(build(null,lookup).status,'BLOCKED');
 assert.match(svg(null),/недоступна/);
});
test('SVG escapes malicious labels, articles and circuit IDs',()=>{
 const p=project();p.lines[0].name='"><script>alert(1)</script>';
 p.sharedDevices[0].label='<img src=x>';
 const h=svg(build(p,lookup));assert.doesNotMatch(h,/<script>|<img/);
 assert.match(h,/&lt;script&gt;/);
});
test('one-line generation does not mutate project',()=>{
 const p=project(),before=JSON.stringify(p);svg(build(p,lookup));assert.equal(JSON.stringify(p),before);
});
test('schematic remains draft even with all articles selected',()=>{
 const p=project();p.lines.forEach(x=>x.catalogSku='ABB');
 const r=build(p,lookup);assert.equal(r.status,'UNKNOWN');
 assert.equal(r.ready_for_installation,false);
});
