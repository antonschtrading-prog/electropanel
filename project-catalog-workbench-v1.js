'use strict';
// Project-specific catalogue extension; never alters the curated seed data.
function epProjectCatalogV1(project,seed={},options={}){
 const records=Array.isArray(project?.catalogArticles)?project.catalogArticles:[];
 const issues=[],articles={},seen=new Set();
 const validString=x=>typeof x==='string'&&x.trim().length>0;
 const num=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 for(const [index,r] of records.entries()){
  const key=r?.id;
  if(!validString(key)||!validString(r?.sku)||!validString(r?.maker)||!validString(r?.series)){
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
  if(!validString(r.source)||!/^https:\/\/[a-z0-9.-]+(?:[:/\\?#]|$)/i.test(r.source)){
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
 const items=Object.entries(c.articles).map(([id,a])=>'<tr><td>'+esc(a.maker)+'</td><td>'+esc(a.series)+'</td><td>'+esc(a.sku)+'</td><td>'+esc(a.inA)+' A</td><td>'+esc(a.modules)+' M</td><td><a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">Источник</a></td><td>'+esc(a.sourceType||'SEED')+'</td></tr>').join('');
 return '<section class="panel compact ep-catalog-workbench"><h3>Каталог оборудования · проект</h3>'+
 '<p>Записей: '+Object.keys(c.articles).length+'. Пользовательские данные не подтверждены производителем автоматически. Замечаний: '+c.issues.length+'.</p>'+
 '<div class="table-scroll"><table><thead><tr><th>Производитель</th><th>Серия</th><th>Артикул</th><th>In</th><th>Ширина</th><th>Документ</th><th>Статус</th></tr></thead><tbody>'+items+'</tbody></table></div>'+
 '<p>Добавление: JSON-массив записей с id, sku, maker, series, kind, modules, widthMm, poles, inA, source. '+
 'Сначала проверяется формат, затем данные сохраняются вместе с проектом.</p>'+
 '<textarea id="catalogJsonInput" rows="5" placeholder="JSON-массив артикулов"></textarea>'+
 '<button type="button" class="btn tiny" id="catalogImportRecordsBtn">Добавить артикулы в проект</button>'+
 '<button type="button" class="btn tiny" id="catalogExportRecordsBtn">Экспорт каталога JSON</button>'+
 '</section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProjectCatalogV1,epProjectCatalogHtmlV1};
