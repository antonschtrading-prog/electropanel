'use strict';
// Device identity reconciliation across the existing single-line, BOM and DIN views.
// Never substitutes an article or treats a matching ID as proof of equipment compatibility.
function epProjectDeviceIdentityV1(project,lookupSku){
 const issues=[],rows=[],add=(code,level='UNKNOWN',deviceId=null)=>issues.push({code,level,deviceId});
 const finish=()=>({schema:'electropanel.project.device-identity.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  rows,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices)||
 project.lines.length>400||project.sharedDevices.length>200){add('IDENTITY_PROJECT_INVALID','BLOCKED');return finish();}
 const sections={};
 for(const [name,fn] of [['BOARD',typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1:null],
  ['BOM',typeof epDraftBomV1==='function'?epDraftBomV1:null],
  ['SINGLE_LINE',typeof epSingleLineDraftV1==='function'?epSingleLineDraftV1:null]]){
  if(!fn){add('IDENTITY_'+name+'_UNAVAILABLE','BLOCKED');continue;}
  try{sections[name]=fn(project,lookupSku);if(sections[name].status==='BLOCKED')add('IDENTITY_'+name+'_BLOCKED','BLOCKED');}
  catch(_){add('IDENTITY_'+name+'_FAILED','BLOCKED');}
 }
 const placements=sections.BOARD?.placements||[],bom=sections.BOM?.devices||[],nodes=sections.SINGLE_LINE?.nodes||[];
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:[];
 const expected=[];
 for(const l of project.lines){
  if(!l||typeof l.id!=='string'||!l.id){add('IDENTITY_CIRCUIT_INVALID','BLOCKED');continue;}
  const b=branches.filter(x=>x?.circuitId===l.id);
  if(b.length>1)add('IDENTITY_BRANCH_DUPLICATE','BLOCKED',l.id);
  if(project.branchDevices!==undefined&&!b.length)add('IDENTITY_BRANCH_MISSING','BLOCKED',l.id);
  expected.push({id:b.length===1?b[0].id:l.id,kind:'branch',owner:l.id,sku:l.catalogSku??null,
   modules:b.length===1?b[0].modules:l.modules,nodeId:'CIRCUIT:'+l.id});
 }
 for(const d of project.sharedDevices){
  if(!d||typeof d.id!=='string'||!d.id){add('IDENTITY_SHARED_INVALID','BLOCKED');continue;}
  expected.push({id:d.id,kind:'shared',owner:d.id,sku:d.catalogSku??null,modules:d.modules,nodeId:'RCD:'+d.id});
 }
 const used=new Set();
 for(const d of expected){
  if(typeof d.id!=='string'||!d.id){add('IDENTITY_DEVICE_ID_MISSING','BLOCKED',d.owner);continue;}
  if(used.has(d.id)){add('IDENTITY_DEVICE_ID_COLLISION','BLOCKED',d.id);continue;}
  used.add(d.id);
  const p=placements.filter(x=>x.deviceId===d.id);
  const b=bom.filter(x=>x.id===d.id&&x.kind===d.kind);
  const s=nodes.filter(x=>x.id===d.nodeId);
  const before=issues.length;
  if(p.length!==1)add(p.length?'IDENTITY_DUPLICATE_PLACEMENT':'IDENTITY_PLACEMENT_MISSING',p.length?'BLOCKED':'UNKNOWN',d.id);
  if(b.length!==1)add(b.length?'IDENTITY_DUPLICATE_BOM':'IDENTITY_BOM_MISSING',b.length?'BLOCKED':'UNKNOWN',d.id);
  if(s.length!==1)add(s.length?'IDENTITY_DUPLICATE_SCHEMATIC':'IDENTITY_SCHEMATIC_MISSING',s.length?'BLOCKED':'UNKNOWN',d.id);
  if(p[0]&&p[0].kind!==d.kind)add('IDENTITY_PLACEMENT_KIND_MISMATCH','BLOCKED',d.id);
  if(p[0]&&p[0].modules!==d.modules)add('IDENTITY_PLACEMENT_MODULE_MISMATCH','BLOCKED',d.id);
  if(b[0]&&b[0].sku!==d.sku)add('IDENTITY_BOM_SKU_MISMATCH','BLOCKED',d.id);
  if(s[0]&&s[0].sku!==d.sku)add('IDENTITY_SCHEMATIC_SKU_MISMATCH','BLOCKED',d.id);
  if(b[0]&&b[0].owner!==d.owner)add('IDENTITY_BOM_OWNER_MISMATCH','BLOCKED',d.id);
  if(p[0]&&p[0].article!==d.sku)add('IDENTITY_PLACEMENT_SKU_MISMATCH','BLOCKED',d.id);
  if(!d.sku)add('IDENTITY_SKU_UNASSIGNED','UNKNOWN',d.id);
  if(!Number.isInteger(d.modules)||d.modules<1)add('IDENTITY_MODULES_INVALID','BLOCKED',d.id);
  rows.push({...d,board:p[0]??null,bom:b[0]??null,schematic:s[0]??null,
   status:issues.length===before?'LINKED_DRAFT':'REVIEW_REQUIRED'});
 }
 for(const p of placements)if(!used.has(p.deviceId))add('IDENTITY_ORPHAN_PLACEMENT','BLOCKED',p.deviceId);
 for(const b of bom)if(!used.has(b.id))add('IDENTITY_ORPHAN_BOM','BLOCKED',b.id);
 for(const n of nodes)if((n.type==='circuit'||n.type==='rcd')&&!expected.some(x=>x.nodeId===n.id))
  add('IDENTITY_ORPHAN_SCHEMATIC','BLOCKED',n.id);
 return finish();
}
if(typeof module!=='undefined')module.exports={epProjectDeviceIdentityV1};
