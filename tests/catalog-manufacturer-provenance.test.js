'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epCatalogEvidenceAuditV1:audit}=require('../catalog-evidence-audit-v1.js');
const {epProjectCatalogV1:catalogue}=require('../project-catalog-workbench-v1.js');
const {epSingleLineDraftV1:singleLine}=require('../single-line-draft-v1.js');
const {epDraftBomV1:bom}=require('../draft-bom-v1.js');
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
const {epProtectionWorkbenchV1:workbench}=require('../protection-workbench-v1.js');
const {epSchematicCrossViewV1:schematicAudit,epCatalogOutputCrossViewV1:bomAudit,
 epProtectionProjectionAuditV1:protectionAudit}=require('../cross-view-audit-v1.js');
const {epDraftBoardPlanV1:board}=require('../draft-board-plan-v1.js');
const {epCatalogFrontSvgV1:front}=require('../catalog-front-svg-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
function article(kind='MCB'){
 return {id:'PR-16',sku:'B16',maker:'Example manufacturer',series:'Example series',
  label:'B16',kind,poles:1,modules:1,widthMm:18,inA:16,icnKa:6,curve:'B',
  icnVoltageV:230,icnStandard:'IEC/EN 60898-1',poleConfiguration:'1P',
  source:'https://example.org/datasheet',productSource:'https://example.org/product',
  sourceReviewedAt:'2026-11-14',sourceType:'PROJECT_DECLARATION',verificationStatus:'UNVERIFIED'};
}
function fixture(kind='MCB'){
 const a=article(kind);
 const p={title:'Board',railCount:1,railCapacity:12,
  lines:[{id:'L1',name:'Lighting',phase:'L1',catalogSku:a.id,modules:1,device:'B16',
   overloadInput:{ibA:10,izA:25},faultInput:{ikKa:3}}],
  branchDevices:[{id:'BD1',circuitId:'L1',label:'B16',modules:1}],
  sharedDevices:[],catalogArticles:[a]};
 return {a,p};
}
test('selected circuit provenance is explicit, still not approved',()=>{
 const {a,p}=fixture(),r=audit(p,()=>a);
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.items.length,1);
 assert.deepEqual(r.items[0].sourceReviewedAt,'2026-11-14');
 assert.equal(r.items[0].poleConfiguration,'1P');
 assert.equal(r.items[0].icnVoltageV,230);
 assert.equal(r.items[0].icnStandard,'IEC/EN 60898-1');
 assert.equal(r.summary.selected,1);
 assert.equal(r.engineeringApproved,false);
 assert.ok(r.issues.some(x=>x.code==='MANUFACTURER_TERMINALS_UNVERIFIED'));
});
test("provenance: missing source",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.source;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_EVIDENCE_INCOMPLETE"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: insecure source URL",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.source='http://example.org/datasheet';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_URL_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: source embedded credentials",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.source='https://user:secret@example.org/data';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_URL_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: script-like source",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.source='javascript:alert(1)';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_URL_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: product URL insecure",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.productSource='http://example.org/product';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_PRODUCT_URL_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: product URL credentials",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.productSource='https://u:p@example.org/product';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_PRODUCT_URL_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: invalid review date",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.sourceReviewedAt='2026-02-30';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_REVIEW_DATE_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: malformed date",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.sourceReviewedAt='2026/11/14';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_REVIEW_DATE_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: unrecorded review date",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.sourceReviewedAt;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SOURCE_REVIEW_NOT_RECORDED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: mirror data source",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.sourceType='MANUFACTURER_DATASHEET_MIRROR';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_MIRROR_REQUIRES_MANUFACTURER_CONFIRMATION"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: user declaration",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.sourceType='PROJECT_DECLARATION';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_USER_DECLARATION_NOT_INDEPENDENTLY_VERIFIED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: unverified article",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.verificationStatus='UNVERIFIED';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_ARTICLE_UNVERIFIED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: no manufacturer",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.maker=null;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_EVIDENCE_INCOMPLETE"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: no series",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.series='';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_EVIDENCE_INCOMPLETE"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: no manufacturer article",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.sku=null;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_EVIDENCE_INCOMPLETE"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: Icn rating voltage absent",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.icnVoltageV;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_VOLTAGE_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: breaking standard absent",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.icnStandard;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_STANDARD_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: Icn missing",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.icnKa;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_CAPACITY_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: MCB curve missing",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.curve;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_TRIP_CURVE_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: MCB wrong type in selected branch",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d.kind='METER';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_ROLE_KIND_CONFLICT"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: selected upstream RCD wrong type",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 owners='shared';d.kind='MCB';
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_ROLE_KIND_CONFLICT"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: missing selected branch SKU",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 p.lines[0].catalogSku=null;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_SKU_MISSING"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: unresolvable selected SKU",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 d=null;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_ARTICLE_UNKNOWN"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: selected manufacturer lookup exception",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 lookupException=true;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_LOOKUP_FAILED"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: duplicate circuit ID",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 p.lines.push({...p.lines[0]});
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_OWNER_DUPLICATE"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: missing circuit ID",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 p.lines[0].id=null;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_OWNER_INVALID"&&x.level==="BLOCKED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: missing article category",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 delete d.kind;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_KIND_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: RCD residual current missing",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 owners='shared';delete d.residualCurrentMa;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("provenance: RCD residual detection type missing",()=>{
 const {p,a}=fixture();let d={...a},owners='circuit',lookupException=false;
 owners='shared';delete d.residualType;
 const source=owners==='shared'?{...p,lines:[],sharedDevices:[{id:'G1',catalogSku:a.id}]}:p;
 const result=audit(source,()=>{if(lookupException)throw Error('offline');return d;});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_RESIDUAL_TYPE_UNDECLARED"&&x.level==="UNKNOWN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("catalogue: pole configuration 1P+N accepted",()=>{
 const a=article();a.poles=2;a.modules=2;a.widthMm=36;a.poleConfiguration='1P+N';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: pole configuration 2P accepted",()=>{
 const a=article();a.poles=2;a.modules=2;a.widthMm=36;a.poleConfiguration='2P';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: 3P+N accepted",()=>{
 const a=article();a.poles=4;a.modules=4;a.widthMm=72;a.poleConfiguration='3P+N';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: 4P accepted",()=>{
 const a=article();a.poles=4;a.modules=4;a.widthMm=72;a.poleConfiguration='4P';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: wrong number of poles for 1P+N",()=>{
 const a=article();a.poleConfiguration='1P+N';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_POLE_CONFIGURATION_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: invalid pole config string",()=>{
 const a=article();a.poleConfiguration='2N';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_POLE_CONFIGURATION_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: unsupported kind for pole config",()=>{
 const a=article();a.kind='METER';a.poleConfiguration='1P';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_POLE_CONFIGURATION_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: negative rated Icn voltage",()=>{
 const a=article();a.icnVoltageV=-1;
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_VOLTAGE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: zero rated Icn voltage",()=>{
 const a=article();a.icnVoltageV=0;
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_VOLTAGE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: rated Icn voltage excessive",()=>{
 const a=article();a.icnVoltageV=1600;
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_VOLTAGE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: rated Icn voltage string invalid",()=>{
 const a=article();a.icnVoltageV='230';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_VOLTAGE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: valid rated Icn voltage",()=>{
 const a=article();a.icnVoltageV=230;
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: invalid ICN standard",()=>{
 const a=article();a.icnStandard='line\n-break';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_BREAKING_STANDARD_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: valid ICN standard declaration",()=>{
 const a=article();a.icnStandard='IEC/EN 60898-1';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: invalid reviewed date",()=>{
 const a=article();a.sourceReviewedAt='2026-02-30';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_REVIEW_DATE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: reviewed date wrong format",()=>{
 const a=article();a.sourceReviewedAt='14.11.2026';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_REVIEW_DATE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: valid review date",()=>{
 const a=article();a.sourceReviewedAt='2026-11-14';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});
test("catalogue: non-HTTPS product source",()=>{
 const a=article();a.productSource='http://example.org';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_PRODUCT_SOURCE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: credential-bearing product source",()=>{
 const a=article();a.productSource='https://u:p@example.org';
 const result=catalogue({catalogArticles:[a]});
 assert.ok(result.issues.some(x=>x.code==="CATALOG_PRODUCT_SOURCE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.lookup(a.id),null);
});
test("catalogue: valid product source",()=>{
 const a=article();a.productSource='https://example.org/product';
 const result=catalogue({catalogArticles:[a]});
 assert.deepEqual(result.issues,[]);
 assert.ok(result.lookup(a.id));
});

test('selected group RCD and branch article have distinct provenance records',()=>{
 const {p,a}=fixture();const group={...a,id:'RCD-40',sku:'R40',
  kind:'RCD',poles:2,modules:2,widthMm:36,poleConfiguration:'2P',
  residualCurrentMa:30,residualType:'A'};
 p.sharedDevices=[{id:'R1',catalogSku:group.id,templateId:'RCD_2P',modules:2,circuitIds:['L1']}];
 p.catalogArticles.push(group);
 const c=catalogue(p),report=audit(p,c.lookup);
 assert.equal(report.items.length,2);
 assert.deepEqual(report.items.map(x=>x.role),['circuit','sharedRcd']);
 assert.equal(report.items[1].ownerId,'R1');
 assert.equal(report.items[1].lineId,null);
 assert.equal(report.items[1].poleConfiguration,'2P');
 assert.equal(report.issues.some(x=>x.code==='CATALOG_ROLE_KIND_CONFLICT'),false);
});
test('unknown group article is a blocking, group-scoped issue',()=>{
 const {p,a}=fixture();p.sharedDevices=[{id:'R1',catalogSku:'NO-SUCH-ARTICLE'}];
 const report=audit(p,()=>a&&null);
 assert.ok(report.issues.some(x=>x.code==='CATALOG_ARTICLE_UNKNOWN'&&x.owner==='R1'));
});
test('no catalogue lookup is always explicit, not silently verified',()=>{
 const {p}=fixture();
 const report=audit(p,null);
 assert.ok(report.issues.some(x=>x.code==='CATALOG_LOOKUP_UNAVAILABLE'));
});
test('malformed project and invalid shared-device shape fail closed',()=>{
 assert.equal(audit(null,()=>null).status,'BLOCKED');
 assert.equal(audit({lines:[],sharedDevices:{}},()=>null).status,'BLOCKED');
});
test('source-reviewed seed still requires terminal/facade verification',()=>{
 const {p,a}=fixture();
 a.sourceType='MANUFACTURER_DATASHEET_MIRROR';
 a.verificationStatus='VERIFIED';
 const r=audit(p,()=>a);
 assert.ok(r.issues.some(x=>x.code==='CATALOG_MIRROR_REQUIRES_MANUFACTURER_CONFIRMATION'));
 assert.ok(r.issues.some(x=>x.code==='MANUFACTURER_TERMINALS_UNVERIFIED'));
 assert.equal(r.status,'UNKNOWN');
});
test('selected 1P+N MCB declared explicitly across catalogue and workbench',()=>{
 const {p,a}=fixture();a.poles=2;a.modules=2;a.widthMm=36;a.poleConfiguration='1P+N';
 p.lines[0].modules=2;p.branchDevices[0].modules=2;
 const c=catalogue(p),lookup=c.lookup;
 assert.deepEqual(c.issues,[]);
 const w=workbench(p,lookup,[{id:a.id,device:lookup(a.id)}]).rows[0];
 assert.equal(w.reasons.includes('ARTICLE_POLES_MISMATCH'),false);
 assert.equal(w.selectedArticle.poleConfiguration,'1P+N');
 assert.equal(singleLine(p,lookup).nodes.find(x=>x.id==='CIRCUIT:L1').article.poleConfiguration,'1P+N');
 assert.equal(bom(p,lookup).items[0].poleConfiguration,'1P+N');
 const svg=front(lookup(a.id));
 assert.match(svg,/1P\+N/);
});
test('schematic audit rejects outdated pole configuration',()=>{
 const {p,a}=fixture(),c=catalogue(p),view=singleLine(p,c.lookup);
 view.nodes.find(x=>x.id==='CIRCUIT:L1').article.poleConfiguration='2P';
 assert.ok(schematicAudit(p,view,c.lookup).issues.some(x=>x.code==='SCHEMATIC_CIRCUIT_POLE_CONFIGURATION_STALE'));
});
test('schematic audit rejects outdated breaking capacity voltage',()=>{
 const {p,a}=fixture(),c=catalogue(p),view=singleLine(p,c.lookup);
 view.nodes.find(x=>x.id==='CIRCUIT:L1').article.icnVoltageV=400;
 assert.ok(schematicAudit(p,view,c.lookup).issues.some(x=>x.code==='SCHEMATIC_CIRCUIT_ICN_VOLTAGE_STALE'));
});
test('BOM audit rejects outdated source-reviewed date',()=>{
 const {p,a}=fixture(),c=catalogue(p),b=bom(p,c.lookup);
 b.items[0].sourceReviewedAt='2026-01-01';
 assert.ok(bomAudit(p,board(p,c.lookup),b,c.lookup).issues.some(x=>x.code==='OUTPUT_BOM_SOURCE_REVIEW_DATE_STALE'));
});
test('protection audit rejects outdated rated standard',()=>{
 const {p,a}=fixture(),c=catalogue(p),w=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]);
 w.rows[0].selectedArticle.icnStandard='OTHER';
 assert.ok(protectionAudit(p,w,c.lookup).issues.some(x=>x.code==='PROTECTION_ICN_STANDARD_STALE'));
});
test('printed draft includes reviewed date and factory product source without making approval claim',()=>{
 const {p,a}=fixture(),c=catalogue(p),auditSection=audit(p,c.lookup);
 const html=print({projectTitle:'Test',overallStatus:'UNKNOWN',sections:{catalogEvidence:auditSection}});
 assert.match(html,/Паспортные данные выбранного оборудования/);
 assert.match(html,/2026-11-14/);
 assert.match(html,/https:\/\/example.org\/product/);
 assert.match(html,/НЕ ДЛЯ МОНТАЖА/);
});
test('issue register and bundle source contain provenance section wiring',()=>{
 const root=path.join(__dirname,'..'),bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 const registry=fs.readFileSync(path.join(root,'engineering-issue-register-v1.js'),'utf8');
 assert.match(bundle,/epCatalogEvidenceAuditV1/);
 assert.match(bundle,/const sections=\{catalogueIntegrity,catalogEvidence/);
 assert.match(registry,/sections\.catalogEvidence/);
});
