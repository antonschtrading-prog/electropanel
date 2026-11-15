'use strict';
// Bounded TN radial L–PE loop arithmetic. Not a max-fault study or compliance approval.
function epFaultRouteBasisV2(project,line,article){
 return {earthing:project.earthing,phase:line.phase,sectionMm2:line.cableDesignInput?.sectionMm2??null,
  sku:line.catalogSku??null,article:article?{sku:article.sku,inA:article.inA,curve:article.curve,poles:article.poles}:null};
}
function epFaultRouteReviewV2(project,line,lookup){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const finish=(extra={})=>({status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,
  ikMinA:null,zsOhm:null,thresholdStatus:'UNKNOWN',engineeringApproved:false,ready_for_installation:false,...extra});
 const input=line?.faultRouteInput;
 if(!input){add('FAULT_ROUTE_INPUT_MISSING');return finish();}
 if(!['TN-S','TN-C-S'].includes(project?.earthing)){add('FAULT_ROUTE_TN_REQUIRED','BLOCKED');return finish();}
 if(typeof input!=='object'||Array.isArray(input)||input.model!=='TN_RADIAL_L_PE_SINGLE_SOURCE'){add('FAULT_ROUTE_MODEL_UNSUPPORTED','BLOCKED');return finish();}
 const number=(v,zero=false)=>{
  if(v===null||typeof v==='boolean'||typeof v==='object'||v===undefined)return null;
  const s=String(v).trim().replace(',','.');if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&(zero?n>=0:n>0)&&n<=1e7?n:null;
 };
 const u=number(input.u0V),c=number(input.cmin),sr=number(input.sourceROhm,true),sx=number(input.sourceXOhm,true);
 if([u,c,sr,sx].includes(null)||c>1||u>1000){add('FAULT_ROUTE_NETWORK_INVALID','BLOCKED');return finish();}
 if(typeof input.networkSource!=='string'||!input.networkSource.trim())add('FAULT_ROUTE_NETWORK_SOURCE_MISSING');
 if(typeof input.networkSource==='string'&&input.networkSource.length>2000)add('FAULT_ROUTE_NETWORK_SOURCE_TOO_LONG','BLOCKED');
 if(!Array.isArray(input.segments)||!input.segments.length||input.segments.length>50){add('FAULT_ROUTE_SEGMENTS_INVALID','BLOCKED');return finish();}
 let r=sr,x=sx;const segments=[];
 for(const [i,s] of input.segments.entries()){
  const length=number(s?.lengthM),rp=number(s?.phaseROhmKm),re=number(s?.peROhmKm),xp=number(s?.phaseXOhmKm,true),xe=number(s?.peXOhmKm,true);
  if([length,rp,re,xp,xe].includes(null)||length>100000){add('FAULT_ROUTE_SEGMENT_INVALID','BLOCKED');continue;}
  if(typeof s.source!=='string'||!s.source.trim())add('FAULT_ROUTE_CONDUCTOR_SOURCE_MISSING');
  if(typeof s.source==='string'&&s.source.length>2000)add('FAULT_ROUTE_CONDUCTOR_SOURCE_TOO_LONG','BLOCKED');
  if(s.temperatureBasisConfirmed!==true)add('FAULT_ROUTE_TEMPERATURE_BASIS_MISSING');
  const dr=length/1000*(rp+re),dx=length/1000*(xp+xe);r+=dr;x+=dx;
  segments.push({index:i+1,lengthM:length,rOhm:dr,xOhm:dx});
 }
 if(issues.some(i=>i.level==='BLOCKED'))return finish();
 const zs=Math.hypot(r,x),ik=c*u/zs;
 if(!Number.isFinite(zs)||zs<=0||!Number.isFinite(ik)||ik>1e8){add('FAULT_ROUTE_RESULT_INVALID','BLOCKED');return finish();}
 let article=null;try{article=lookup?.(line.catalogSku)||null;}catch(_){add('FAULT_ROUTE_ARTICLE_LOOKUP_FAILED');}
 if(!article)add('FAULT_ROUTE_ARTICLE_REQUIRED');
 else if(article.kind!=='MCB')add('FAULT_ROUTE_DEVICE_KIND_UNSUPPORTED');
 if(!['L1','L2','L3','3Ф'].includes(line.phase))add('FAULT_ROUTE_PHASE_MISSING');
 const basis=epFaultRouteBasisV2(project,line,article);
 const stale=JSON.stringify(input.basis)!==JSON.stringify(basis);
 if(stale)add('FAULT_ROUTE_BASIS_CHANGED');
 const ia=number(input.iaA),time=number(input.requiredTimeS);
 const tripDocumented=typeof input.tripSource==='string'&&!!input.tripSource.trim();
 const timeDocumented=typeof input.timeSource==='string'&&!!input.timeSource.trim();
 if(!ia||!time||!tripDocumented||!timeDocumented)add('FAULT_ROUTE_TRIP_TIME_EVIDENCE_MISSING');
 if((typeof input.tripSource==='string'&&input.tripSource.length>2000)||(typeof input.timeSource==='string'&&input.timeSource.length>2000))add('FAULT_ROUTE_EVIDENCE_SOURCE_TOO_LONG','BLOCKED');
 if(!['L1','L2','L3'].includes(line.phase))add('FAULT_ROUTE_SINGLE_PHASE_SCOPE_UNCONFIRMED');
 if(article&&(!Number.isFinite(article.inA)||article.inA<=0||!Number.isInteger(article.poles)||article.poles<1))add('FAULT_ROUTE_ARTICLE_RATING_UNCONFIRMED');
 if(article&&['L1','L2','L3'].includes(line.phase)&&article.poles!==1)add('FAULT_ROUTE_POLES_APPLICABILITY_UNCONFIRMED');
 let thresholdStatus='UNKNOWN';
 // A declared insufficient L-PE current is a numerical blocker even when
 // sources are missing. Missing evidence may prevent PASS, not suppress FAIL.
 if(ia&&ik<ia){
  thresholdStatus='FAIL';add('FAULT_ROUTE_CURRENT_BELOW_IA','BLOCKED');
 }else if(!stale&&article?.kind==='MCB'&&ia&&time&&tripDocumented&&timeDocumented&&
    !issues.some(x=>x.level==='UNKNOWN'||x.level==='BLOCKED')){
  thresholdStatus='PASS';
 }
 return finish({ikMinA:ik,zsOhm:zs,loopROhm:r,loopXOhm:x,thresholdZsOhm:ia?c*u/ia:null,
  iaA:ia,requiredTimeS:time,thresholdStatus,segments,stale,
  formula:'Ik,min = cmin × U0 / hypot(Rsource + ΣRphase+PE, Xsource + ΣXphase+PE)',
  maxFaultCurrentKa:line.faultInput?.ikKa??null,
  notice:'Minimum L–PE fault current only. Maximum prospective fault current remains an independent input. Ia and time applicability are user-documented, not authenticated.'});
}
function epApplyFaultRouteV2(project,lineId,input,lookup){
 const lines=Array.isArray(project?.lines)?project.lines.filter(x=>x?.id===lineId):null;
 if(lines?.length!==1)return {project:null,code:'LINE_NOT_UNIQUE'};
 let article=null;try{article=lookup?.(lines[0].catalogSku)||null;}catch(_){}
 if(!input||typeof input!=='object'||Array.isArray(input))return {project:null,code:'FAULT_ROUTE_INPUT_INVALID'};
 const draft=JSON.parse(JSON.stringify(project)),line=draft.lines.find(x=>x.id===lineId);
 line.faultRouteInput={...input,model:'TN_RADIAL_L_PE_SINGLE_SOURCE',basis:epFaultRouteBasisV2(project,lines[0],article)};
 const report=epFaultRouteReviewV2(draft,line,lookup);
 // A valid but failing engineering case is still saved, so it can be corrected.
 const invalid=report.issues.find(x=>x.level==='BLOCKED'&&x.code!=='FAULT_ROUTE_CURRENT_BELOW_IA');
 if(invalid)return {project:null,code:invalid.code,report};
 line.calculationReview={required:true,reason:'FAULT_ROUTE_UPDATED'};
 return {project:draft,report,status:'REVIEW_REQUIRED'};
}

