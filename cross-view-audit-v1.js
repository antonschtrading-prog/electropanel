'use strict';
// Cross-view consistency audit. Read-only, fail-closed, no installation approval.
function epCrossViewAuditV1(project, protection, board, bom, singleLine, lookupSku) {
 const issues=[], add=(code,level='BLOCKED',lineId=null)=>issues.push({code,level,lineId});
 const lines=project?.lines;
 const bomItems=Array.isArray(bom?.items)?bom.items:null;
 if(!Array.isArray(lines)||lines.length>1000)
  return {schema:'electropanel.crossview.audit.1',status:'BLOCKED',issues:[{code:'PROJECT_INVALID',level:'BLOCKED',lineId:null}],engineeringApproved:false,ready_for_installation:false};
 const ids=new Set();
 for(const l of lines) {
  if(!l||typeof l.id!=='string'||!l.id||ids.has(l.id))add('LINE_ID_INVALID_OR_DUPLICATE','BLOCKED',l?.id??null);
  else ids.add(l.id);
 }
 if(!protection||!Array.isArray(protection.rows))add('PROTECTION_VIEW_MISSING');
 if(!board||!Array.isArray(board.placements))add('BOARD_VIEW_MISSING');
 const pRows=protection?.rows||[], placements=board?.placements||[];
 const pIds=new Set(), placed=new Set(), deviceIds=new Set();
 for(const row of pRows){
  if(!row||!ids.has(row.lineId)||pIds.has(row.lineId)){add('PROTECTION_ROW_ORPHAN_OR_DUPLICATE','BLOCKED',row?.lineId??null);continue;}
  pIds.add(row.lineId);
  const line=lines.find(l=>l?.id===row.lineId);
  if((line.catalogSku||null)!==(row.selectedSku||null))add('PROTECTION_SKU_STALE','BLOCKED',row.lineId);
  if(row.status!=='BLOCKED'&&row.status!=='UNKNOWN')add('UNSUPPORTED_PROTECTION_STATUS','BLOCKED',row.lineId);
 }
 for(const id of ids)if(!pIds.has(id))add('PROTECTION_ROW_MISSING','BLOCKED',id);
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 const sharedDevices=Array.isArray(project.sharedDevices)?project.sharedDevices:[];
 const sharedIds=new Set(),placedShared=new Set();
 for(const d of sharedDevices){
  if(!d||typeof d.id!=='string'||!d.id||sharedIds.has(d.id))
   add('SHARED_DEVICE_ID_INVALID_OR_DUPLICATE','BLOCKED',d?.id??null);
  else sharedIds.add(d.id);
 }
 for(const item of placements){
  if(!item||typeof item.deviceId!=='string'||!Number.isInteger(item.railIndex)||!Number.isInteger(item.startModule)||!Number.isInteger(item.modules)||item.railIndex<0||item.startModule<0||item.modules<1){add('PLACEMENT_INVALID');continue;}
  if(deviceIds.has(item.deviceId))add('PLACEMENT_DEVICE_DUPLICATE','BLOCKED',item.deviceId);
  deviceIds.add(item.deviceId);
  if(item.kind==='shared'){
   const matches=sharedDevices.filter(d=>d?.id===item.deviceId);
   if(matches.length!==1)add('PLACEMENT_SHARED_UNMATCHED','BLOCKED',item.deviceId);
   else{
    placedShared.add(item.deviceId);
    if(item.article!==(matches[0].catalogSku||null))add('PLACEMENT_SHARED_SKU_STALE','BLOCKED',item.deviceId);
    if(item.modules!==matches[0].modules)add('PLACEMENT_SHARED_WIDTH_MISMATCH','BLOCKED',item.deviceId);
   }
  }else if(item.kind!=='branch')add('PLACEMENT_KIND_INVALID','BLOCKED',item.deviceId);
  if(item.kind==='branch'){
   const matching=branches?branches.filter(b=>b?.id===item.deviceId):lines.filter(l=>l?.id===item.deviceId);
   if(matching.length!==1){add('PLACEMENT_BRANCH_UNMATCHED','BLOCKED',item.deviceId);continue;}
   const id=branches?matching[0].circuitId:matching[0].id;
   if(placed.has(id))add('PLACEMENT_BRANCH_DUPLICATE','BLOCKED',id);
   placed.add(id);
   const line=lines.find(l=>l?.id===id);
   if(!line||item.article!==(line.catalogSku||null))add('PLACEMENT_SKU_STALE','BLOCKED',id);
  }
 }
 for(const id of ids)if(!placed.has(id))add('PLACEMENT_BRANCH_MISSING','BLOCKED',id);
 for(const id of sharedIds)if(!placedShared.has(id))add('PLACEMENT_SHARED_MISSING','BLOCKED',id);
 if(board&&Number.isInteger(board.capacityPerRail)&&Number.isInteger(board.rails)&&board.rails>0&&board.rails<=100&&board.capacityPerRail>0&&board.capacityPerRail<=200){
  const occupied=new Set();
  for(const p of placements){
   if(!Number.isInteger(p.railIndex)||!Number.isInteger(p.startModule)||!Number.isInteger(p.modules))continue;
   if(p.railIndex<0||p.railIndex>=board.rails||p.startModule<0||p.startModule+p.modules>board.capacityPerRail)add('PLACEMENT_OUT_OF_BOUNDS');
   for(let m=p.startModule;m<p.startModule+p.modules&&m<p.startModule+1000;m++){
    const key=p.railIndex+':'+m;
    if(occupied.has(key))add('PLACEMENT_OVERLAP');
    occupied.add(key);
   }
  }
 }else add('BOARD_CAPACITY_UNVERIFIED','UNKNOWN');
 if(!bomItems)add('BOM_VIEW_MISSING');
 else {
  const expected=new Map();
  const addExpected=(sku,id)=>{if(typeof sku!=='string'||!sku)return;
   const a=expected.get(sku)||[];a.push(id);expected.set(sku,a);};
  for(const l of lines)if(l)addExpected(l.catalogSku,l.id);
  for(const d of Array.isArray(project.sharedDevices)?project.sharedDevices:[])if(d)addExpected(d.catalogSku,d.id);
  const seen=new Set();
  for(const item of bomItems){
   if(!item||typeof item.key!=='string'||seen.has(item.key)){
    add('BOM_ROW_INVALID_OR_DUPLICATE');continue;
   }
   seen.add(item.key);
   const owners=expected.get(item.key)||[];
   if(!owners.length)add('BOM_ARTICLE_ORPHAN','BLOCKED',item.key);
   if(item.quantity!==owners.length)add('BOM_QUANTITY_MISMATCH','BLOCKED',item.key);
   if(!Array.isArray(item.owners)||item.owners.length!==owners.length||
    owners.some(owner=>!item.owners.includes(owner)))add('BOM_OWNERS_MISMATCH','BLOCKED',item.key);
  }
  for(const sku of expected.keys())if(!seen.has(sku))add('BOM_ARTICLE_MISSING','BLOCKED',sku);
 }
 // Compare the schematic with project entities and the audited catalogue.
 // Legacy four-argument callers remain supported.
 if(arguments.length>=5){
  const schematic=epSchematicCrossViewV1(project,singleLine,lookupSku);
  issues.push(...schematic.issues);
  const catalogueOutputs=epCatalogOutputCrossViewV1(project,board,bom,lookupSku);
  issues.push(...catalogueOutputs.issues);
  if(arguments.length>=6){
   const protectionOutputs=epProtectionProjectionAuditV1(project,protection,lookupSku);
   issues.push(...protectionOutputs.issues);
  }
 }
 if(board?.status==='BLOCKED')add('BOARD_HAS_BLOCKING_ISSUES');
 if(protection?.status==='BLOCKED')add('PROTECTION_HAS_BLOCKING_ISSUES');
 // This audit never certifies normative calculations or physical installation.
 return {schema:'electropanel.crossview.audit.1',status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,checkedCircuits:ids.size,engineeringApproved:false,ready_for_installation:false};
}

