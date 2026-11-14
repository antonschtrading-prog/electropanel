'use strict';
// Project-specific catalogue extension; never alters the curated seed data.
function epProjectCatalogV1(project,seed={},options={}){
 const records=Array.isArray(project?.catalogArticles)?project.catalogArticles:[];
 const issues=[],articles=Object.create(null),seen=new Set();
 const validString=x=>typeof x==='string'&&x.trim().length>0;
 const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 const httpsSource=x=>{if(!validString(x))return false;try{const u=new URL(x);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}catch(_){return false;}};
 for(const [index,r] of records.entries()){
  const key=r?.id;
  if(!validString(key)||['__proto__','constructor','prototype'].includes(key)||key.trim()!==key||key.length>100||!validString(r?.sku)||!validString(r?.maker)||!validString(r?.series)){
   issues.push({index,code:'IDENTITY_INCOMPLETE',status:'BLOCKED'});continue;
  }
  if(seen.has(key)||Object.prototype.hasOwnProperty.call(seed,key)){
   issues.push({index,code:'CATALOG_ID_COLLISION',status:'BLOCKED'});continue;
  }
  seen.add(key);
  if(!Number.isInteger(r.modules)||r.modules<1||r.modules>24||!num(r.widthMm)||
    !Number.isInteger(r.poles)||r.poles<1||r.poles>8||!num(r.inA)){
   issues.push({index,code:'CATALOG_DIMENSIONS_OR_RATING_INVALID',status:'BLOCKED'});continue;
  }
  if(!httpsSource(r.source)){
   issues.push({index,code:'CATALOG_SOURCE_MISSING',status:'UNKNOWN'});continue;
  }
  if(!['MCB','RCD','RCBO','SWITCH','METER','CONTACTOR','RELAY','DIN_PSU','OTHER'].includes(r.kind)){
   issues.push({index,code:'CATALOG_KIND_UNKNOWN',status:'BLOCKED'});continue;
  }
  if(Object.values(articles).some(a=>a.maker===r.maker&&a.sku===r.sku)||Object.values(seed).some(a=>a?.maker===r.maker&&a?.sku===r.sku)){
   issues.push({index,code:'DUPLICATE_MANUFACTURER_SKU',status:'BLOCKED'});continue;
  }
  const article={id:key,sku:r.sku,maker:r.maker,series:r.series,kind:r.kind,label:r.label||r.sku,
   modules:r.modules,widthMm:r.widthMm,poles:r.poles,inA:r.inA,
   curve:typeof r.curve==='string'?r.curve:null,
   icnKa:num(r.icnKa)?r.icnKa:null,
   appearance:'generic',source:r.source,verificationStatus:'UNVERIFIED',sourceType:'PROJECT_DECLARATION'};
  articles[key]=article;
 }
 const all={...seed,...articles};
 return {articles:all,customArticles:articles,issues,lookup:id=>Object.prototype.hasOwnProperty.call(all,id)?all[id]:null,
  status:issues.some(i=>i.status==='BLOCKED')?'BLOCKED':'UNKNOWN',engineeringApproved:false};
}
function epProjectCatalogHtmlV1(project,seed={}){
 const c=epProjectCatalogV1(project,seed),esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const items=Object.entries(c.articles).map(([id,a])=>{
  const custom=Object.hasOwn(c.customArticles,id);
  const source=typeof a.source==='string'&&/^https:\/\/[^\s]+$/i.test(a.source)?'<a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">Источник</a>':'Нет ссылки';
  const provenance=custom?'Декларация пользователя · не проверено':esc(a.sourceType||'Встроенный каталог');
  return '<tr data-catalog-row><td>'+esc(a.maker)+'</td><td>'+esc(a.series)+'</td><td>'+esc(a.sku)+'</td><td>'+esc(a.inA)+' A</td><td>'+esc(a.modules)+' M / '+esc(a.widthMm)+' мм</td><td>'+source+'</td><td>'+provenance+'</td><td>'+(custom?'<button type="button" class="btn tiny" data-edit-article="'+esc(id)+'">Изменить</button> <button type="button" class="btn tiny" data-delete-article="'+esc(id)+'">Удалить</button>':'Встроенный')+'</td></tr>';
 }).join('');
 const issues=c.issues.length?'<details><summary>Ошибки каталога ('+c.issues.length+')</summary><ul>'+c.issues.map(i=>'<li>Запись '+(i.index+1)+': '+esc(i.code)+' · '+esc(i.status)+'</li>').join('')+'</ul></details>':'';
 return '<section class="panel compact ep-catalog-workbench"><h3>Каталог оборудования · проект</h3>'+
 '<p>Записей: '+Object.keys(c.articles).length+'. Пользовательские данные не подтверждены производителем автоматически. Замечаний: '+c.issues.length+'.</p>'+
 '<label>Поиск по производителю, серии и артикулу<input id="catalogSearchInput" type="search" placeholder="Например: ABB или C16"></label>'+
 issues+'<div class="table-scroll"><table><thead><tr><th>Производитель</th><th>Серия</th><th>Артикул</th><th>In</th><th>Ширина</th><th>Документ</th><th>Статус</th><th>Действия</th></tr></thead><tbody>'+items+'</tbody></table></div>'+
 epCatalogEditorHtmlV2()+
 '<details><summary>Импорт и экспорт JSON</summary><p>Добавление: JSON-массив записей с id, sku, maker, series, kind, modules, widthMm, poles, inA, source. '+
 'Сначала проверяется формат, затем данные сохраняются вместе с проектом.</p>'+
 '<textarea id="catalogJsonInput" rows="5" placeholder="JSON-массив артикулов"></textarea>'+
 '<button type="button" class="btn tiny" id="catalogImportRecordsBtn">Добавить артикулы в проект</button>'+
 '<button type="button" class="btn tiny" id="catalogExportRecordsBtn">Экспорт каталога JSON</button>'+
 '</details></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProjectCatalogV1,epProjectCatalogHtmlV1};

function epCatalogEditorHtmlV2(){
 const fields=[['id','ID записи'],['maker','Производитель'],['series','Серия'],['sku','Артикул'],['label','Обозначение'],['modules','Модули DIN'],['widthMm','Ширина, мм'],['poles','Полюса'],['inA','Номинальный ток, А'],['curve','Характеристика'],['icnKa','Icn, кА'],['source','Ссылка на источник HTTPS']];
 return '<details id="catalogEditor"><summary>Добавить или изменить пользовательский аппарат</summary><p>Характеристики вводятся по источнику. Они сохраняются как пользовательская декларация. Изменение используемого артикула обновляет связанные цепи и требует повторной проверки.</p><form id="catalogArticleForm"><input type="hidden" name="originalId"><div class="ep-engineering-fields">'+fields.map(([name,title])=>'<label>'+title+'<input name="'+name+'" '+(['curve','icnKa','label'].includes(name)?'':'required')+' '+(name==='source'?'type="url" pattern="https://.*"':(['modules','widthMm','poles','inA','icnKa'].includes(name)?'type="number" min="'+(['modules','poles'].includes(name)?'1':'0.001')+'" step="'+(['modules','poles'].includes(name)?'1':'any')+'"':'type="text"'))+' maxlength="'+(name==='source'?2000:200)+'"></label>').join('')+'<label>Категория<select name="kind">'+['MCB','RCBO','RCD','SWITCH','CONTACTOR','RELAY','METER','DIN_PSU','OTHER'].map(x=>'<option>'+x+'</option>').join('')+'</select></label></div><button class="btn primary" type="submit">Сохранить аппарат</button> <button type="reset" class="btn">Новая запись</button></form></details>';
}
function epUpsertProjectArticleV2(project,record,seed={},originalId=''){
 if(!project||!Array.isArray(project.lines)||!record||typeof record!=='object')return {project:null,code:'PROJECT_OR_RECORD_INVALID'};
 if(originalId&&originalId!==record.id)return {project:null,code:'ARTICLE_ID_IMMUTABLE'};
 if(!Object.prototype.hasOwnProperty.call(record,'id')||typeof record.id!=='string')return {project:null,code:'ARTICLE_ID_INVALID'};
 const existing=project.catalogArticles||[];
 if(!Array.isArray(existing))return {project:null,code:'CATALOG_INVALID'};
 if(originalId&&!existing.some(x=>x.id===originalId))return {project:null,code:'ARTICLE_NOT_FOUND'};
 if(!originalId&&existing.some(x=>x.id===record.id))return {project:null,code:'CATALOG_ID_COLLISION'};
 const draft=JSON.parse(JSON.stringify(project));
 draft.catalogArticles=originalId?existing.map(x=>x.id===originalId?{...record}:x):[...existing,{...record}];
 if(draft.catalogArticles.length>500)return {project:null,code:'CATALOG_TOO_LARGE'};
 const audit=epProjectCatalogV1(draft,seed);
 if(audit.issues.length)return {project:null,code:audit.issues[0].code};
 const article=audit.lookup(record.id),affected=[];
 if(article.widthMm>article.modules*18)return {project:null,code:'ARTICLE_WIDTH_EXCEEDS_MODULES'};
 for(const line of draft.lines){
  if(line.catalogSku!==record.id)continue;
  const phaseOK=['L1','L2','L3'].includes(line.phase)?article.poles===1:line.phase==='3Ф'&&[3,4].includes(article.poles);
  if(!phaseOK)return {project:null,code:'USED_ARTICLE_POLE_CONFLICT'};
  line.modules=article.modules;line.device=article.label;
  line.calculationReview={required:true,reason:'PROJECT_ARTICLE_UPDATED'};
  const branch=draft.branchDevices?.find(x=>x.circuitId===line.id);
  if(branch){branch.modules=article.modules;branch.label=article.label;branch.templateId=null;}
  affected.push(line.id);
 }
 if(affected.length&&typeof epDraftBoardPlanV1==='function'){
  const layout=epDraftBoardPlanV1(draft,audit.lookup);
  const invalid=layout.issues.find(x=>x.level==='BLOCKED');
  if(invalid)return {project:null,code:invalid.code};
 }
 return {project:draft,affected,status:'REVIEW_REQUIRED'};
}
// Transactional import: apply the same engineering constraints as the manual editor.
function epImportProjectArticlesV2(project,records,seed={}){
 if(!Array.isArray(records)||!records.length||records.length>500)return {project:null,code:'IMPORT_RECORD_COUNT_INVALID'};
 if(!project||!Array.isArray(project.catalogArticles))return {project:null,code:'PROJECT_CATALOG_INVALID'};
 if(project.catalogArticles.length+records.length>500)return {project:null,code:'CATALOG_TOO_LARGE'};
 let draft=project;
 for(const [index,record] of records.entries()){
  if(!record||typeof record!=='object'||Array.isArray(record))return {project:null,code:'IMPORT_RECORD_INVALID',index};
  const result=epUpsertProjectArticleV2(draft,record,seed);
  if(!result.project)return {project:null,code:result.code,index};
  draft=result.project;
 }
 return {project:draft,imported:records.length,status:'REVIEW_REQUIRED'};
}
function epDeleteProjectArticleV2(project,id){
 if((project.lines||[]).some(x=>x.catalogSku===id)||(project.sharedDevices||[]).some(x=>x.catalogSku===id))return {project:null,code:'ARTICLE_IN_USE'};
 if(!(project.catalogArticles||[]).some(x=>x.id===id))return {project:null,code:'ARTICLE_NOT_CUSTOM'};
 const draft=JSON.parse(JSON.stringify(project));draft.catalogArticles=draft.catalogArticles.filter(x=>x.id!==id);
 return {project:draft,status:'REVIEW_REQUIRED'};
}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{epCatalogEditorHtmlV2,epUpsertProjectArticleV2,epImportProjectArticlesV2,epDeleteProjectArticleV2});