// Fingerprint of external project conditions used by the separately declared
// maximum prospective current model. The R/X and cmax remain within the input.
function epMaximumFaultBasisV2(project,line,article){
 return {phase:line?.phase??null,earthing:project?.earthing??null,
  cableSectionMm2:line?.cableDesignInput?.sectionMm2??null,
  catalogSku:line?.catalogSku??null,
  article:article?{sku:article.sku??null,kind:article.kind??null,
   inA:article.inA??null,poles:article.poles??null,
   icnKa:article.icnKa??null,icnVoltageV:article.icnVoltageV??null,
   icnStandard:article.icnStandard??null}:null};
}
// Separate maximum prospective current assessment. Input impedance must describe
// the declared fault topology; TN L-PE minimum-route values are NOT reused.
function epMaximumFaultCurrentV2(project,line,lookup){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const end=(extra={})=>({schema:'electropanel.maxfault.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,ikMaxKa:null,thresholdStatus:'UNKNOWN',
  engineeringApproved:false,ready_for_installation:false,...extra});
 const input=line?.maximumFaultInput;
 if(input===undefined||input===null){add('MAX_FAULT_INPUT_MISSING');return end();}
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('MAX_FAULT_INPUT_INVALID','BLOCKED');return end();
 }
 const three=input.model==='THREE_PHASE_POSITIVE_SEQUENCE';
 const single=input.model==='SINGLE_PHASE_L_N';
 if(!three&&!single){add('MAX_FAULT_MODEL_UNSUPPORTED','BLOCKED');return end();}
 const parse=(v,allowZero=false)=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  const str=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str))return null;
  const n=Number(str);
  return Number.isFinite(n)&&n<=1e7&&(allowZero?n>=0:n>0)?n:null;
 };
 const u=parse(three?input.uLLV:input.u0V),c=parse(input.cmax);
 const sr=parse(input.sourceROhm,true),sx=parse(input.sourceXOhm,true);
 if(u===null||u>1000||c===null||c<1||c>1.2||sr===null||sx===null){
  add('MAX_FAULT_NETWORK_INVALID','BLOCKED');return end();
 }
 if(typeof input.networkSource!=='string'||!input.networkSource.trim())
  add('MAX_FAULT_NETWORK_SOURCE_MISSING');
 else if(input.networkSource.length>2000)add('MAX_FAULT_NETWORK_SOURCE_TOO_LONG','BLOCKED');
 if(!Array.isArray(input.segments)||input.segments.length>50){
  add('MAX_FAULT_SEGMENTS_INVALID','BLOCKED');return end();
 }
 let r=sr,x=sx;const segments=[];
 for(const [index,part] of input.segments.entries()){
  const length=parse(part?.lengthM),rp=parse(part?.[three?'r1OhmKm':'phaseROhmKm']),
   rn=three?0:parse(part?.neutralROhmKm),
   xp=parse(part?.[three?'x1OhmKm':'phaseXOhmKm'],true),
   xn=three?0:parse(part?.neutralXOhmKm,true);
  if([length,rp,rn,xp,xn].includes(null)||length>100000){
   add('MAX_FAULT_SEGMENT_INVALID','BLOCKED');continue;
  }
  const dr=length/1000*(rp+rn),dx=length/1000*(xp+xn);
  r+=dr;x+=dx;segments.push({index:index+1,lengthM:length,rOhm:dr,xOhm:dx});
  if(typeof part.source!=='string'||!part.source.trim())
   add('MAX_FAULT_SEGMENT_SOURCE_MISSING');
  else if(part.source.length>2000)add('MAX_FAULT_SEGMENT_SOURCE_TOO_LONG','BLOCKED');
  if(part.temperatureBasisConfirmed!==true)
   add('MAX_FAULT_TEMPERATURE_BASIS_UNCONFIRMED');
 }
 if(issues.some(x=>x.level==='BLOCKED'))return end();
 const z=Math.hypot(r,x);
 if(z<=0||!Number.isFinite(z)){add('MAX_FAULT_ZERO_OR_INVALID_IMPEDANCE','BLOCKED');return end();}
 const ikA=c*u/(three?Math.sqrt(3)*z:z),ikKa=ikA/1000;
 if(!Number.isFinite(ikKa)||ikKa<=0||ikKa>1e6){
  add('MAX_FAULT_RESULT_INVALID','BLOCKED');return end();
 }
 if(three&&line?.phase!=='3Ф')add('MAX_FAULT_PHASE_SCOPE_MISMATCH','BLOCKED');
 if(single&&!['L1','L2','L3'].includes(line?.phase))
  add('MAX_FAULT_PHASE_SCOPE_MISMATCH','BLOCKED');
 let article=null;
 try{article=line?.catalogSku&&lookup?.(line.catalogSku)||null;}
 catch(_){add('MAX_FAULT_CATALOG_LOOKUP_FAILED','BLOCKED');}
 if(input.basis!==undefined){
  const actualBasis=epMaximumFaultBasisV2(project,line,article);
  if(!input.basis||typeof input.basis!=='object'||Array.isArray(input.basis)||
     JSON.stringify(input.basis)!==JSON.stringify(actualBasis))
   add('MAX_FAULT_BASIS_STALE');
 }
 if(!article)add('MAX_FAULT_ARTICLE_UNAVAILABLE');
 else {
  if(article.kind!=='MCB'&&article.kind!=='RCBO')
   add('MAX_FAULT_DEVICE_KIND_UNSUPPORTED');
  if(three&&![3,4].includes(article.poles))
   add('MAX_FAULT_THREE_PHASE_POLES_UNCONFIRMED');
  if(single&&!(article.poles===1||article.poles===2&&
      (article.kind==='RCBO'||['1P+N','2P'].includes(article.poleConfiguration))))
   add('MAX_FAULT_SINGLE_PHASE_POLES_UNCONFIRMED');
  if(parse(article.icnKa)===null)add('MAX_FAULT_ICN_UNDECLARED');
  if(parse(article.icnVoltageV)===null)add('MAX_FAULT_ICN_VOLTAGE_UNDECLARED');
  else if(article.icnVoltageV<u)add('MAX_FAULT_ICN_VOLTAGE_INSUFFICIENT','BLOCKED');
  if(typeof article.icnStandard!=='string'||!article.icnStandard.trim())
   add('MAX_FAULT_ICN_STANDARD_UNDECLARED');
  if(article.verificationStatus!=='VERIFIED')add('MAX_FAULT_ARTICLE_VERIFICATION_PENDING');
 }
 let thresholdStatus='UNKNOWN';
 // A declared overrun is a blocker even when provenance is incomplete;
 // missing evidence can suppress a pass, never suppress a known numerical fail.
 if(article&&parse(article.icnKa)!==null&&ikKa>article.icnKa){
  thresholdStatus='FAIL';add('MAX_FAULT_EXCEEDS_ICN','BLOCKED');
 }else if(article&&parse(article.icnKa)!==null&&
   !issues.some(i=>i.level==='UNKNOWN'||i.level==='BLOCKED')){
  thresholdStatus='PRELIMINARY_PASS';
 }
 return end({ikMaxKa:ikKa,ikMaxA:ikA,impedanceOhm:z,rOhm:r,xOhm:x,segments,
  numericComparison:article&&parse(article.icnKa)!==null?(ikKa>article.icnKa?'EXCEEDS_ICN':'BELOW_OR_EQUAL_ICN'):'UNAVAILABLE',
  cmax:c,voltageV:u,model:input.model,icnKa:article?.icnKa??null,
  thresholdStatus,formula:three?
   'Ik3,max = cmax × ULL / (sqrt(3) × |Z1|)':
   'IkLN,max = cmax × U0 / |ZL+ZN|',
  notice:'Declared topology and R/X only; source network model, conductor temperature, Icn standard and manufacturer applicability require independent review.'});
}