/**
 * Read-only reconciliation of the draft single-line view with the project.
 * Checks referential integrity and stale projections, NOT wiring correctness.
 * Unknown catalogue values never become inferred manufacturer specifications.
 */
function epSchematicCrossViewV1(project,singleLine,lookupSku){
 const issues=[],add=(code,lineId=null,level='BLOCKED')=>issues.push({code,level,lineId});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices)||
    !singleLine||!Array.isArray(singleLine.nodes)||!Array.isArray(singleLine.edges))
  return {status:'BLOCKED',issues:[{code:'SCHEMATIC_VIEW_INVALID',level:'BLOCKED'}],engineeringApproved:false};
 const lines=new Map(),groups=new Map(),branches=new Map();
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id)continue;
  if(lines.has(line.id))add('SCHEMATIC_PROJECT_CIRCUIT_DUPLICATE',line.id);
  lines.set(line.id,line);
 }
 for(const group of project.sharedDevices){
  if(!group||typeof group.id!=='string'||!group.id)continue;
  if(groups.has(group.id))add('SCHEMATIC_PROJECT_GROUP_DUPLICATE',group.id);
  groups.set(group.id,group);
 }
 if(project.branchDevices!==undefined&&!Array.isArray(project.branchDevices))add('SCHEMATIC_BRANCH_LIST_INVALID');
 for(const branch of Array.isArray(project.branchDevices)?project.branchDevices:[]){
  if(!branch||typeof branch.circuitId!=='string')continue;
  if(branches.has(branch.circuitId))add('SCHEMATIC_BRANCH_DUPLICATE',branch.circuitId);
  branches.set(branch.circuitId,branch);
 }
 const nodes=new Map(),expectedIds=new Set(['SOURCE:MAIN']);
 for(const node of singleLine.nodes){
  if(!node||typeof node.id!=='string'||!node.id){add('SCHEMATIC_NODE_INVALID');continue;}
  if(nodes.has(node.id)){add('SCHEMATIC_NODE_DUPLICATE',node.id);continue;}
  nodes.set(node.id,node);
 }
 const source=nodes.get('SOURCE:MAIN');
 if(!source)add('SCHEMATIC_SOURCE_MISSING');
 else if(source.type!=='source')add('SCHEMATIC_SOURCE_TYPE_MISMATCH');
 const catalog=id=>{
  if(!id)return null;
  if(typeof lookupSku!=='function'){add('SCHEMATIC_CATALOG_LOOKUP_MISSING',id);return null;}
  try{return lookupSku(id)||null;}catch(_){add('SCHEMATIC_CATALOG_LOOKUP_FAILED',id);return null;}
 };
 const compareArticle=(prefix,owner,declared,sku)=>{
  if(!sku){
   if(declared!=null)add(prefix+'_ARTICLE_UNEXPECTED',owner);
   return;
  }
  const actual=catalog(sku);
  if(!actual){
   add(prefix+'_ARTICLE_UNRESOLVED',owner);
   return;
  }
  if(!declared||typeof declared!=='object'){add(prefix+'_ARTICLE_PROJECTION_MISSING',owner);return;}
  for(const [field,code] of [
   ['maker','MAKER_STALE'],['series','SERIES_STALE'],['label','LABEL_STALE'],
   ['kind','KIND_STALE'],['inA','RATING_STALE'],['icnKa','BREAKING_CAPACITY_STALE'],['poles','POLES_STALE'],
   ['modules','MODULES_STALE']
  ]){
   // Each component declares only the manufacturer fields that its rendering supports.
   if(Object.prototype.hasOwnProperty.call(declared,field)&&
      (declared[field]??null)!==(actual[field]??null))add(prefix+'_'+code,owner);
  }
 };
 const expectedEdges=new Set(),membership=new Map();
 for(const [id,g] of groups){
  const nodeId='RCD:'+id;expectedIds.add(nodeId);
  const n=nodes.get(nodeId);
  if(!n)add('SCHEMATIC_GROUP_MISSING',id);
  else{
   if(n.type!=='rcd')add('SCHEMATIC_GROUP_TYPE_MISMATCH',id);
   if(n.name!==(g.label||g.id))add('SCHEMATIC_GROUP_LABEL_STALE',id);
   if((n.sku||null)!==(g.catalogSku||null))add('SCHEMATIC_GROUP_SKU_STALE',id);
   if((n.templateId||null)!==(g.templateId||null))add('SCHEMATIC_GROUP_TEMPLATE_STALE',id);
   compareArticle('SCHEMATIC_GROUP',id,n.article,g.catalogSku);
  }
  if(!Array.isArray(g.circuitIds)){add('SCHEMATIC_GROUP_CIRCUITS_INVALID',id);continue;}
  const inGroup=new Set();
  for(const circuitId of g.circuitIds){
   if(inGroup.has(circuitId))add('SCHEMATIC_GROUP_MEMBER_DUPLICATE',id);
   inGroup.add(circuitId);
   if(!lines.has(circuitId))add('SCHEMATIC_GROUP_MEMBER_ORPHAN',id);
   if(membership.has(circuitId))add('SCHEMATIC_GROUP_MEMBER_CONFLICT',circuitId);
   membership.set(circuitId,nodeId);
  }
  expectedEdges.add('SOURCE:MAIN|'+nodeId);
 }
 for(const [id,l] of lines){
  const nodeId='CIRCUIT:'+id;expectedIds.add(nodeId);
  const n=nodes.get(nodeId);
  if(!n){add('SCHEMATIC_CIRCUIT_MISSING',id);continue;}
  if(n.type!=='circuit')add('SCHEMATIC_CIRCUIT_TYPE_MISMATCH',id);
  if(n.lineId!==id)add('SCHEMATIC_CIRCUIT_ID_STALE',id);
  if(n.name!==(l.name||l.id))add('SCHEMATIC_CIRCUIT_LABEL_STALE',id);
  if((n.phase||null)!==(l.phase||null))add('SCHEMATIC_CIRCUIT_PHASE_STALE',id);
  if((n.sku||null)!==(l.catalogSku||null))add('SCHEMATIC_CIRCUIT_SKU_STALE',id);
  const branch=branches.get(id);
  if((n.branchId||null)!==(branch?.id||null))add('SCHEMATIC_CIRCUIT_BRANCH_STALE',id);
  compareArticle('SCHEMATIC_CIRCUIT',id,n.article,l.catalogSku);
  const expectDesign={
   ibA:l.overloadInput?.ibA??null,izA:l.overloadInput?.izA??null,
   ikKa:l.faultInput?.ikKa??null,
   calculationReviewRequired:l.calculationReview?.required===true,
   loadCurrentStale:l.loadCurrentCalculation?.stale===true,
   inputSource:l.protectionInputSource||null
  };
  if(!n.design||typeof n.design!=='object')add('SCHEMATIC_DESIGN_EVIDENCE_MISSING',id);
  else for(const [key,code] of [
   ['ibA','IB_STALE'],['izA','IZ_STALE'],['ikKa','IK_STALE'],
   ['calculationReviewRequired','REVIEW_FLAG_STALE'],
   ['loadCurrentStale','CALCULATED_CURRENT_STATUS_STALE'],
   ['inputSource','CURRENT_PROVENANCE_STALE']
  ])if((n.design[key]??null)!==(expectDesign[key]??null))
   add('SCHEMATIC_DESIGN_'+code,id);
  expectedEdges.add((membership.get(id)||'SOURCE:MAIN')+'|'+nodeId);
 }
 for(const [id,n] of nodes){
  if(!expectedIds.has(id))add('SCHEMATIC_NODE_ORPHAN',id);
  if(id.startsWith('RCD:')&&n.type!=='rcd')add('SCHEMATIC_RCD_NODE_KIND_STALE',id);
  if(id.startsWith('CIRCUIT:')&&n.type!=='circuit')add('SCHEMATIC_BRANCH_NODE_KIND_STALE',id);
 }
 const seenEdges=new Set();
 for(const edge of singleLine.edges){
  if(!edge||typeof edge.from!=='string'||typeof edge.to!=='string'){add('SCHEMATIC_EDGE_INVALID');continue;}
  if(!nodes.has(edge.from)||!nodes.has(edge.to))add('SCHEMATIC_EDGE_ORPHAN',edge.to);
  if(edge.kind!=='declared_group_association')add('SCHEMATIC_EDGE_KIND_STALE',edge.to);
  const key=edge.from+'|'+edge.to;
  if(seenEdges.has(key))add('SCHEMATIC_EDGE_DUPLICATE',edge.to);
  seenEdges.add(key);
  if(!expectedEdges.has(key))add('SCHEMATIC_EDGE_UNEXPECTED',edge.to);
 }
 for(const key of expectedEdges)if(!seenEdges.has(key))
  add('SCHEMATIC_EDGE_MISSING',key.split('|')[1]);
 return {status:issues.length?'BLOCKED':'UNKNOWN',issues,checkedCircuits:lines.size,
  checkedGroups:groups.size,engineeringApproved:false};
}


