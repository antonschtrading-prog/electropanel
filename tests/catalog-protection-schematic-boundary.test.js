'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {epProtectiveDeviceShortlistV1}=require('../protective-device-shortlist-v1.js');
global.epProtectiveDeviceShortlistV1=epProtectiveDeviceShortlistV1;
const {epProtectionWorkbenchV1,epProtectionWorkbenchHtmlV1}=require('../protection-workbench-v1.js');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
function fixture(sku){
 return {railCount:1,railCapacity:12,
  lines:[{id:'L1',name:'Outlet',phase:'L1',catalogSku:sku,modules:1,
   overloadInput:{ibA:12,izA:24},faultInput:{ikKa:3,voltageV:230}}],
  branchDevices:[{id:'QF1',circuitId:'L1',modules:1,label:EP_CATALOG[sku].label}],sharedDevices:[]};
}
const catalogue=Object.entries(EP_CATALOG).map(([id,device])=>({id,device}));
test('shortlist refuses Icu-only CHINT as potential Icn candidate',()=>{
 const r=epProtectiveDeviceShortlistV1(fixture('CH-814014').lines[0],catalogue);
 const x=r.candidates.find(c=>c.sku==='CH-814014');
 assert.ok(x); assert.equal(x.icuKa,6);assert.equal(x.icnKa,null);
 assert.equal(x.status,'REJECTED');
 assert.ok(x.reasons.includes('CATALOG_SPEC_INVALID'));
 assert.ok(x.caution.includes('ICU_CANNOT_REPLACE_ICN'));
});
test('protection workbench blocks selected Icu-only apparatus',()=>{
 const p=fixture('CH-814014'),r=epProtectionWorkbenchV1(p,id=>EP_CATALOG[id],catalogue,'L1');
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.selected.reasons.includes('ARTICLE_ICN_UNDECLARED'));
 assert.ok(r.selected.reasons.includes('ICU_CANNOT_REPLACE_ICN'));
 assert.equal(r.selected.selectedArticle.icuKa,6);
 assert.equal(r.selected.selectedArticle.icnKa,null);
 assert.match(epProtectionWorkbenchHtmlV1(r),/Icu 6 кА/);
 assert.equal(r.engineeringApproved,false);
});
test('documented Eaton Icn is not turned into Icu',()=>{
 const p=fixture('EA-286533'),r=epProtectionWorkbenchV1(p,id=>EP_CATALOG[id],catalogue,'L1');
 assert.equal(r.selected.selectedArticle.icnKa,6);
 assert.equal(r.selected.selectedArticle.icuKa,null);
 assert.ok(!r.selected.reasons.includes('ARTICLE_ICN_UNDECLARED'));
 assert.equal(r.engineeringApproved,false);
});
test('schematic retains distinct manufacturer breaking ratings without approval',()=>{
 for(const sku of ['CH-814014','EA-286533']){
  const p=fixture(sku),r=epSingleLineDraftV1(p,id=>EP_CATALOG[id]);
  const node=r.nodes.find(x=>x.lineId==='L1');
  assert.ok(node);
  assert.equal(node.article.icnKa,EP_CATALOG[sku].icnKa??null);
  assert.equal(node.article.icuKa,EP_CATALOG[sku].icuKa??null);
  assert.equal(node.article.icuVoltageV,EP_CATALOG[sku].icuVoltageV??null);
  assert.equal(r.engineeringApproved,false);
 }
});