// Atomic input update, including the basis which invalidates the result when
// the protection, cable section or circuit phase changes. Numeric overrun
// remains a valid stored failing case for design correction.
function epApplyMaximumFaultV2(project,lineId,input,lookup){
 if(!project||!Array.isArray(project.lines))return {project:null,code:'PROJECT_INVALID'};
 const matches=project.lines.filter(line=>line?.id===lineId);
 if(matches.length!==1)return {project:null,code:'LINE_NOT_UNIQUE'};
 if(!input||typeof input!=='object'||Array.isArray(input))
  return {project:null,code:'MAX_FAULT_INPUT_INVALID'};
 let article=null;
 try{article=lookup?.(matches[0].catalogSku)||null;}catch(_){}
 const draft=JSON.parse(JSON.stringify(project));
 const line=draft.lines.find(l=>l.id===lineId);
 line.maximumFaultInput={...JSON.parse(JSON.stringify(input)),
  basis:epMaximumFaultBasisV2(project,matches[0],article)};
 const report=epMaximumFaultCurrentV2(draft,line,lookup);
 const malformed=report.issues.find(issue=>issue.level==='BLOCKED'&&[
  'MAX_FAULT_INPUT_INVALID','MAX_FAULT_MODEL_UNSUPPORTED','MAX_FAULT_NETWORK_INVALID',
  'MAX_FAULT_NETWORK_SOURCE_TOO_LONG','MAX_FAULT_SEGMENTS_INVALID',
  'MAX_FAULT_SEGMENT_INVALID','MAX_FAULT_SEGMENT_SOURCE_TOO_LONG',
  'MAX_FAULT_ZERO_OR_INVALID_IMPEDANCE','MAX_FAULT_RESULT_INVALID'
 ].includes(issue.code));
 if(malformed)return {project:null,code:malformed.code,report};
 line.calculationReview={...line.calculationReview,required:true,reason:'MAX_FAULT_INPUT_UPDATED'};
 return {project:draft,report,status:'REVIEW_REQUIRED'};
}

function epFaultRouteProjectV2(project,lookup){
 const lines=(Array.isArray(project?.lines)?project.lines:[]).filter(line=>line&&typeof line==='object');
 const rows=lines.map(line=>({lineId:line.id,...epFaultRouteReviewV2(project,line,lookup),
  maximum:epMaximumFaultCurrentV2(project,line,lookup)}));
 const issues=rows.flatMap(r=>r.issues.concat(r.maximum.issues));
 return {status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epFaultRouteBasisV2,epFaultRouteReviewV2,epApplyFaultRouteV2,epFaultRouteProjectV2,epMaximumFaultBasisV2,epMaximumFaultCurrentV2,epApplyMaximumFaultV2};