/**
 * Reconcile project apparatus -> DIN placements -> grouped BOM.
 * The audit reports stale declared data and never manufactures missing values.
 */
function epCatalogOutputCrossViewV1(project,board,bom,lookupSku){
 const issues=[],add=(code,lineId=null,level='BLOCKED')=>issues.push({code,level,lineId});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices))
  return {status:'BLOCKED',issues:[{code:'OUTPUT_PROJECT_INVALID',level:'BLOCKED'}],engineeringApproved:false};
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 const byCircuit=new Map(),lineIds=new Set();
 for(const line of project.lines)if(line&&typeof line.id==='string')lineIds.add(line.id);
 if(branches){
  for(const branch of branches){
   if(!branch||typeof branch.circuitId!=='string'){add('OUTPUT_BRANCH_INVALID');continue;}
   if(!lineIds.has(branch.circuitId))add('OUTPUT_BRANCH_ORPHAN',branch.circuitId);
   if(byCircuit.has(branch.circuitId))add('OUTPUT_BRANCH_DUPLICATE',branch.circuitId);
   byCircuit.set(branch.circuitId,branch);
  }
 }
 const expectedDevices=new Map();
 for(const line of project.lines){
  if(!line||typeof line.id!=='string')continue;
  const branch=byCircuit.get(line.id);
  if(branches&&!branch)add('OUTPUT_BRANCH_MISSING',line.id);
  if(branch){
   if(branch.modules!==line.modules)add('OUTPUT_BRANCH_MODULES_STALE',line.id);
   if(branch.label!==(line.device||''))add('OUTPUT_BRANCH_LABEL_STALE',line.id);
   if((branch.templateId||null)!==(line.templateId||null))add('OUTPUT_BRANCH_TEMPLATE_STALE',line.id);
  }
  if(line.catalogSku)expectedDevices.set(branch?.id||line.id,
   {id:branch?.id||line.id,owner:line.id,kind:'branch',sku:line.catalogSku,
    modules:branch?.modules??line.modules});
 }
 for(const d of project.sharedDevices){
  if(!d||typeof d.id!=='string')continue;
  if(d.catalogSku)expectedDevices.set(d.id,
   {id:d.id,owner:d.id,kind:'shared',sku:d.catalogSku,modules:d.modules});
 }
 const auditCatalogue=id=>{
  if(typeof lookupSku!=='function'){add('OUTPUT_CATALOG_LOOKUP_UNAVAILABLE',id);return null;}
  try{return lookupSku(id)||null;}catch(_){add('OUTPUT_CATALOG_LOOKUP_FAILED',id);return null;}
 };
 if(board&&Array.isArray(board.placements)){
  if(Number.isInteger(project.railCount)&&board.rails!==project.railCount)add('OUTPUT_BOARD_RAILS_STALE');
  if(Number.isInteger(project.railCapacity)&&board.capacityPerRail!==project.railCapacity)add('OUTPUT_BOARD_CAPACITY_STALE');
  const positions=new Map();
  for(const p of board.placements){
   if(!p||typeof p.deviceId!=='string')continue;
   positions.set(p.deviceId,p);
   const expected=expectedDevices.get(p.deviceId);
   if(expected){
    if(p.modules!==expected.modules)add('OUTPUT_BOARD_MODULES_STALE',expected.owner);
    if(p.kind!==expected.kind)add('OUTPUT_BOARD_DEVICE_KIND_STALE',expected.owner);
    if((p.article||null)!==expected.sku)add('OUTPUT_BOARD_SKU_STALE',expected.owner);
   }
  }
  for(const manual of Array.isArray(project.manualLayoutV1)?project.manualLayoutV1:[]){
   if(!manual||typeof manual.deviceId!=='string')continue;
   const p=positions.get(manual.deviceId);
   if(p&&(p.railIndex!==manual.railIndex||p.startModule!==manual.startModule))
    add('OUTPUT_MANUAL_PLACEMENT_STALE',manual.deviceId);
  }
 }
 if(!bom||!Array.isArray(bom.items)||!Array.isArray(bom.devices)){
  add('OUTPUT_BOM_DEVICE_MAP_UNAVAILABLE');
 }else{
  const mapped=new Set();
  for(const d of bom.devices){
   if(!d||typeof d.id!=='string'){add('OUTPUT_BOM_DEVICE_INVALID');continue;}
   if(mapped.has(d.id))add('OUTPUT_BOM_DEVICE_DUPLICATE',d.id);
   mapped.add(d.id);
   const expected=expectedDevices.get(d.id);
   if(!expected){add('OUTPUT_BOM_DEVICE_ORPHAN',d.id);continue;}
   if(d.owner!==expected.owner)add('OUTPUT_BOM_OWNER_STALE',expected.owner);
   if(d.kind!==expected.kind)add('OUTPUT_BOM_KIND_STALE',expected.owner);
   if(d.sku!==expected.sku)add('OUTPUT_BOM_SKU_STALE',expected.owner);
  }
  for(const expected of expectedDevices.values())
   if(!mapped.has(expected.id))add('OUTPUT_BOM_DEVICE_MISSING',expected.owner);
  if(bom.expectedDevices!==undefined&&bom.expectedDevices!==project.lines.length+project.sharedDevices.length)
   add('OUTPUT_BOM_EXPECTED_COUNT_STALE');
  if(bom.totalCataloguedDevices!==undefined&&
     bom.totalCataloguedDevices!==bom.items.reduce((n,x)=>n+(Number.isFinite(x?.quantity)?x.quantity:0),0))
   add('OUTPUT_BOM_TOTAL_COUNT_STALE');
  if(bom.distinctArticles!==undefined&&bom.distinctArticles!==bom.items.length)
   add('OUTPUT_BOM_DISTINCT_COUNT_STALE');
  const seen=new Set();
  for(const item of bom.items){
   if(!item||typeof item.key!=='string'||!item.key)continue;
   if(seen.has(item.key))continue;
   seen.add(item.key);
   const actual=auditCatalogue(item.key);
   if(!actual){add('OUTPUT_BOM_ARTICLE_UNRESOLVED',item.key);continue;}
   for(const [field,code] of [
    ['sku','MANUFACTURER_SKU_STALE'],['maker','MAKER_STALE'],['series','SERIES_STALE'],
    ['label','LABEL_STALE'],['kind','KIND_STALE'],['modules','MODULES_STALE'],
    ['widthMm','WIDTH_STALE'],['source','SOURCE_STALE']
   ])if((item[field]??null)!==(actual[field]??null))add('OUTPUT_BOM_'+code,item.key);
  }
 }
 return {status:issues.length?'BLOCKED':'UNKNOWN',issues,engineeringApproved:false};
}


