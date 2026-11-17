'use strict';
// Deterministic procurement queue from the actual cabinet BOM and evidence ledger.
const EP_FRONT_REVIEW_CODES_V1=Object.freeze({
 CATALOGUE_MISSING:{priority:1,action:'Уточнить артикул в каталоге'},
 ASSET_REJECTED:{priority:2,action:'Проверить источник и права на изображение'},
 EXCEEDS_DIN_SLOT:{priority:1,action:'Проверить ширину корпуса и компоновку'},
 UNKNOWN:{priority:3,action:'Получить паспортную ширину корпуса'},
 STYLIZED_ONLY:{priority:4,action:'Запросить изображение точного артикула'},
 DECLARED_WITHIN_SLOT:{priority:5,action:'Ширина в пределах заявленного DIN-места'},
 REVIEWED_IMAGE:{priority:5,action:'Подтверждение изображения получено'}
});
function epFrontReviewQueueV1(ledger,options={}){
 const invalid=code=>({schema:'electropanel.front.review.queue.1',status:'BLOCKED',code,items:[],
  total:0,visible:0,hasMore:false,counts:{critical:0,rejected:0,missing:0,geometry:0,unverified:0,reviewed:0},
  engineeringApproved:false});
 if(!ledger||!Array.isArray(ledger.entries)||ledger.entries.length>5000)
  return invalid('FRONT_QUEUE_INPUT_INVALID');
 const allowed=['ALL','ACTION_REQUIRED','REVIEWED_IMAGE','STYLIZED_ONLY','ASSET_REJECTED','CATALOGUE_MISSING',
  'EXCEEDS_DIN_SLOT','UNKNOWN'];
 const filter=options.filter===undefined?'ALL':options.filter;
 if(!allowed.includes(filter))return invalid('FRONT_QUEUE_FILTER_INVALID');
 const search=options.search===undefined?'':options.search;
 if(typeof search!=='string'||search.length>200)return invalid('FRONT_QUEUE_SEARCH_INVALID');
 const maker=options.maker===undefined?'':options.maker;
 if(typeof maker!=='string'||maker.length>200)return invalid('FRONT_QUEUE_MAKER_INVALID');
 const page=options.page===undefined?0:options.page;
 const pageSize=options.pageSize===undefined?25:options.pageSize;
 if(!Number.isInteger(page)||page<0||page>1000||!Number.isInteger(pageSize)||pageSize<1||pageSize>100)
  return invalid('FRONT_QUEUE_PAGING_INVALID');
 const items=ledger.entries.map(x=>{
  const front=EP_FRONT_REVIEW_CODES_V1[x.frontStatus]||EP_FRONT_REVIEW_CODES_V1.CATALOGUE_MISSING;
  const geo=EP_FRONT_REVIEW_CODES_V1[x.geometryStatus]||EP_FRONT_REVIEW_CODES_V1.UNKNOWN;
  const priority=x.issues?.some(code=>['LEDGER_DUPLICATE_DEVICE_ID','LEDGER_ARTICLE_MISMATCH','LEDGER_IDENTITY_INCOMPLETE'].includes(code))?
   1:Math.min(front.priority,geo.priority);
  const actions=[];
  if(x.frontStatus==='CATALOGUE_MISSING')actions.push(front.action);
  else if(x.frontStatus==='ASSET_REJECTED')actions.push(front.action);
  else if(x.frontStatus==='STYLIZED_ONLY')actions.push(front.action);
  if(x.geometryStatus==='EXCEEDS_DIN_SLOT')actions.push(EP_FRONT_REVIEW_CODES_V1.EXCEEDS_DIN_SLOT.action);
  else if(x.geometryStatus==='UNKNOWN')actions.push(EP_FRONT_REVIEW_CODES_V1.UNKNOWN.action);
  if(!actions.length)actions.push(EP_FRONT_REVIEW_CODES_V1.REVIEWED_IMAGE.action);
  if(x.issues?.includes('LEDGER_DUPLICATE_DEVICE_ID'))actions.unshift('Устранить дублирование идентификатора аппарата');
  if(x.issues?.includes('LEDGER_ARTICLE_MISMATCH'))actions.unshift('Сверить артикул с каталогом');
  if(x.issues?.includes('LEDGER_IDENTITY_INCOMPLETE'))actions.unshift('Заполнить производителя, серию и тип');
  return {sku:String(x.sku??''),maker:String(x.maker??''),series:String(x.series??''),
   quantity:Number.isInteger(x.quantity)&&x.quantity>0?x.quantity:0,
   frontStatus:x.frontStatus,geometryStatus:x.geometryStatus,priority,
   actions:[...new Set(actions)],issues:Array.isArray(x.issues)?[...x.issues]:[],
   reviewed:x.frontStatus==='REVIEWED_IMAGE',imageSrc:x.frontStatus==='REVIEWED_IMAGE'?x.imageSrc:null,
   engineeringApproved:false};
 }).sort((a,b)=>a.priority-b.priority||a.maker.localeCompare(b.maker,'ru')||
  a.series.localeCompare(b.series,'ru')||a.sku.localeCompare(b.sku,'ru'));
 const counts={critical:items.filter(x=>x.priority===1).length,
  rejected:items.filter(x=>x.frontStatus==='ASSET_REJECTED').length,
  missing:items.filter(x=>x.frontStatus==='CATALOGUE_MISSING').length,
  geometry:items.filter(x=>x.geometryStatus==='EXCEEDS_DIN_SLOT'||x.geometryStatus==='UNKNOWN').length,
  unverified:items.filter(x=>x.frontStatus==='STYLIZED_ONLY').length,
  reviewed:items.filter(x=>x.frontStatus==='REVIEWED_IMAGE').length};
 const term=search.trim().toLocaleLowerCase('ru'),makerTerm=maker.trim().toLocaleLowerCase('ru');
 const filtered=items.filter(x=>(filter==='ALL'||filter==='ACTION_REQUIRED'&&(x.priority<5||x.issues.length>0)||
   filter===x.frontStatus||filter===x.geometryStatus)&&
  (!term||[x.sku,x.maker,x.series,...x.actions].join(' ').toLocaleLowerCase('ru').includes(term))&&
  (!makerTerm||x.maker.toLocaleLowerCase('ru')===makerTerm));
 const start=page*pageSize;
 return {schema:'electropanel.front.review.queue.1',status:ledger.status==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED',
  code:'FRONT_QUEUE_NOT_ENGINEERING_APPROVAL',items:filtered.slice(start,start+pageSize),
  total:filtered.length,visible:Math.max(0,Math.min(pageSize,filtered.length-start)),
  hasMore:start+pageSize<filtered.length,page,pageSize,counts,engineeringApproved:false};
}
function epFrontReviewQueueCsvV1(queue){
 if(!queue||!Array.isArray(queue.items))return {status:'BLOCKED',csv:null,code:'FRONT_QUEUE_EXPORT_INVALID'};
 const q=v=>{const s=String(v??'');return '"'+(/^[\s\uFEFF\u200B]*[=+@\-]/.test(s)||/^[\t\r\n]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
 const header=['priority','article','manufacturer','series','quantity','front_status','geometry_status',
  'recommended_actions','issues','engineering_approved'];
 const body=queue.items.map(x=>[x.priority,x.sku,x.maker,x.series,x.quantity,x.frontStatus,x.geometryStatus,
  x.actions.join(' | '),x.issues.join(' | '),'NO']);
 return {status:queue.status,code:'FRONT_QUEUE_NOT_ENGINEERING_APPROVAL',rows:body.length,
  csv:'\uFEFF'+[header,...body].map(r=>r.map(q).join(';')).join('\r\n')+'\r\n',engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={EP_FRONT_REVIEW_CODES_V1,epFrontReviewQueueV1,epFrontReviewQueueCsvV1};
