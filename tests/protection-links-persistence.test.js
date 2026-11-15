'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epProtectionLinksValidateV1=require('../protection-links-editor-v1.js').epProtectionLinksValidateV1;
global.epProjectCatalogV1=()=>({issues:[]});
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const raw=()=>({projectExtensionsVersion:1,protectionLinksVersion:1,
 lines:[{id:'MAIN'},{id:'A'},{id:'B'}],
 protectionLinks:[{downstreamLineId:'A',upstreamLineId:'MAIN'},
 {downstreamLineId:'B',upstreamLineId:'A'}]});
const dest=()=>({lines:[{id:'MAIN'},{id:'A'},{id:'B'}]});
test('valid declared hierarchy roundtrips through project extensions',()=>{
 const r=raw(),d=dest(),old=JSON.stringify(r),out=restore(r,d);
 assert.equal(out.protectionLinksVersion,1);
 assert.deepEqual(out.protectionLinks,r.protectionLinks);
 assert.equal(JSON.stringify(r),old);
 assert.equal(out.projectExtensionsVersion,1);
});
test('unsupported and missing hierarchy version rejects import',()=>{
 for(const version of [undefined,2,'1']){
  const r=raw();r.protectionLinksVersion=version;
  assert.throws(()=>restore(r,dest()),/иерархии защиты/);
 }
 const r=raw();delete r.protectionLinks;assert.throws(()=>restore(r,dest()),/иерархии защиты/);
});
test('invalid graph is rejected on import rather than silently repaired',()=>{
 for(const links of [[{downstreamLineId:'A',upstreamLineId:'X'}],
 [{downstreamLineId:'A',upstreamLineId:'B'},{downstreamLineId:'B',upstreamLineId:'A'}],
 [{downstreamLineId:'A',upstreamLineId:'A'}]]){
  const r=raw();r.protectionLinks=links;assert.throws(()=>restore(r,dest()),/PROTECTION_LINKS_/);
 }
});
test('legacy project without topology imports without fabricating parent links',()=>{
 const r=raw();delete r.protectionLinksVersion;delete r.protectionLinks;
 const out=restore(r,dest());
 assert.equal(out.protectionLinks,undefined);
});
