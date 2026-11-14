'use strict';
// Twenty independent, conservative quality gates. UNKNOWN never means approved.
function epDesignQualityGatesV1(project){
 const issues=[],checks=[];
 const gate=(id,scope,entity,condition,code,status='BLOCKED')=>{
   const outcome=condition?'PASS':status;
   checks.push({id,scope,entity,status:outcome});
   if(condition===false)issues.push({gate:id,scope,entity,code,status});
 };
 const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
 const pos=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 const nonneg=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 const str=x=>typeof x==='string'&&x.trim().length>0;
 if(!obj(project))return {status:'BLOCKED',checks:[],issues:[{code:'PROJECT_INVALID',status:'BLOCKED'}],engineeringApproved:false};
 const lines=Array.isArray(project.lines)?project.lines:[];
 const catalog=Array.isArray(project.catalogArticles)?project.catalogArticles:[];
 const din=obj(project.dinEvidence)?project.dinEvidence:null;
 const ids=new Set(),skus=new Set();
 for(const [i,line] of lines.entries()){
  const entity=str(line?.id)?line.id:String(i);
  gate('G01','circuit',entity,str(line?.id),'CIRCUIT_ID_MISSING','UNKNOWN');
  gate('G02','circuit',entity,!str(line?.id)||!ids.has(line.id),'CIRCUIT_ID_DUPLICATE');
  if(str(line?.id))ids.add(line.id);
  gate('G03','circuit',entity,line?.power===undefined||nonneg(line.power),'CIRCUIT_POWER_INVALID');
  gate('G04','circuit',entity,line?.phase===undefined||['L1','L2','L3','3Ф','3P','1P'].includes(line.phase),'CIRCUIT_PHASE_INVALID');
  const current=line?.loadCurrentCalculation;
  gate('G05','circuit',entity,!obj(current)||current.stale!==true,'LOAD_CURRENT_STALE','UNKNOWN');
  const ib=line?.overloadInput?.ibA;
  gate('G06','circuit',entity,!obj(current)||ib===undefined||!pos(Number(current.roundedIbA))||Math.abs(Number(current.roundedIbA)-Number(ib))<0.011,'LOAD_CURRENT_MISMATCH');
  const section=line?.selectedCableSectionMm2;
  gate('G07','circuit',entity,section===undefined||pos(section),'CABLE_SECTION_INVALID');
  const drop=line?.voltageDropCalculation;
  gate('G08','circuit',entity,!obj(drop)||drop.stale!==true,'VOLTAGE_DROP_STALE','UNKNOWN');
  gate('G09','circuit',entity,!obj(drop)||drop.dropPercent===undefined||drop.maxDropPercent===undefined||(nonneg(drop.dropPercent)&&pos(drop.maxDropPercent)&&drop.dropPercent<=drop.maxDropPercent),'VOLTAGE_DROP_EXCEEDS_DECLARED_LIMIT');
  gate('G10','circuit',entity,!str(line?.catalogSku)||catalog.some(a=>a?.sku===line.catalogSku),'CIRCUIT_CATALOG_SKU_UNRESOLVED','UNKNOWN');
 }
 for(const [i,article] of catalog.entries()){
  const entity=str(article?.sku)?article.sku:String(i);
  gate('G11','catalog',entity,str(article?.sku),'CATALOG_SKU_MISSING','UNKNOWN');
  gate('G12','catalog',entity,!str(article?.sku)||!skus.has(article.sku),'CATALOG_SKU_DUPLICATE');
  if(str(article?.sku))skus.add(article.sku);
  gate('G13','catalog',entity,str(article?.maker)&&str(article?.series),'CATALOG_MAKER_SERIES_MISSING','UNKNOWN');
  gate('G14','catalog',entity,str(article?.source)&&/^https:\/\//i.test(article.source),'CATALOG_SOURCE_MISSING','UNKNOWN');
  gate('G15','catalog',entity,pos(article?.widthMm)&&Number.isInteger(article?.modules)&&article.modules>0,'CATALOG_GEOMETRY_MISSING','UNKNOWN');
 }
 if(din){
  const devices=Array.isArray(din.devices)?din.devices:[];
  gate('G16','din','board',pos(din.railWidthMm),'DIN_RAIL_WIDTH_INVALID');
  const seen=new Set();
  for(const [i,d] of devices.entries()){
   const entity=str(d?.id)?d.id:String(i);
   gate('G17','din',entity,str(d?.id)&&!seen.has(d.id),'DIN_DEVICE_ID_INVALID');
   if(str(d?.id))seen.add(d.id);
   gate('G18','din',entity,nonneg(d?.xMm)&&pos(d?.widthMm),'DIN_DEVICE_DIMENSIONS_INVALID');
   gate('G19','din',entity,!pos(din.railWidthMm)||!nonneg(d?.xMm)||!pos(d?.widthMm)||d.xMm+d.widthMm<=din.railWidthMm+1e-9,'DIN_DEVICE_OVERFLOW');
  }
  const valid=devices.filter(d=>nonneg(d?.xMm)&&pos(d?.widthMm)).sort((a,b)=>a.xMm-b.xMm);
  gate('G20','din','board',valid.every((d,i)=>i===0||d.xMm>=valid[i-1].xMm+valid[i-1].widthMm-1e-9),'DIN_DEVICE_OVERLAP');
 }else for(let n=16;n<=20;n++)gate('G'+n,'din','board',false,'DIN_EVIDENCE_MISSING','UNKNOWN');
 const blocked=issues.some(x=>x.status==='BLOCKED');
 return {status:blocked?'BLOCKED':'UNKNOWN',checks,issues,engineeringApproved:false,readyForInstallation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignQualityGatesV1};
