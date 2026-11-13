'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCrossViewAuditV1:a}=require('../cross-view-audit-v1');
const project={lines:[{id:'L1',catalogSku:'SKU-1'}]};
const protection={rows:[{lineId:'L1',selectedSku:'SKU-1',status:'UNKNOWN'}]};
const board={placements:[{deviceId:'L1',kind:'branch',article:'SKU-1',railIndex:0,startModule:0,modules:2}],rails:1,capacityPerRail:12};
const bom={items:[{key:'SKU-1',quantity:1,owners:['L1']}]};
const run=(p=project,r=protection,b=board,m=bom)=>a(p,r,b,m);
test('consistent draft remains unapproved',()=>{const x=run();assert.equal(x.status,'UNKNOWN');assert.equal(x.issues.length,0);assert.equal(x.ready_for_installation,false)});
test('stale protection and placement are blocked',()=>{const x=run({...project,lines:[{id:'L1',catalogSku:'SKU-2'}]});assert(x.issues.some(i=>i.code==='PROTECTION_SKU_STALE'));assert(x.issues.some(i=>i.code==='PLACEMENT_SKU_STALE'))});
test('missing placement blocked',()=>assert(run(project,protection,{...board,placements:[]}).issues.some(i=>i.code==='PLACEMENT_BRANCH_MISSING')));
test('out of bounds and overlap blocked',()=>{const x=run(project,protection,{...board,placements:[board.placements[0],{...board.placements[0],kind:'shared',deviceId:'S1',startModule:1,modules:12}]});assert(x.issues.some(i=>i.code==='PLACEMENT_OVERLAP'));assert(x.issues.some(i=>i.code==='PLACEMENT_OUT_OF_BOUNDS'))});
test('duplicate line ids blocked',()=>assert(run({lines:[...project.lines,...project.lines]}).issues.some(i=>i.code==='LINE_ID_INVALID_OR_DUPLICATE')));
test('missing protection blocked',()=>assert(run(project,null).issues.some(i=>i.code==='PROTECTION_VIEW_MISSING')));

test('BOM quantity mismatch blocks even when DIN and protection agree',()=>{
 assert(run(project,protection,board,{items:[{key:'SKU-1',quantity:2,owners:['L1']}]}).issues.some(i=>i.code==='BOM_QUANTITY_MISMATCH'));
});
test('BOM wrong owner blocks',()=>{
 assert(run(project,protection,board,{items:[{key:'SKU-1',quantity:1,owners:['OTHER']}]}).issues.some(i=>i.code==='BOM_OWNERS_MISMATCH'));
});
test('missing BOM article blocks',()=>{
 assert(run(project,protection,board,{items:[]}).issues.some(i=>i.code==='BOM_ARTICLE_MISSING'));
});
test('extra BOM article blocks',()=>{
 assert(run(project,protection,board,{items:[...bom.items,{key:'OTHER',quantity:1,owners:['X']}]}).issues.some(i=>i.code==='BOM_ARTICLE_ORPHAN'));
});
test('missing BOM report blocks',()=>{
 assert(run(project,protection,board,null).issues.some(i=>i.code==='BOM_VIEW_MISSING'));
});
test('duplicate placed device blocks even if shared',()=>{
 const x={...board,placements:[board.placements[0],{...board.placements[0],kind:'shared',startModule:3}]};
 assert(run(project,protection,x).issues.some(i=>i.code==='PLACEMENT_DEVICE_DUPLICATE'));
});
test('upstream blocker is not silently downgraded',()=>{
 assert(run(project,{...protection,status:'BLOCKED'}).issues.some(i=>i.code==='PROTECTION_HAS_BLOCKING_ISSUES'));
 assert(run(project,protection,{...board,status:'BLOCKED'}).issues.some(i=>i.code==='BOARD_HAS_BLOCKING_ISSUES'));
});

test('shared upstream device with matching article and geometry is consistent',()=>{
 const p={...project,sharedDevices:[{id:'RCD',catalogSku:'RCD-2P',modules:2}]};
 const b={...board,placements:[...board.placements,{deviceId:'RCD',kind:'shared',article:'RCD-2P',railIndex:0,startModule:2,modules:2}]};
 const m={items:[...bom.items,{key:'RCD-2P',quantity:1,owners:['RCD']}]};
 assert.equal(run(p,protection,b,m).issues.length,0);
});
test('missing shared upstream apparatus is blocked',()=>{
 const p={...project,sharedDevices:[{id:'RCD',catalogSku:'RCD-2P',modules:2}]};
 assert(run(p,protection,board,bom).issues.some(i=>i.code==='PLACEMENT_SHARED_MISSING'));
});
test('shared upstream article mismatch is blocked',()=>{
 const p={...project,sharedDevices:[{id:'RCD',catalogSku:'RCD-2P',modules:2}]};
 const b={...board,placements:[...board.placements,{deviceId:'RCD',kind:'shared',article:'OTHER',railIndex:0,startModule:2,modules:2}]};
 const m={items:[...bom.items,{key:'RCD-2P',quantity:1,owners:['RCD']}]};
 assert(run(p,protection,b,m).issues.some(i=>i.code==='PLACEMENT_SHARED_SKU_STALE'));
});
test('shared upstream width mismatch is blocked',()=>{
 const p={...project,sharedDevices:[{id:'RCD',catalogSku:'RCD-2P',modules:2}]};
 const b={...board,placements:[...board.placements,{deviceId:'RCD',kind:'shared',article:'RCD-2P',railIndex:0,startModule:2,modules:3}]};
 const m={items:[...bom.items,{key:'RCD-2P',quantity:1,owners:['RCD']}]};
 assert(run(p,protection,b,m).issues.some(i=>i.code==='PLACEMENT_SHARED_WIDTH_MISMATCH'));
});
test('unknown placement kind is rejected',()=>{
 const b={...board,placements:[...board.placements,{deviceId:'X',kind:'magic',article:null,railIndex:0,startModule:3,modules:1}]};
 assert(run(project,protection,b).issues.some(i=>i.code==='PLACEMENT_KIND_INVALID'));
});