/**
 * Compare selected apparatus, design inputs and their derived protection row
 * to a single project snapshot. No approval is produced by matching rows.
 */
function epProtectionProjectionAuditV1(project,protection,lookupSku){
 const issues=[],add=(code,lineId=null)=>issues.push({code,level:'BLOCKED',lineId});
 if(!project||!Array.isArray(project.lines)||!protection||!Array.isArray(protection.rows))
  return {status:'BLOCKED',issues:[{code:'PROTECTION_PROJECTION_UNAVAILABLE',level:'BLOCKED'}],engineeringApproved:false};
 const value=x=>{
  if(x===null||x===undefined||typeof x==='boolean'||typeof x==='object')return null;
  const s=String(x).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0?n:null;
 };
 const lines=new Map(),rows=new Map();
 for(const l of project.lines){
  if(!l||typeof l.id!=='string'||!l.id){add('PROTECTION_PROJECT_CIRCUIT_INVALID');continue;}
  if(lines.has(l.id))add('PROTECTION_PROJECT_CIRCUIT_DUPLICATE',l.id);
  lines.set(l.id,l);
 }
 for(const r of protection.rows){
  if(!r||typeof r.lineId!=='string'||!r.lineId){add('PROTECTION_ROW_INVALID');continue;}
  if(rows.has(r.lineId))add('PROTECTION_ROW_DUPLICATE',r.lineId);
  if(!lines.has(r.lineId))add('PROTECTION_ROW_ORPHAN',r.lineId);
  rows.set(r.lineId,r);
 }
 const compare=(lineId,a,b,code)=>{if(a!==b)add(code,lineId);};
 for(const [id,line] of lines){
  const r=rows.get(id);
  if(!r){add('PROTECTION_ROW_MISSING',id);continue;}
  compare(id,value(r.ibA),value(line.overloadInput?.ibA),'PROTECTION_IB_STALE');
  compare(id,value(r.izA),value(line.overloadInput?.izA),'PROTECTION_IZ_STALE');
  compare(id,value(r.ikKa),value(line.faultInput?.ikKa??line.ikKa??line.breakingCapacityInput?.ikKa),'PROTECTION_IK_STALE');
  compare(id,r.phase||null,line.phase||null,'PROTECTION_PHASE_STALE');
  compare(id,r.selectedSku||null,line.catalogSku||null,'PROTECTION_SELECTED_SKU_STALE');
  const review=!!line.calculationReview?.required,stale=!!line.loadCurrentCalculation?.stale;
  const expectedIb=value(line.overloadInput?.ibA),calculated=value(line.loadCurrentCalculation?.roundedIbA);
  const staleReasons=[
   ['CALCULATION_REVIEW_STALE',review,'PROTECTION_REVIEW_STATUS_STALE'],
   ['LOAD_CURRENT_STALE',stale,'PROTECTION_LOAD_STATUS_STALE'],
   ['IB_DIFFERS_FROM_CALCULATION',calculated!==null&&expectedIb!==calculated,
    'PROTECTION_IB_CALC_STATUS_STALE']
  ];
  if(!Array.isArray(r.reasons)){add('PROTECTION_REASONS_INVALID',id);}
  else for(const [reason,expected,code] of staleReasons)
   if(r.reasons.includes(reason)!==expected)add(code,id);
  if(!line.catalogSku){
   if(r.selectedArticle!=null)add('PROTECTION_UNSELECTED_ARTICLE_STALE',id);
   continue;
  }
  if(typeof lookupSku!=='function'){add('PROTECTION_LOOKUP_UNAVAILABLE',id);continue;}
  let article=null;
  try{article=lookupSku(line.catalogSku);}catch(_){add('PROTECTION_LOOKUP_FAILED',id);}
  if(!article){add('PROTECTION_ARTICLE_UNRESOLVED',id);continue;}
  if(!r.selectedArticle||typeof r.selectedArticle!=='object'){
   add('PROTECTION_SELECTED_ARTICLE_MISSING',id);continue;
  }
  for(const [field,code] of [
   ['kind','KIND_STALE'],['sku','MANUFACTURER_SKU_STALE'],['maker','MAKER_STALE'],
   ['series','SERIES_STALE'],['label','LABEL_STALE'],['inA','NOMINAL_STALE'],
   ['icnKa','BREAKING_CAPACITY_STALE'],['poles','POLES_STALE'],
   ['modules','MODULES_STALE'],['source','SOURCE_STALE'],
   ['verificationStatus','EVIDENCE_STALE']
  ]){
   const expected=article[field]??(field==='sku'?line.catalogSku:
    field==='verificationStatus'?'UNKNOWN':null);
   compare(id,r.selectedArticle[field]??null,expected,'PROTECTION_'+code);
  }
 }
 return {status:issues.length?'BLOCKED':'UNKNOWN',issues,
  checkedCircuits:lines.size,engineeringApproved:false,ready_for_installation:false};
}

if(typeof module!=='undefined'&&module.exports)module.exports={epCrossViewAuditV1,epSchematicCrossViewV1,epCatalogOutputCrossViewV1,epProtectionProjectionAuditV1};
