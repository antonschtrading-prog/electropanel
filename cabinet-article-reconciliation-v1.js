'use strict';
// Reconcile selected catalogue articles across BOM, DIN placement and visual evidence.
// This is an identity and quantity audit, not an electrical or installation approval.
function epCabinetArticleReconciliationV1(project,lookup){
 const issues=[],rows=[];
 const safeSku=x=>typeof x==='string'&&x.trim()?x.trim():null;
 const fail=code=>({schema:'electropanel.cabinet.article.reconciliation.1',status:'BLOCKED',
  rows,issues:[{code,level:'BLOCKED'}],counts:{board:0,bom:0,visual:0,matched:0},
  engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof epDraftBoardPlanV1!=='function'||typeof epDraftBomV1!=='function'||
  typeof epBoardVisualAuditV1!=='function')return fail('CABINET_ARTICLE_ENGINES_UNAVAILABLE');
 const catalogueSnapshot=new Map();
 const stableLookup=sku=>{
  if(catalogueSnapshot.has(sku)){
   const entry=catalogueSnapshot.get(sku);
   if(entry.failed)throw Error('Catalogue lookup failed');
   return entry.value;
  }
  try{
   const value=typeof lookup==='function'?lookup(sku):null;
   const snapshot=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
   catalogueSnapshot.set(sku,{value:snapshot,failed:false});
   return snapshot;
  }catch(_){catalogueSnapshot.set(sku,{failed:true});throw Error('Catalogue lookup failed');}
 };
 let board,bom,visual;
 try{
  board=epDraftBoardPlanV1(project,stableLookup);
  bom=epDraftBomV1(project,stableLookup);
  visual=epBoardVisualAuditV1(project,stableLookup);
 }catch(_){return fail('CABINET_ARTICLE_RECONCILIATION_FAILED');}
 const boardById=new Map(),bomById=new Map(),visualById=new Map();
 const add=(code,id,level='BLOCKED')=>issues.push({code,deviceId:id,level});
 for(const p of board.placements||[]){
  if(boardById.has(p.deviceId))add('CABINET_ARTICLE_BOARD_ID_DUPLICATE',p.deviceId);
  boardById.set(p.deviceId,p);
 }
 for(const d of bom.devices||[]){
  if(bomById.has(d.id))add('CABINET_ARTICLE_BOM_ID_DUPLICATE',d.id);
  bomById.set(d.id,d);
 }
 for(const v of visual.rows||[]){
  if(visualById.has(v.deviceId))add('CABINET_ARTICLE_VISUAL_ID_DUPLICATE',v.deviceId);
  visualById.set(v.deviceId,v);
 }
 const ids=[...new Set([...boardById.keys(),...bomById.keys(),...visualById.keys()])].sort();
 let matched=0;
 for(const id of ids){
  const p=boardById.get(id),b=bomById.get(id),v=visualById.get(id),codes=[];
  const check=(bad,code)=>{if(bad){codes.push(code);add(code,id);}};
  check(!p,'CABINET_ARTICLE_BOARD_MISSING');
  check(!b,'CABINET_ARTICLE_BOM_MISSING');
  check(!v,'CABINET_ARTICLE_VISUAL_MISSING');
  if(p&&b)check(safeSku(p.article)!==safeSku(b.sku),'CABINET_ARTICLE_BOM_SKU_MISMATCH');
  if(p&&v)check(safeSku(p.article)!==safeSku(v.sku),'CABINET_ARTICLE_VISUAL_SKU_MISMATCH');
  if(p)check(!safeSku(p.article),'CABINET_ARTICLE_UNSELECTED');
  if(v)check(v.assetStatus==='ASSET_REJECTED','CABINET_ARTICLE_VISUAL_ASSET_REJECTED');
  if(p&&v)check(p.modules!==v.modules,'CABINET_ARTICLE_VISUAL_MODULES_MISMATCH');
  if(v)check(v.evidence?.includes('VISUAL_ARTICLE_ID_MISMATCH'),
   'CABINET_ARTICLE_CATALOGUE_IDENTITY_MISMATCH');
  if(!codes.length)matched++;
  rows.push({deviceId:id,boardSku:p?.article||null,bomSku:b?.sku||null,
   visualSku:v?.sku||null,modules:p?.modules??null,railIndex:p?.railIndex??null,
   startModule:p?.startModule??null,issues:codes,
   status:codes.length?'BLOCKED':'REVIEW_REQUIRED'});
 }
 for(const [source,r] of [['BOARD',board],['BOM',bom],['VISUAL',visual]])
  if(r.status==='BLOCKED')add('CABINET_ARTICLE_'+source+'_BLOCKED',null);
 return {schema:'electropanel.cabinet.article.reconciliation.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  rows,issues,counts:{board:boardById.size,bom:bomById.size,
   visual:visualById.size,matched,unmatched:rows.length-matched,
   expected:rows.length},engineeringApproved:false,
  ready_for_installation:false,manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetArticleReconciliationV1};
