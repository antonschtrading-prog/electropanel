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
 if(!stale&&article?.kind==='MCB'&&ia&&time&&tripDocumented&&timeDocumented&&
    !issues.some(x=>x.level==='UNKNOWN'||x.level==='BLOCKED')){
  thresholdStatus=ik>=ia?'PASS':'FAIL';
  if(thresholdStatus==='FAIL')add('FAULT_ROUTE_CURRENT_BELOW_IA','BLOCKED');
 }
 if(issues.some(i=>i.level==='UNKNOWN'))thresholdStatus=thresholdStatus==='FAIL'?'FAIL':'UNKNOWN';
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
function epFaultRouteProjectV2(project,lookup){
 const rows=(Array.isArray(project?.lines)?project.lines:[]).filter(line=>line&&typeof line==='object').map(line=>({lineId:line.id,...epFaultRouteReviewV2(project,line,lookup)}));
 return {status:rows.some(r=>r.status==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues:rows.flatMap(r=>r.issues),engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epFaultRouteBasisV2,epFaultRouteReviewV2,epApplyFaultRouteV2,epFaultRouteProjectV2};
