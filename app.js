'use strict';
// Electropanel Web Preview. Static document editor, NOT a normative engineering calculation engine.
const $ = id => document.getElementById(id);
const initial = () => ({schema:'electropanel.web.preview.1',title:'Новый проект',earthing:'UNKNOWN',railCapacity:12,railCount:2,lines:[],loads:[],sharedDevices:[],conductorRoutes:[],wiringVersion:1,terminalLinks:[],terminalVersion:1,feedLinks:[],feedVersion:1,groupInputLinks:[],groupInputVersion:1,plan:null,changedAt:new Date().toISOString()});
const demoRaw = () => ({schema:'electropanel.web.preview.1',title:'Квартира · ЩР-1',earthing:'TN-C-S',railCapacity:12,railCount:2,lines:[{id:'L1',name:'Освещение',power:1.2,phase:'L1',device:'B10',modules:1},{id:'L2',name:'Розетки кухни',power:3.0,phase:'L1',device:'C16',modules:1},{id:'L3',name:'Розетки комнат',power:3.2,phase:'L2',device:'C16',modules:1},{id:'L4',name:'Кондиционер',power:2.5,phase:'L3',device:'C16',modules:1},{id:'L5',name:'Духовой шкаф',power:3.0,phase:'L2',device:'C20',modules:1},{id:'L6',name:'Варочная панель',power:7.0,phase:'3Ф',device:'C32',modules:3}],plan:null,changedAt:new Date().toISOString()});
const demo = () => {const project=demoRaw();project.lines=project.lines.map(l=>({...l,source:'demo'}));return project;};
const demoCommercial = () => ({schema:'electropanel.web.preview.1',title:'Коммерция · небольшое помещение',earthing:'TN-S',railCapacity:18,railCount:2,lines:[
 {id:'L1',name:'Освещение торгового зала',power:2.4,phase:'L1',device:'B10',modules:1,source:'demo'},
 {id:'L2',name:'Розеточная группа',power:3.8,phase:'L2',device:'C16',modules:1,source:'demo'},
 {id:'L3',name:'Кондиционирование',power:4.5,phase:'3Ф',device:'C16',modules:3,source:'demo'},
 {id:'L4',name:'Вентиляция',power:1.5,phase:'L3',device:'C16',modules:1,source:'demo'}],plan:null,changedAt:new Date().toISOString()});
let state = initial(); let selectedLine = null; let currentView = 'overview'; let pendingRows = []; let planPreviewUrl = null; const MAX_LINES=400;
const historyUndo=[], historyRedo=[]; let dragLineId=null; const MAX_HISTORY=30;
const SOURCES=Object.freeze({manual:'Ручной ввод',tz:'Техническое задание',csv:'Импорт CSV',demo:'Учебный пример',unknown:'Источник неизвестен'});
function snapshot(){ensureV2(state);return JSON.stringify(state);}
function checkpoint(){historyUndo.push(snapshot());if(historyUndo.length>MAX_HISTORY)historyUndo.shift();historyRedo.length=0;}
function restoreHistory(from,to){if(!from.length)return;to.push(snapshot());const next=normalizeImport(JSON.parse(from.pop()));if(planPreviewUrl){URL.revokeObjectURL(planPreviewUrl);planPreviewUrl=null;}state=next;selectedLine=null;changed();notify('История изменений восстановлена');}
function reorderLine(sourceId,targetId){const from=state.lines.findIndex(l=>l.id===sourceId),to=state.lines.findIndex(l=>l.id===targetId);if(from<0||to<0||from===to)return false;checkpoint();const [moved]=state.lines.splice(from,1);state.lines.splice(to,0,moved);changed();return true;}
function removeLine(id){if(!state.lines.some(l=>l.id===id))return false;checkpoint();ensureV2(state);state.loads=state.loads.filter(x=>x.circuitId!==id);state.conductorRoutes=state.conductorRoutes.filter(x=>x.circuitId!==id);state.terminalLinks=state.terminalLinks.filter(x=>x.circuitId!==id);state.feedLinks=state.feedLinks.filter(x=>x.circuitId!==id);state.sharedDevices.forEach(d=>d.circuitIds=d.circuitIds.filter(c=>c!==id));state.sharedDevices=state.sharedDevices.filter(d=>d.circuitIds.length);state.groupInputLinks=state.groupInputLinks.filter(f=>state.sharedDevices.some(d=>d.id===f.groupId));state.lines=state.lines.filter(x=>x.id!==id);if(selectedLine===id)selectedLine=null;changed();return true;}
function safeText(v){return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function notify(message,error=false){const t=document.createElement('div');t.className='toast'+(error?' error':'');t.textContent=message;document.body.appendChild(t);setTimeout(()=>t.remove(),3800);}
function changed(){syncBranchDevices(state);state.branchModelVersion=1;ensureV2(state);state.changedAt=new Date().toISOString();try{localStorage.setItem('electropanel_web_preview',JSON.stringify(state));}catch(e){notify('Не удалось сохранить автокопию в браузере',true);}render();}
function switchView(view){currentView=view;document.querySelectorAll('.view').forEach(n=>n.classList.toggle('active',n.id==='view-'+view));document.querySelectorAll('[data-view]').forEach(n=>n.classList.toggle('active',n.dataset.view===view));$('breadcrumbTitle').textContent=state.title||'Новый проект';$('menuToggle').closest('.main').previousElementSibling.classList.remove('open');render();}
// UI templates are generic layout hints, NOT verified manufacturer catalogue records.
const DEVICE_TEMPLATES=Object.freeze({
 'MCB_1P':{label:'Автомат 1P',modules:1,device:'Автомат 1P'},
 'MCB_3P':{label:'Автомат 3P',modules:3,device:'Автомат 3P'},
 'RCBO_1PN':{label:'Дифавтомат 1P+N',modules:2,device:'Диф. 1P+N'},
 'RCD_2P':{label:'УЗО 2P',modules:2,device:'УЗО 2P'},
 'RCD_4P':{label:'УЗО 4P',modules:4,device:'УЗО 4P'},
 'SWITCH_2P':{label:'Выключатель 2P',modules:2,device:'Рубильник 2P'},
 'SWITCH_4P':{label:'Выключатель 4P',modules:4,device:'Рубильник 4P'}
});


function catalogDevice(sku){return typeof epCatalogSku==='function'?epCatalogSku(sku):null;}
// UI filters are temporary preferences, never electrical or catalogue data.
let catalogMakerFilter='',catalogSeriesFilter='';
function catalogChoices(selected,phase=''){
 const items=typeof epCatalogFilter==='function'?epCatalogFilter(catalogMakerFilter,catalogSeriesFilter,phase):[];
 const current=catalogDevice(selected);
 if(current&&!items.some(([id])=>id===selected))items.unshift([selected,current]);
 const unknown=selected&&!current;
 return '<option value="">Без артикула · условный аппарат</option>'+
  (unknown?'<option value="'+safeText(selected)+'" selected>⚠ Артикул отсутствует в текущем каталоге: '+safeText(selected)+'</option>':'')+
  items.map(([id,d])=>'<option value="'+safeText(id)+'" '+(selected===id?'selected':'')+'>'+safeText(d.maker+' / '+d.series+' / '+d.label+' / '+d.sku)+'</option>').join('');
}
function catalogFilterControls(){
 const maker=catalogMakerFilter,series=catalogSeriesFilter;
 const makers=typeof epCatalogMakers==='function'?epCatalogMakers():[];
 const seriesList=typeof epCatalogSeries==='function'?epCatalogSeries(maker):[];
 return '<label class="device-preset-label">Производитель<select id="catalogMaker"><option value="">Все производители</option>'+
  makers.map(m=>'<option value="'+safeText(m)+'" '+(m===maker?'selected':'')+'>'+safeText(m)+'</option>').join('')+
  '</select></label><label class="device-preset-label">Серия<select id="catalogSeries"><option value="">Все серии</option>'+
  seriesList.map(m=>'<option value="'+safeText(m)+'" '+(m===series?'selected':'')+'>'+safeText(m)+'</option>').join('')+
  '</select></label>';
}
const REVIEW_FIELDS=['overloadInput','faultInput','overloadV30','lv43Input','route44Input'];
function markCalculationReview(line,reason){
 const existing=REVIEW_FIELDS.filter(key=>!!line[key]);
 if(!existing.length&&!line.calculationReview?.required)return;
 const pending=new Set(line.calculationReview?.pending||existing);
 for(const key of existing)pending.add(key);
 line.calculationReview={required:true,reason,pending:[...pending]};
}
// Acknowledging one check must never clear an unrelated stale calculation.
function acknowledgeCalculationReview(line,key){
 if(!line.calculationReview?.required)return;
 const pending=Array.isArray(line.calculationReview.pending)?
  line.calculationReview.pending.filter(k=>REVIEW_FIELDS.includes(k)):
  REVIEW_FIELDS.filter(k=>!!line[k]);
 const remaining=pending.filter(k=>k!==key);
 if(remaining.length)line.calculationReview={...line.calculationReview,pending:remaining};
 else delete line.calculationReview;
}
// Retained for explicit internal reset/test only. UI uses acknowledge per field.
function clearCalculationReview(line){delete line.calculationReview;}
function applyCatalogueSku(project,circuitId,sku){
 const dev=catalogDevice(sku),line=project.lines.find(l=>l.id===circuitId);
 if(!dev||!line)throw Error('Не найдена цепь или артикул');
 if(typeof epCatalogCompatible!=='function'||!epCatalogCompatible(sku,line.phase))throw Error('Полюса каталожного аппарата не соответствуют фазности линии');
 if(line.catalogSku!==sku)markCalculationReview(line,'ARTICLE_CHANGED');
 updateBranchApparatus(project,circuitId,{label:dev.label,modules:dev.modules,templateId:null});
 line.catalogSku=sku;
 return dev;
}
function catalogAudit(project){
 const issues=[];
 for(const l of project.lines){
  if(l.calculationReview?.required)
   issues.push({circuitId:l.id,code:'CALCULATION_REVIEW_REQUIRED',message:'Исходные данные или аппарат изменены; ранее введённые токи требуют повторной проверки'});
  if(!l.catalogSku)continue;
  const dev=catalogDevice(l.catalogSku);
  if(!dev){issues.push({circuitId:l.id,code:'CATALOG_UNKNOWN',message:'Неизвестный артикул'});continue;}
  if(!epCatalogCompatible(l.catalogSku,l.phase)||l.modules!==dev.modules||l.device!==dev.label)
   issues.push({circuitId:l.id,code:'CATALOG_MISMATCH',message:'Фаза, ширина или обозначение не соответствуют выбранному артикулу'});
  for(const issue of epCatalogDeclaredCurrentIssues(l.catalogSku,l.overloadInput))
   issues.push({circuitId:l.id,...issue});
  const fault=epBreakingCapacityCheck(dev,l.faultInput?.ikKa);
  if(fault.status==='FAIL'||fault.status==='INVALID')
   issues.push({circuitId:l.id,code:'CATALOG_IK_'+fault.status,message:fault.message});
  if(l.faultInput?.ikKa&&!String(l.faultInput.source||'').trim())
   issues.push({circuitId:l.id,code:'CATALOG_IK_SOURCE_MISSING',message:'Не указан источник ожидаемого тока КЗ'});
 }
 return {issues,engineeringApproved:false};
}
function faultLineInfo(line){
 if(!line)return '';
 const res=epBreakingCapacityCheck(catalogDevice(line.catalogSku),line.faultInput?.ikKa);
 const stateLabel={FAIL:'ПРЕВЫШЕНИЕ Icn',INVALID:'ОШИБКА ВВОДА',UNKNOWN:'НЕ ПРОВЕРЕНО',PRELIMINARY_PASS:'ТОЛЬКО ПРЕДВАРИТЕЛЬНО'}[res.status];
 return '<div class="ep-fault-status ep-fault-'+res.status.toLowerCase()+'"><strong>Iкз / Icn: '+safeText(stateLabel)+'</strong><span>'+safeText(res.message)+'</span><span>Источник: '+safeText(line.faultInput?.source||'не указан')+' (заявлено пользователем, не проверено)</span></div>';
}
function devicePreviewHtml(line){
 if(!line)return '';
 const visual=deviceAppearance(line);
 return '<div class="ep-preview-wrap"><div class="ep-preview-article ep-real-device ep-'+safeText(visual.type)+'" aria-label="Стилизованный фасад '+safeText(visual.maker)+'">'+
 '<span class="ep-terminal ep-terminal-top"></span><span class="ep-face"><span class="ep-brand">'+safeText(visual.maker)+'</span>'+
 '<span class="ep-series">'+safeText(visual.series)+'</span><span class="ep-rating">'+safeText(visual.mark)+'</span>'+
 '<span class="ep-rocker"><i></i></span><span class="ep-sku">'+safeText(visual.sku||line.id)+'</span>'+
 '<span class="ep-note">'+safeText(line.id)+'</span></span><span class="ep-terminal ep-terminal-bottom"></span></div>'+
 '<div class="ep-preview-caption"><b>Фасад выбранного аппарата</b><span>Оригинальный стилизованный рендер, не фотография и не CAD изготовителя</span></div></div>';
}
function deviceAppearance(line){
 const d=catalogDevice(line.catalogSku);
 return d?{type:d.appearance,maker:d.maker,series:d.series,sku:d.sku,mark:d.label}:
 {type:'generic',maker:'DIN',series:'Условный аппарат',sku:'',mark:line.device||'—'};
}

// v0.6: A line is a CIRCUIT, NOT a load. Branch devices are circuit declarations.
// Shared upstream devices are independent declarations. These are not verified wiring paths.
const PROJECT_SCHEMA='electropanel.web.preview.2';
function uniqueEntityId(prefix, existing){let i=1;while(existing.some(x=>x.id===prefix+i))i++;return prefix+i;}
function migrateLegacyEntities(project){
 const p=project;
 p.loads=p.lines.map((l,i)=>({id:'LD'+(i+1),circuitId:l.id,name:String(l.name??''),powerKw:l.power===undefined?null:l.power,source:l.source||'unknown',sourceRef:l.sourceRef||''}));
 p.sharedDevices=[];
 p.schema=PROJECT_SCHEMA;
 return p;
}
function validateEntities(project){
 if(!Array.isArray(project.loads)||!Array.isArray(project.sharedDevices))throw Error('Нет списков потребителей или общих аппаратов');
 if(project.loads.length>1600||project.sharedDevices.length>100)throw Error('Превышен лимит сущностей');
 const circuitIds=new Set(project.lines.map(l=>l.id));
 const ids=new Set([...circuitIds]);
 for(const l of project.loads){
  if(!l||typeof l.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(l.id)||ids.has(l.id))throw Error('Некорректный или повторный ID потребителя');
  ids.add(l.id);
  if(!circuitIds.has(l.circuitId))throw Error('Потребитель ссылается на несуществующую цепь');
  if(typeof l.name!=='string'||l.name.length>100)throw Error('Недопустимое название потребителя');
  if(l.powerKw!==null&&(typeof l.powerKw!=='number'||!Number.isFinite(l.powerKw)||l.powerKw<0||l.powerKw>100000))throw Error('Некорректная мощность потребителя');
 }
 for(const d of project.sharedDevices){
  if(!d||typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(d.id)||ids.has(d.id))throw Error('Некорректный или повторный ID общего аппарата');
  ids.add(d.id);
  if(!['RCD_2P','RCD_4P'].includes(d.templateId)||!Number.isInteger(d.modules)||d.modules!==DEVICE_TEMPLATES[d.templateId].modules)throw Error('Неизвестный тип или ширина общего аппарата');
  if(typeof d.label!=='string'||!d.label.trim()||d.label.length>50)throw Error('Не указано обозначение общего аппарата');
  if(!Array.isArray(d.circuitIds)||!d.circuitIds.length||new Set(d.circuitIds).size!==d.circuitIds.length)throw Error('Общий аппарат должен иметь неповторяющийся список цепей');
  for(const id of d.circuitIds)if(!circuitIds.has(id))throw Error('Общий аппарат ссылается на несуществующую цепь');
  if(project.sharedDevices.some(other=>other!==d&&other.circuitIds?.some(id=>d.circuitIds.includes(id))))throw Error('Цепь привязана к двум общим УЗО в упрощённой модели');
  if(d.templateId==='RCD_2P'){const phases=project.lines.filter(l=>d.circuitIds.includes(l.id)).map(l=>l.phase);if(phases.some(x=>!['L1','L2','L3'].includes(x))||new Set(phases).size!==1)throw Error('УЗО 2P не допускает разные или трёхфазные цепи');}
 }
 return true;
}
function reconcileCircuitPowers(project){
 for(const c of project.lines){
  const assigned=project.loads.filter(l=>l.circuitId===c.id);
  const next=assigned.length&&assigned.every(l=>l.powerKw!==null)?Math.round(assigned.reduce((sum,l)=>sum+l.powerKw,0)*1000)/1000:null;
  if(c.power!==next)markCalculationReview(c,'LOAD_CHANGED');
  c.power=next;
 }
 return project;
}
function addConsumerTo(project,circuitId,name,powerKw,source='manual'){
 if(!project.lines.some(c=>c.id===circuitId))throw Error('Несуществующая цепь');
 if(project.loads.length>=1600)throw Error('Лимит потребителей');
 if(typeof name!=='string'||!name.trim()||name.length>100||typeof powerKw!=='number'||!Number.isFinite(powerKw)||powerKw<=0||powerKw>100000)throw Error('Неверное имя или мощность потребителя');
 const load={id:uniqueEntityId('LD',project.loads),circuitId,name:name.trim(),powerKw,source,sourceRef:''};
 project.loads.push(load);reconcileCircuitPowers(project);return load;
}
function editConsumerIn(project,id,name,powerKw){
 const l=project.loads.find(x=>x.id===id);
 if(!l)throw Error('Потребитель не найден');
 if(typeof name!=='string'||!name.trim()||name.length>100||typeof powerKw!=='number'||!Number.isFinite(powerKw)||powerKw<=0||powerKw>100000)throw Error('Введите название и положительную мощность');
 l.name=name.trim();l.powerKw=powerKw;l.source='manual';l.sourceRef='Ручная корректировка ранее введённой записи';
 reconcileCircuitPowers(project);return l;
}
function removeConsumerFrom(project,id){const idx=project.loads.findIndex(x=>x.id===id);if(idx<0)return false;project.loads.splice(idx,1);if(Array.isArray(project.terminalLinks))project.terminalLinks=project.terminalLinks.filter(x=>x.loadId!==id);reconcileCircuitPowers(project);return true;}
function addSharedRCDTo(project,templateId,label,circuitIds){
 const template=DEVICE_TEMPLATES[templateId];if(!template||!['RCD_2P','RCD_4P'].includes(templateId))throw Error('Общий аппарат должен быть УЗО 2P или 4P');
 if(templateId==='RCD_2P'&&project.lines.some(l=>circuitIds.includes(l.id)&&!['L1','L2','L3'].includes(l.phase)))throw Error('УЗО 2P требует указанных однофазных цепей');
 if(templateId==='RCD_2P'&&new Set(project.lines.filter(l=>circuitIds.includes(l.id)).map(l=>l.phase)).size!==1)throw Error('УЗО 2P нельзя объединять цепи разных фаз в этой модели');
 const d={id:uniqueEntityId('RCD',project.sharedDevices),templateId,label,modules:template.modules,circuitIds:[...circuitIds]};
 project.sharedDevices.push(d);try{validateEntities(project);}catch(e){project.sharedDevices.pop();throw e;}return d;
}
function removeSharedDeviceFrom(project,id){const i=project.sharedDevices.findIndex(x=>x.id===id);if(i<0)return false;project.sharedDevices.splice(i,1);if(Array.isArray(project.groupInputLinks))project.groupInputLinks=project.groupInputLinks.filter(x=>x.groupId!==id);return true;}
// v0.7: branch protective apparatus is a separate stable entity. Legacy line fields
// remain a compatibility VIEW only and must agree with the apparatus record.
function branchId(circuitId){let h=2166136261;for(const ch of String(circuitId)){h=Math.imul(h^ch.charCodeAt(0),16777619);}return 'BD-'+(h>>>0).toString(16);}
function syncBranchDevices(project){
 if(!Array.isArray(project.branchDevices))project.branchDevices=[];
 const byCircuit=new Map(project.branchDevices.map(b=>[b.circuitId,b]));
 project.branchDevices=project.lines.map(l=>{
  const b=byCircuit.get(l.id)||{id:branchId(l.id),circuitId:l.id};
  b.label=l.device||'';b.modules=l.modules;b.templateId=l.templateId||null;
  return b;
 });
 return project;
}
function validateBranchDevices(project){
 if(!Array.isArray(project.branchDevices)||project.branchDevices.length!==project.lines.length)throw Error('Аппараты и цепи не совпадают по количеству');
 const refs=new Set(),ids=new Set([...project.lines.map(x=>x.id),...project.loads.map(x=>x.id),...project.sharedDevices.map(x=>x.id)]);
 for(const b of project.branchDevices){
  if(!b||typeof b.id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(b.id)||ids.has(b.id))throw Error('Повторный или недопустимый ID отходящего аппарата');
  ids.add(b.id);
  const l=project.lines.find(c=>c.id===b.circuitId);
  if(!l||refs.has(b.circuitId))throw Error('Повторное или несуществующее назначение отходящего аппарата');
  refs.add(b.circuitId);
  if(typeof b.label!=='string'||b.label!==(l.device||'')||b.modules!==l.modules||(b.templateId||null)!==(l.templateId||null))throw Error('Параметры аппарата противоречат ведомости линии');
  if(!Number.isInteger(b.modules)||b.modules<1||b.modules>12)throw Error('Недопустимая ширина отходящего аппарата');
 }
 return true;
}
function updateBranchApparatus(project,circuitId,patch){
 ensureV2(project);
 const l=project.lines.find(x=>x.id===circuitId),b=project.branchDevices.find(x=>x.circuitId===circuitId);
 if(!l||!b)throw Error('Отходящий аппарат или цепь не найдены');
 const label=patch.label===undefined?b.label:patch.label,modules=patch.modules===undefined?b.modules:patch.modules,
  templateId=patch.templateId===undefined?b.templateId:patch.templateId;
 if(typeof label!=='string'||label.length>25||!Number.isInteger(modules)||modules<1||modules>12)throw Error('Некорректные параметры отходящего аппарата');
 if(templateId!==null&&templateId!==undefined&&!DEVICE_TEMPLATES[templateId])throw Error('Несуществующий шаблон аппарата');
 if(templateId&&DEVICE_TEMPLATES[templateId].modules!==modules)throw Error('Ширина не соответствует выбранному шаблону');
 // Commit after all validations, preserving the stable apparatus ID.
 if(label!==b.label||modules!==b.modules||templateId!==b.templateId)
  markCalculationReview(l,'APPARATUS_CHANGED');
 b.label=label;b.modules=modules;b.templateId=templateId||null;
 l.device=label;l.modules=modules;
 if(b.templateId)l.templateId=b.templateId;else delete l.templateId;
 return b;
}
function circuitGraph(project=state){
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:project.lines.map(l=>({id:branchId(l.id),circuitId:l.id,label:l.device||'',modules:l.modules}));
 return project.lines.map(c=>{
  const branch=branches.find(b=>b.circuitId===c.id);
  const upstream=(project.sharedDevices||[]).find(d=>d.circuitIds.includes(c.id));
  return {circuitId:c.id,circuitName:c.name,phase:c.phase,apparatusId:branch?.id||null,apparatusLabel:branch?.label||'',upstreamId:upstream?.id||null,upstreamLabel:upstream?.label||null,
   consumers:(project.loads||[]).filter(l=>l.circuitId===c.id).map(l=>({id:l.id,name:l.name,powerKw:l.powerKw})),powerKw:c.power};
 });
}
function graphAudit(project=state){
 const checks=[],graph=circuitGraph(project),ids=new Set();
 for(const g of graph){
  if(!g.apparatusId)checks.push({status:'ERROR',message:g.circuitId+': нет отходящего аппарата'});
  if(!g.apparatusLabel)checks.push({status:'MISSING',message:g.circuitId+': отсутствует обозначение аппарата'});
  if(!g.consumers.length)checks.push({status:'MISSING',message:g.circuitId+': отсутствуют потребители'});
  for(const c of g.consumers){if(ids.has(c.id))checks.push({status:'ERROR',message:'Повторный потребитель '+c.id});ids.add(c.id);}
 }
 return {status:checks.length?'INCOMPLETE':'LOGICAL_DRAFT',engineeringApproved:false,graph,checks,
  warning:'Логические назначения не являются электрическими соединениями. Не подтверждены клеммы, N/PE, паспорта аппаратов и монтаж.'};
}
function graphSvg(project=state){
 const g=graphAudit(project),rows=g.graph,height=Math.max(210,135+rows.reduce((n,r)=>n+Math.max(66,38+22*r.consumers.length)+10,0));
 const esc=escapeXml,parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="0 0 1160 ${height}">`,
 '<rect width="100%" height="100%" fill="#f8fafc"/>',`<text x="36" y="40" fill="#172d37" font-family="Arial" font-size="24" font-weight="bold">${esc(project.title)}</text>`,
 '<text x="36" y="64" fill="#647885" font-family="Arial" font-size="13">ЛОГИЧЕСКАЯ СТРУКТУРА ЦЕПЕЙ · НЕ ЭЛЕКТРИЧЕСКАЯ / МОНТАЖНАЯ СХЕМА</text>'];
 let y=98;
 for(const r of rows){const h=Math.max(66,38+22*r.consumers.length),text=r.consumers.map(x=>x.name+' ('+(x.powerKw??'?')+' кВт)').join(' · ');
  parts.push(`<rect x="30" y="${y}" width="1090" height="${h}" rx="9" fill="#ffffff" stroke="#d8e2e9"/>`);
  parts.push(`<text x="48" y="${y+25}" font-family="Arial" font-weight="bold" font-size="14" fill="#152f3b">${esc(r.circuitId+' · '+r.circuitName)}</text>`);
  parts.push(`<text x="48" y="${y+46}" font-family="Arial" font-size="12" fill="#697e89">${esc(r.phase||'Фаза неизвестна')}</text>`);
  parts.push(`<text x="280" y="${y+26}" font-family="Arial" font-size="13" fill="#44616c">${esc((r.upstreamLabel||'Без группового УЗО')+' → '+(r.apparatusLabel||'Аппарат не выбран'))}</text>`);
  r.consumers.forEach((c,i)=>parts.push(`<text x="280" y="${y+49+i*22}" font-family="Arial" font-size="12" fill="#6a7d86">${esc('↳ '+c.name+' · '+(c.powerKw??'?')+' кВт')}</text>`));
  y+=h+10;
 }
 parts.push(`<text x="36" y="${height-15}" font-family="Arial" font-size="12" fill="#a75527">${esc(g.warning)}</text></svg>`);
 return parts.join('');
}
// v0.8: declared conductor routes, NOT physical terminal wiring.
// The UI intentionally does not assign a conductor/neutral automatically after import.
const WIRING_VERSION=1;
function expectedNBus(project,circuitId){
 const group=project.sharedDevices.find(d=>d.circuitIds.includes(circuitId));
 return group?'N_'+group.id:'N_MAIN';
}
function expectedPhaseSet(phase){return phase==='3Ф'?['L1','L2','L3']:['L1','L2','L3'].includes(phase)?[phase]:[];}
function proposedConductorRoute(project,circuitId){
 const circuit=project.lines.find(l=>l.id===circuitId);
 if(!circuit)throw Error('Не найдена цепь для маршрута проводников');
 const device=project.branchDevices.find(b=>b.circuitId===circuitId);
 if(!device)throw Error('Не найден отходящий аппарат');
 return {circuitId,branchDeviceId:device.id,phaseConductors:expectedPhaseSet(circuit.phase),neutralBus:expectedNBus(project,circuitId),protectiveBus:null,origin:'draft-proposal'};
}
function validateConductorRoutes(project){
 if(!Array.isArray(project.conductorRoutes)||project.conductorRoutes.length>project.lines.length)throw Error('Повреждён список заявленных проводников');
 const seen=new Set();
 for(const r of project.conductorRoutes){
  if(!r||typeof r.circuitId!=='string'||seen.has(r.circuitId))throw Error('Дублирование маршрута цепи');
  seen.add(r.circuitId);
  const l=project.lines.find(c=>c.id===r.circuitId);
  if(!l)throw Error('Маршрут ссылается на удалённую цепь');
  if(typeof r.branchDeviceId!=='string'||r.branchDeviceId!==project.branchDevices.find(b=>b.circuitId===r.circuitId)?.id)throw Error('Маршрут ссылается на неверный отходящий аппарат');
  if(!Array.isArray(r.phaseConductors)||r.phaseConductors.length>3||new Set(r.phaseConductors).size!==r.phaseConductors.length||r.phaseConductors.some(x=>!['L1','L2','L3'].includes(x)))throw Error('Некорректное указание фазных проводников');
  if(typeof r.neutralBus!=='string'||!/^N_(?:MAIN|RCD[0-9]+)$/.test(r.neutralBus))throw Error('Некорректная шина N');
  if(r.protectiveBus!=='PE_MAIN'&&r.protectiveBus!==null)throw Error('Неизвестная шина PE');
  if(!['draft-proposal','manual'].includes(r.origin))throw Error('Неизвестный источник маршрута');
 }
 return true;
}
function conductorAudit(project){
 const issues=[],routes=project.conductorRoutes||[];
 for(const c of project.lines){
  const route=routes.find(r=>r.circuitId===c.id),ph=expectedPhaseSet(c.phase);
  if(!route){issues.push({code:'ROUTE_MISSING',circuitId:c.id,message:'Не задан маршрут L/N/PE'});continue;}
  if(!ph.length)issues.push({code:'PHASE_UNSET',circuitId:c.id,message:'Не указана фаза цепи'});
  else if(JSON.stringify([...route.phaseConductors].sort())!==JSON.stringify([...ph].sort()))issues.push({code:'PHASE_MISMATCH',circuitId:c.id,message:'Маршрут фаз не совпадает с фазой цепи'});
  if(route.neutralBus!==expectedNBus(project,c.id))issues.push({code:'NEUTRAL_CONFLICT',circuitId:c.id,message:'Нейтраль назначена не на шину своей группы УЗО'});
  if(route.protectiveBus!=='PE_MAIN')issues.push({code:'PE_UNDECLARED',circuitId:c.id,message:'Не заявлен маршрут PE'});
 }
 const neutralOwnership=new Map();
 for(const r of routes){
  const owner=expectedNBus(project,r.circuitId);
  if(neutralOwnership.has(r.neutralBus)&&neutralOwnership.get(r.neutralBus)!==owner)issues.push({code:'NEUTRAL_SHARED',circuitId:r.circuitId,message:'Одна шина N используется цепями с разными группами защиты'});
  neutralOwnership.set(r.neutralBus,owner);
 }
 return {status:issues.length?'INCOMPLETE':'DECLARED_ONLY',engineeringApproved:false,routes:routes.length,issues,
  warning:'Назначения проводников заявлены, но непрерывность PE, клеммы, сечения, токи КЗ, отключение и физический монтаж не проверены.'};
}
function setConductorRoute(project,circuitId,neutralBus,protectiveBus=null){
 const proposal=proposedConductorRoute(project,circuitId);
 if(typeof neutralBus!=='string'||!/^N_(?:MAIN|RCD[0-9]+)$/.test(neutralBus))throw Error('Неверное обозначение нейтральной шины');
 if(![null,'PE_MAIN'].includes(protectiveBus))throw Error('Неверное обозначение защитной шины');
 const updated={...proposal,neutralBus,protectiveBus,origin:'manual'};
 const next=project.conductorRoutes.filter(r=>r.circuitId!==circuitId).concat(updated);
 validateConductorRoutes({...project,conductorRoutes:next});
 project.conductorRoutes=next;
 return updated;
}
function clearConductorRoute(project,circuitId){
 const i=project.conductorRoutes.findIndex(r=>r.circuitId===circuitId);if(i<0)return false;project.conductorRoutes.splice(i,1);return true;
}
function proposeAllConductorRoutes(project){
 // Explicit user gesture only; never silently convert migration data into confirmed wiring.
 const proposal=[...project.conductorRoutes,...project.lines.filter(l=>!project.conductorRoutes.some(r=>r.circuitId===l.id)).map(l=>proposedConductorRoute(project,l.id))];
 validateConductorRoutes({...project,conductorRoutes:proposal});
 project.conductorRoutes=proposal;
 return conductorAudit(project);
}
function conductorCsv(project){
 const audited=conductorAudit(project);
 const safe=v=>{const raw=String(v??'');const guarded=/^[\s]*[=+@-]/.test(raw)?"'"+raw:raw;return '"'+guarded.replace(/"/g,'""')+'"';};
 const rows=[['ID цепи','Название','Фаза цепи','Отходящий аппарат ID','Фазы заявлены','Шина N','Шина PE','Статус'],...project.lines.map(c=>{
  const r=project.conductorRoutes.find(x=>x.circuitId===c.id);const related=audited.issues.filter(x=>x.circuitId===c.id);
  return [c.id,c.name,c.phase,r?.branchDeviceId||'',r?.phaseConductors.join('/')||'',r?.neutralBus||'',r?.protectiveBus||'',related.map(x=>x.code).join(' | ')||'Только декларация'];
 })];
 return '\uFEFF'+rows.map(row=>row.map(safe).join(';')).join('\r\n');
}
function conductorSvg(project){
 const audit=conductorAudit(project),esc=escapeXml,rows=project.lines.map(c=>({c,route:project.conductorRoutes.find(r=>r.circuitId===c.id)}));
 const height=Math.max(170,125+rows.length*47);
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="0 0 1160 ${height}">`,
 '<rect width="100%" height="100%" fill="#f8fafc"/>',`<text x="28" y="38" font-family="Arial" font-size="20" font-weight="bold" fill="#183140">${esc(project.title)}</text>`,
 '<text x="28" y="64" font-family="Arial" font-size="13" fill="#ad4b35">ЧЕРНОВЫЕ НАЗНАЧЕНИЯ L/N/PE · НЕ МОНТАЖНАЯ СХЕМА · НЕ ДЛЯ СТРОИТЕЛЬСТВА</text>'];
 rows.forEach(({c,route},i)=>{const y=94+i*47;parts.push(`<rect x="25" y="${y}" width="1105" height="40" rx="6" fill="white" stroke="#dce5ea"/>`);
 parts.push(`<text x="40" y="${y+25}" font-family="Arial" font-size="13" fill="#234">${esc(c.id+' · '+c.name)}</text>`);
 parts.push(`<text x="425" y="${y+25}" font-family="Arial" font-size="13" fill="#425f6b">${esc(route?(route.phaseConductors.join('/')||'L?')+'   →   '+route.neutralBus+'   ·   '+(route.protectiveBus||'PE не заявлен'):'Маршрут не задан')}</text>`);});
 parts.push(`<text x="28" y="${height-9}" font-family="Arial" font-size="11" fill="#ad4b35">${esc(audit.warning)}</text></svg>`);
 return parts.join('');
}

// v0.9: symbolic terminal-link declarations for individual consumers. All terminals
// are software identifiers, NOT verified manufacturer contacts or installation wires.
const TERMINAL_VERSION=1;
function symbolicTerminalLink(project,loadId,kind){
 const load=project.loads.find(l=>l.id===loadId);
 if(!load)throw Error('Неизвестный потребитель');
 const route=project.conductorRoutes.find(r=>r.circuitId===load.circuitId);
 if(!route)throw Error('Сначала требуется декларация маршрута цепи');
 const phases=expectedPhaseSet(project.lines.find(l=>l.id===load.circuitId)?.phase);
 if(![...phases,'N','PE'].includes(kind))throw Error('Контакт не соответствует фазам потребителя');
 if(kind==='PE'&&route.protectiveBus!=='PE_MAIN')throw Error('PE не заявлен: автоматическое подключение запрещено');
 const from=kind==='N'?`BUS:${route.neutralBus}/N`:kind==='PE'?`BUS:${route.protectiveBus}/PE`:`BRANCH:${route.branchDeviceId}/${kind}`;
 return {id:`T:${load.id}:${kind}`,loadId:load.id,circuitId:load.circuitId,kind,from,to:`LOAD:${load.id}/${kind}`,origin:'symbolic-declaration'};
}
function validateTerminalLinks(project){
 if(!Array.isArray(project.terminalLinks)||project.terminalLinks.length>5000)throw Error('Некорректный список контактных деклараций');
 const keys=new Set(),ids=new Set();
 for(const link of project.terminalLinks){
  if(!link||typeof link!=='object'||typeof link.id!=='string'||!/^T:[A-Za-z0-9_-]{1,40}:(L1|L2|L3|N|PE)$/.test(link.id)||ids.has(link.id))throw Error('Повтор или неверный ID контактной декларации');
  ids.add(link.id);
  if(!project.loads.some(l=>l.id===link.loadId&&l.circuitId===link.circuitId))throw Error('Контактная декларация ссылается на отсутствующего потребителя или цепь');
  if(!['L1','L2','L3','N','PE'].includes(link.kind)||link.id!==`T:${link.loadId}:${link.kind}`)throw Error('Повреждён тип контактной декларации');
  if(typeof link.from!=='string'||link.from.length>100||!/^((BRANCH:[A-Za-z0-9_-]{1,40}\/L[123])|(BUS:(N_(MAIN|RCD[0-9]+)\/N|PE_MAIN\/PE)))$/.test(link.from))throw Error('Недопустимый источник контактной декларации');
  if(link.to!==`LOAD:${link.loadId}/${link.kind}`||link.origin!=='symbolic-declaration')throw Error('Некорректный получатель или источник данных контакта');
  const key=link.loadId+'/'+link.kind;
  if(keys.has(key))throw Error('Дублирование входа потребителя');
  keys.add(key);
 }
 return true;
}
function terminalAudit(project){
 const issues=[],links=project.terminalLinks||[];
 for(const load of (project.loads||[])){
  const circuit=project.lines.find(c=>c.id===load.circuitId);
  const required=[...expectedPhaseSet(circuit?.phase),'N','PE'];
  for(const kind of required){
   const link=links.find(x=>x.loadId===load.id&&x.kind===kind);
   if(!link){issues.push({code:'TERMINAL_MISSING',loadId:load.id,kind,message:'Не заявлен контакт '+kind});continue;}
   try{const expected=symbolicTerminalLink(project,load.id,kind);
    if(link.from!==expected.from||link.to!==expected.to)issues.push({code:'TERMINAL_STALE',loadId:load.id,kind,message:'Источники контакта не соответствуют маршруту'});
   }catch(err){issues.push({code:'TERMINAL_UNGROUNDED',loadId:load.id,kind,message:err.message});}
  }
  for(const link of links.filter(x=>x.loadId===load.id))if(!required.includes(link.kind))issues.push({code:'TERMINAL_EXTRA',loadId:load.id,kind:link.kind,message:'Лишний контакт после изменения фазы'});
 }
 return {status:issues.length?'INCOMPLETE':'SYMBOLIC_ONLY',engineeringApproved:false,links:links.length,issues,
 warning:'Контакты символические: не проверены номера клемм, паспорт аппарата, питающие связи, коммутация N, сечения, зажимы, защитное отключение и непрерывность PE.'};
}
function declareTerminalLinks(project,loadId){
 const load=project.loads.find(l=>l.id===loadId);if(!load)throw Error('Потребитель не найден');
 const phases=expectedPhaseSet(project.lines.find(c=>c.id===load.circuitId)?.phase);
 if(!phases.length)throw Error('Укажите фазу цепи');
 const route=project.conductorRoutes.find(r=>r.circuitId===load.circuitId);
 if(!route)throw Error('Укажите маршрут L/N перед объявлением контактов');
 const kinds=[...phases,'N',...(route.protectiveBus==='PE_MAIN'?['PE']:[])];
 const proposal=kinds.map(kind=>symbolicTerminalLink(project,loadId,kind));
 const next=project.terminalLinks.filter(l=>l.loadId!==loadId).concat(proposal);
 validateTerminalLinks({...project,terminalLinks:next});
 project.terminalLinks=next;
 return proposal;
}
function declareAllTerminalLinks(project){
 const next=structuredCloneCompat(project);
 for(const load of next.loads){
  if(!next.conductorRoutes.some(r=>r.circuitId===load.circuitId)||!expectedPhaseSet(next.lines.find(c=>c.id===load.circuitId)?.phase).length)continue;
  if(next.terminalLinks.some(l=>l.loadId===load.id))continue; // never overwrite hand-edited or stale links
  declareTerminalLinks(next,load.id);
 }
 validateTerminalLinks(next);project.terminalLinks=next.terminalLinks;
 return terminalAudit(project);
}
function structuredCloneCompat(value){return JSON.parse(JSON.stringify(value));}
function clearTerminalLinks(project,loadId){
 const count=project.terminalLinks.length;
 project.terminalLinks=project.terminalLinks.filter(l=>l.loadId!==loadId);
 return count!==project.terminalLinks.length;
}
function terminalCsv(project){
 const csv=v=>{const str=String(v??'');const safe=/^\s*[=+@-]/.test(str)?"'"+str:str;return '"'+safe.replace(/"/g,'""')+'"';};
 const rows=[['Потребитель','Цепь','Тип','Условный источник','Условный контакт','Статус']];
 const audit=terminalAudit(project);
 for(const l of project.terminalLinks)rows.push([l.loadId,l.circuitId,l.kind,l.from,l.to,audit.issues.filter(i=>i.loadId===l.loadId&&i.kind===l.kind).map(i=>i.code).join(',')||'ТОЛЬКО ДЕКЛАРАЦИЯ']);
 return '\uFEFF'+rows.map(r=>r.map(csv).join(';')).join('\r\n');
}
function terminalSvg(project){
 const audit=terminalAudit(project),rows=project.terminalLinks;
 const height=Math.max(180,126+rows.length*30),out=[`<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="${height}" viewBox="0 0 1180 ${height}">`,
 '<rect width="100%" height="100%" fill="#f8fafc"/>',`<text x="25" y="36" font-size="20" font-family="Arial" fill="#213d4e">${escapeXml(project.title)}</text>`,
 '<text x="25" y="61" font-size="13" fill="#b34c3b">СИМВОЛИЧЕСКИЕ КОНТАКТЫ · НЕ МОНТАЖНАЯ СХЕМА</text>'];
 rows.forEach((l,i)=>{const y=88+30*i;out.push(`<rect x="24" y="${y-18}" width="1130" height="26" rx="3" fill="white" stroke="#e1e7eb"/>`,
 `<text x="36" y="${y}" font-size="12" font-family="Arial" fill="#2c4550">${escapeXml(l.circuitId+' · '+l.kind)}</text>`,
 `<text x="210" y="${y}" font-size="12" font-family="Arial" fill="#315466">${escapeXml(l.from)}</text>`,
 `<text x="710" y="${y}" font-size="12" font-family="Arial" fill="#315466">→ ${escapeXml(l.to)}</text>`);});
 out.push(`<text x="25" y="${height-15}" font-size="11" fill="#a43b35">${escapeXml(audit.warning)}</text></svg>`);
 return out.join('');
}
// v0.10: Declared upstream feed relations, NOT manufacturer terminals or physical wiring.
// N goes from the declared group output to its own neutral bus; PE is never
// routed through a switching/protective device in this model.
function expectedFeedLink(project,circuitId,kind){
 const c=project.lines.find(x=>x.id===circuitId);
 if(!c)throw Error('Не найдена питаемая цепь');
 const branch=project.branchDevices.find(x=>x.circuitId===circuitId);
 if(!branch)throw Error('Не найден отходящий аппарат');
 const route=project.conductorRoutes.find(x=>x.circuitId===circuitId);
 if(!route)throw Error('Сначала назначьте маршрут L/N');
 const group=project.sharedDevices.find(x=>x.circuitIds.includes(circuitId));
 const expected=expectedNBus(project,circuitId);
 if(route.neutralBus!==expected)throw Error('Нейтраль этой цепи назначена чужой группе УЗО');
 if(JSON.stringify([...route.phaseConductors].sort())!==JSON.stringify([...expectedPhaseSet(c.phase)].sort()))throw Error('Маршрут фаз противоречит выбранной фазе цепи');
 if(![...expectedPhaseSet(c.phase),'N'].includes(kind))throw Error('Указан лишний питающий проводник');
 const from=group?`GROUP:${group.id}/OUT-${kind}`:`SOURCE:MAIN/${kind}`;
 const to=kind==='N'?`BUS:${route.neutralBus}/N`:`BRANCH:${branch.id}/IN-${kind}`;
 return {id:`F:${circuitId}:${kind}`,circuitId,kind,from,to,origin:'explicit-feed-declaration'};
}
function validateFeedLinks(project){
 if(!Array.isArray(project.feedLinks)||project.feedLinks.length>2000)throw Error('Неверный список питающих связей');
 const ids=new Set(),refs=new Set();
 for(const f of project.feedLinks){
  if(!f||typeof f!=='object'||typeof f.circuitId!=='string'||!project.lines.some(x=>x.id===f.circuitId))throw Error('Питающая связь ведёт к несуществующей цепи');
  if(!['L1','L2','L3','N'].includes(f.kind)||f.id!==`F:${f.circuitId}:${f.kind}`||ids.has(f.id))throw Error('Повтор или неверный идентификатор питающей связи');
  ids.add(f.id);
  if(f.origin!=='explicit-feed-declaration'||typeof f.from!=='string'||typeof f.to!=='string'||f.from.length>110||f.to.length>110)throw Error('Недопустимые данные питающей связи');
  const fromOk=/^(?:SOURCE:MAIN|GROUP:[A-Za-z0-9_-]{1,40})\/(?:L[123]|N|OUT-L[123]|OUT-N)$/.test(f.from);
  const toOk=/^(?:BRANCH:[A-Za-z0-9_-]{1,80}\/IN-L[123]|BUS:N_(?:MAIN|RCD[0-9]+)\/N)$/.test(f.to);
  if(!fromOk||!toOk)throw Error('Недопустимые условные контакты питающей связи');
  const ref=f.circuitId+'/'+f.kind;
  if(refs.has(ref))throw Error('Дублирующая питающая связь');refs.add(ref);
 }
 return true;
}

/* Explicit, symbolic supply to the INPUT side of a shared RCD.
   No physical terminal numbers, upstream protective device, cable section or N switching verification. */
function expectedGroupInput(project,groupId,kind){
 const group=project.sharedDevices.find(g=>g.id===groupId);
 if(!group)throw Error('Групповое УЗО не найдено');
 const circuits=project.lines.filter(c=>group.circuitIds.includes(c.id));
 if(circuits.length!==group.circuitIds.length)throw Error('УЗО содержит неизвестные цепи');
 const phases=[...new Set(circuits.flatMap(c=>expectedPhaseSet(c.phase)))].sort();
 if(!phases.length|| (group.templateId==='RCD_2P'&&phases.length!==1))throw Error('Фазы группы не определены');
 const kinds=[...phases,'N'];
 if(!kinds.includes(kind))throw Error('Недопустимый входной проводник УЗО');
 return {id:'GI:'+groupId+':'+kind,groupId,kind,from:'SOURCE:MAIN/'+kind,to:'GROUP:'+groupId+'/IN-'+kind,origin:'explicit-group-input'};
}
function validateGroupInputLinks(project){
 const links=project.groupInputLinks;
 if(!Array.isArray(links)||links.length>500)throw Error('Недопустимый список вводов общих УЗО');
 const seen=new Set();
 for(const link of links){
  if(!link||typeof link.groupId!=='string'||!project.sharedDevices.some(x=>x.id===link.groupId))throw Error('Ввод ссылается на несуществующее УЗО');
  if(!['L1','L2','L3','N'].includes(link.kind)||link.id!=='GI:'+link.groupId+':'+link.kind||seen.has(link.id))throw Error('Повтор или неверный ID ввода УЗО');
  if(link.origin!=='explicit-group-input'||link.from!=='SOURCE:MAIN/'+link.kind||link.to!=='GROUP:'+link.groupId+'/IN-'+link.kind)throw Error('Некорректная условная связь ввода УЗО');
  seen.add(link.id);
 }
 return true;
}
function groupInputAudit(project){
 const issues=[],links=project.groupInputLinks||[];
 for(const group of project.sharedDevices||[]){
  const phases=[...new Set(project.lines.filter(c=>group.circuitIds.includes(c.id)).flatMap(c=>expectedPhaseSet(c.phase)))];
  const kinds=[...phases,'N'];
  for(const kind of kinds){
   const link=links.find(x=>x.groupId===group.id&&x.kind===kind);
   if(!link){issues.push({code:'GROUP_INPUT_MISSING',groupId:group.id,kind,message:'Не заявлен ввод '+kind});continue;}
   try{const expected=expectedGroupInput(project,group.id,kind);
    if(link.from!==expected.from||link.to!==expected.to)issues.push({code:'GROUP_INPUT_STALE',groupId:group.id,kind,message:'Устаревшая декларация ввода'});
   }catch(e){issues.push({code:'GROUP_INPUT_CONFLICT',groupId:group.id,kind,message:e.message});}
  }
  for(const link of links.filter(x=>x.groupId===group.id))if(!kinds.includes(link.kind))issues.push({code:'GROUP_INPUT_EXTRA',groupId:group.id,kind:link.kind,message:'Лишняя фаза после изменения группы'});
 }
 return {issues,links:links.length,engineeringApproved:false};
}
function declareGroupInputs(project,groupId){
 const group=project.sharedDevices.find(g=>g.id===groupId);
 if(!group)throw Error('Общее УЗО отсутствует');
 const kinds=[...new Set(project.lines.filter(c=>group.circuitIds.includes(c.id)).flatMap(c=>expectedPhaseSet(c.phase)))].sort();
 if(!kinds.length)throw Error('Сначала назначьте фазы цепей');
 const replacements=[...kinds,'N'].map(kind=>expectedGroupInput(project,groupId,kind));
 const next=project.groupInputLinks.filter(x=>x.groupId!==groupId).concat(replacements);
 validateGroupInputLinks({...project,groupInputLinks:next});
 project.groupInputLinks=next;
 return replacements;
}
function declareMissingGroupInputs(project){
 const next=structuredCloneCompat(project);
 for(const group of next.sharedDevices){
  if(next.groupInputLinks.some(link=>link.groupId===group.id))continue;
  try{declareGroupInputs(next,group.id);}catch(e){/* keep incomplete groups visible */}
 }
 validateGroupInputLinks(next);project.groupInputLinks=next.groupInputLinks;
 return groupInputAudit(project);
}
function clearGroupInputs(project,groupId){
 project.groupInputLinks=project.groupInputLinks.filter(x=>x.groupId!==groupId);
}

function feedAudit(project){
 const issues=[],feed=project.feedLinks||[];
 for(const c of project.lines){
  const kinds=[...expectedPhaseSet(c.phase),'N'];
  for(const kind of kinds){
   const f=feed.find(x=>x.circuitId===c.id&&x.kind===kind);
   if(!f){issues.push({code:'FEED_MISSING',circuitId:c.id,kind,message:'Нет декларации питания '+kind});continue;}
   try {const expected=expectedFeedLink(project,c.id,kind);
    if(expected.from!==f.from||expected.to!==f.to)issues.push({code:'FEED_STALE',circuitId:c.id,kind,message:'Источник или назначение не соответствует текущей группе/аппарату'});
   }catch(err){issues.push({code:'FEED_CONFLICT',circuitId:c.id,kind,message:err.message});}
  }
  for(const f of feed.filter(x=>x.circuitId===c.id))if(!kinds.includes(f.kind))issues.push({code:'FEED_EXTRA',circuitId:c.id,kind:f.kind,message:'Лишний проводник после изменения фаз'});
 }
 for(const issue of groupInputAudit(project).issues)issues.push({code:issue.code,groupId:issue.groupId,kind:issue.kind,message:issue.message});
 return {status:issues.length?'INCOMPLETE':'DECLARED_ONLY',engineeringApproved:false,links:feed.length+(project.groupInputLinks?.length||0),issues,
  warning:'Декларации вводов УЗО и отходящих линий не подтверждают реальные номера клемм, защиту, коммутацию N или допустимость монтажа.'};
}
function declareFeedLinks(project,circuitId){
 const c=project.lines.find(x=>x.id===circuitId);
 if(!c)throw Error('Цепь не найдена');
 const kinds=[...expectedPhaseSet(c.phase),'N'];
 if(kinds.length===1)throw Error('Сначала укажите фазу');
 const replacements=kinds.map(kind=>expectedFeedLink(project,circuitId,kind));
 const proposed=project.feedLinks.filter(x=>x.circuitId!==circuitId).concat(replacements);
 validateFeedLinks({...project,feedLinks:proposed});
 project.feedLinks=proposed;
 return replacements;
}
function declareMissingFeedLinks(project){
 const draft=structuredCloneCompat(project);
 for(const c of draft.lines){
  if(draft.feedLinks.some(x=>x.circuitId===c.id))continue; // never overwrite stale/edited records
  if(!draft.conductorRoutes.some(x=>x.circuitId===c.id)||!expectedPhaseSet(c.phase).length)continue;
  try{declareFeedLinks(draft,c.id);}catch(e){ /* leave conflicted routes visible to audit, no implicit fix */ }
 }
 validateFeedLinks(draft);project.feedLinks=draft.feedLinks;
 return feedAudit(project);
}
function clearFeedLinks(project,circuitId){
 const before=project.feedLinks.length;
 project.feedLinks=project.feedLinks.filter(x=>x.circuitId!==circuitId);
 return project.feedLinks.length!==before;
}
function feedCsv(project){
 const audit=feedAudit(project);
 const safe=v=>{const raw=String(v??'');const guarded=/^\s*[=+@\-\t\r]/.test(raw)?"'"+raw:raw;return '"'+guarded.replaceAll('"','""')+'"';};
 const groupRows=project.sharedDevices.flatMap(g=>{const kinds=new Set([...project.lines.filter(c=>g.circuitIds.includes(c.id)).flatMap(c=>expectedPhaseSet(c.phase)),'N',...project.groupInputLinks.filter(f=>f.groupId===g.id).map(f=>f.kind)]);return [...kinds].map(kind=>{const f=project.groupInputLinks.find(x=>x.groupId===g.id&&x.kind===kind);return [g.id+' (ввод УЗО)',kind,f?.from||'',f?.to||'',audit.issues.filter(i=>i.groupId===g.id&&i.kind===kind).map(i=>i.code).join(' | ')||'Только декларация'];});});
 const rows=[['Цепь/УЗО','Проводник','Условный источник','Условный получатель','Замечания'],...groupRows,...project.lines.flatMap(c=>{
  const kinds=new Set([...expectedPhaseSet(c.phase),'N',...project.feedLinks.filter(f=>f.circuitId===c.id).map(f=>f.kind)]);
  return [...kinds].map(kind=>{const f=project.feedLinks.find(x=>x.circuitId===c.id&&x.kind===kind);
   return [c.id,kind,f?.from||'',f?.to||'',audit.issues.filter(i=>i.circuitId===c.id&&i.kind===kind).map(i=>i.code).join(' | ')||'Только декларация'];});
 })];
 return '\uFEFF'+rows.map(row=>row.map(safe).join(';')).join('\r\n');
}
function feedSvg(project){
 const esc=escapeXml,audit=feedAudit(project),groupRows=project.sharedDevices.flatMap(g=>{const kinds=[...new Set(project.lines.filter(c=>g.circuitIds.includes(c.id)).flatMap(c=>expectedPhaseSet(c.phase)))].sort();return [...kinds,'N'].map(kind=>({c:{id:g.id+' / ВВОД УЗО'},groupId:g.id,kind,link:project.groupInputLinks.find(f=>f.groupId===g.id&&f.kind===kind)}));}),rows=groupRows.concat(project.lines.flatMap(c=>{
  const kinds=[...expectedPhaseSet(c.phase),'N'];
  return kinds.map(kind=>({c,kind,link:project.feedLinks.find(f=>f.circuitId===c.id&&f.kind===kind)}));
 }));
 const height=Math.max(190,145+rows.length*34);
 const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="0 0 1160 ${height}">`,
 '<rect width="100%" height="100%" fill="#f8fafc"/>',
 `<text x="32" y="40" fill="#132d3d" font-size="22" font-family="Arial" font-weight="bold">${esc(project.title)}</text>`,
 '<text x="32" y="67" fill="#ad4d28" font-size="14" font-family="Arial">УСЛОВНЫЕ ПИТАЮЩИЕ СВЯЗИ — НЕ МОНТАЖНАЯ СХЕМА</text>',
 '<text x="32" y="90" fill="#536b78" font-size="12" font-family="Arial">Без паспортных клемм, проверки коммутации N, аппаратов защиты и непрерывности PE</text>'];
 let y=116;
 for(const r of rows){const issue=audit.issues.find(i=>(r.groupId?i.groupId===r.groupId:i.circuitId===r.c.id)&&i.kind===r.kind);
  out.push(`<rect x="24" y="${y-17}" width="1110" height="30" rx="5" fill="${issue?'#fff0e7':'#e9f4ef'}"/>`);
  out.push(`<text x="38" y="${y+3}" fill="#253c4a" font-size="12" font-family="Arial">${esc(r.c.id+' · '+r.kind)}</text>`);
  out.push(`<text x="178" y="${y+3}" fill="#253c4a" font-size="12" font-family="Arial">${esc(r.link?.from||'НЕ ЗАДАНО')}</text>`);
  out.push(`<text x="575" y="${y+3}" fill="#536b78" font-size="12" font-family="Arial">→</text>`);
  out.push(`<text x="612" y="${y+3}" fill="#253c4a" font-size="12" font-family="Arial">${esc(r.link?.to||'НЕ ЗАДАНО')}</text>`);
  out.push(`<text x="938" y="${y+3}" fill="#874227" font-size="11" font-family="Arial">${esc(issue?.code||'ЗАЯВЛЕНО')}</text>`);
  y+=34;
 }
 out.push('</svg>');return out.join('');
}
function ensureV2(project){if(project.schema!==PROJECT_SCHEMA||!Array.isArray(project.loads)||!Array.isArray(project.sharedDevices))migrateLegacyEntities(project);validateEntities(project);reconcileCircuitPowers(project);if(project.branchModelVersion!==1||!Array.isArray(project.branchDevices))syncBranchDevices(project);validateBranchDevices(project);if(!Array.isArray(project.conductorRoutes)){project.conductorRoutes=[];project.wiringVersion=1;}validateConductorRoutes(project);if(!Array.isArray(project.terminalLinks)){project.terminalLinks=[];project.terminalVersion=1;}validateTerminalLinks(project);if(!Array.isArray(project.feedLinks)){project.feedLinks=[];project.feedVersion=1;}validateFeedLinks(project);if(!Array.isArray(project.groupInputLinks)){project.groupInputLinks=[];project.groupInputVersion=1;}validateGroupInputLinks(project);return project;}
function equipmentEntries(project){const bs=project.branchDevices;return [...(project.sharedDevices||[]).map(d=>({id:d.id,device:d.label,name:'Групповое УЗО',modules:d.modules,shared:true})),...project.lines.map(l=>{const b=bs?.find(x=>x.circuitId===l.id);return {...l,device:b?.label??l.device,modules:b?.modules??l.modules,apparatusId:b?.id||branchId(l.id),shared:false};})];}
function applyDeviceTemplate(lineId,templateId){
 const template=DEVICE_TEMPLATES[templateId], l=state.lines.find(x=>x.id===lineId);
 if(!template||!l)return false;
 checkpoint();updateBranchApparatus(state,lineId,{label:template.device,modules:template.modules,templateId});delete l.catalogSku;
 changed();return true;
}
function projectAudit(project=state){
 const checks=[],add=(id,status,detail)=>checks.push({id,status,detail});
 add('project-name',project.title.trim()?'OK':'MISSING',project.title.trim()?'Название задано':'Введите название проекта');
 add('earthing',project.earthing==='UNKNOWN'?'MISSING':'DECLARED',project.earthing==='UNKNOWN'?'Не указана система заземления':'Система заземления заявлена, но не подтверждена документами');
 add('lines',project.lines.length?'OK':'MISSING',project.lines.length?`Строк ведомости: ${project.lines.length}`:'Добавьте хотя бы одну линию');
 const ids=new Set();
 for(const l of project.lines){
  if(ids.has(l.id))add('duplicate-'+l.id,'ERROR',`Повтор ID ${l.id}`);ids.add(l.id);
  if(!l.name.trim())add('name-'+l.id,'MISSING',`${l.id}: отсутствует назначение`);
  if(!(Number(l.power)>0))add('power-'+l.id,'MISSING',`${l.id}: отсутствует положительная мощность`);
  if(!['L1','L2','L3','3Ф'].includes(l.phase))add('phase-'+l.id,'MISSING',`${l.id}: неизвестная фаза`);
  if(!l.device.trim())add('apparatus-'+l.id,'MISSING',`${l.id}: не указан аппарат`);
  if(!SOURCES[l.source])add('source-'+l.id,'MISSING',`${l.id}: происхождение данных не указано`);
 }
 const catalogue=catalogAudit(project);if(catalogue.issues.length)add('catalogue','ERROR',catalogue.issues.map(x=>x.circuitId+': '+x.code).join('; '));else add('catalogue','NOT_VERIFIED','Артикулы выбранных изделий сопоставлены, применимость в электрической сети не подтверждена');
 if(project.endpointBindingsV1?.length){
  const bridge=epEndpointBridgeAuditV1(project);
  add('endpoint-bridge-v1',bridge.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   'Сверка условных контактов и реально заявленных проводов: '+bridge.matchedEndpoints+
   '/'+bridge.expectedEndpoints+' контактов, '+
   bridge.issues.filter(x=>x.level==='BLOCKED').length+' противоречий. Проверка физического монтажа отсутствует.');
 }
 if(project.deviceModelV19||project.boardBindingsV1?.length){
  const bound=epBoardBindingsAuditV1(project,catalogDevice);
  add('board-binding-v1',bound.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   'Сопоставление графического щита и клемм: '+bound.matched+'/'+bound.boardTotal+
   ' аппаратов связаны, '+bound.issues.filter(x=>x.level==='BLOCKED').length+
   ' противоречий. Реальные номера контактов и подлинность паспортов НЕ установлены.');
 }
 if(project.deviceModelV19){
  const result=epDeviceAuditCoreV19(project.deviceModelV19);
  add('device-v19',result.counts.FAIL?'ERROR':'NOT_VERIFIED',
   'Аппараты, PE, зоны N v1.9: '+result.counts.FAIL+' ошибок, '+result.counts.UNKNOWN+
   ' неподтверждённых условий. Устройство и паспортные данные не верифицированы.');
 }
 if(project.wiringModelV18&&project.deviceModelV19){
  const consistency=epWiringDeviceModelConsistencyV19(project.wiringModelV18,project.deviceModelV19);
  add('wiring-device-consistency',
   consistency.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   'Совпадение объявленных клемм/проводов двух моделей: '+consistency.status+
   '. '+consistency.issues.join(', ')+'. Подтверждение реальной сборки: НЕТ.');
 }
 if(project.wiringModelV18){
  const wiring=epWiringAuditCoreV18(project.wiringModelV18);
  add('wiring-v18',wiring.counts.FAIL?'ERROR':'NOT_VERIFIED',
   'Клеммная топология v1.8: '+wiring.counts.FAIL+' ошибок, '+
   wiring.counts.UNKNOWN+' непроверенных условий. Схема не сопоставлена с физическим щитом и паспортами изготовителя.');
 }
 const preflight=epEngineeringPreflight(project,catalogDevice,checkOverload);
 if(project.ttContext){
  const tt=epTTScreenV45(project.ttContext);
  const mismatch=project.earthing!=='TT'||project.ttContext.earthing_system!=='TT';
  add('tt-rcd-screen',mismatch||tt.status==='FAIL'?'ERROR':'NOT_VERIFIED',
   'Система проекта '+project.earthing+', проверка TT: '+tt.status+'. '+tt.issues.join(', ')+'. Независимая инженерная проверка обязательна.');
 }
 for(const l of project.lines){
  const route=l.route44Input?ep44BindLine(project,l):null;
  if(route)add('route44-line-'+l.id,route.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   l.id+': петля '+(route.result.calculated_zs_ohm||'НЕИЗВЕСТНО')+
   ' Ом, Ik min '+(route.result.calculated_min_fault_current_a||'НЕИЗВЕСТНО')+
   ' А; отключение '+(route.result.tn_disconnection?.status||'UNKNOWN')+
   ', падение напряжения '+(route.result.voltage_drop?.status||'UNKNOWN')+
   '. Инженерное подтверждение отсутствует.');
 }
 for(const l of project.lines){
  const review=l.lv43Input?epLV43BoundLine(project,l):null;
  if(!review)continue;
  add('lv43-line-'+l.id,review.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   l.id+': TN '+review.tn.status+', падение напряжения '+review.voltage_drop.status+
   ', исходный Ib '+(review.declared_ib_a??'НЕ УКАЗАН')+
   '. Проверка проектных и нормативных исходных данных: НЕТ.');
 }
 for(const row of preflight.lines)
  add('engineering-line-'+row.circuitId,row.status==='BLOCKED'?'ERROR':'NOT_VERIFIED',
   row.circuitId+': '+row.rules.map(x=>x.code+'='+x.status).join(', '));
 const layout=layoutSlots(project);
 if(layout.unplaced.length)add('layout','ERROR',`Не размещены: ${layout.unplaced.map(x=>x.id).join(', ')}`);
 else add('layout','OK',`Размещено ${project.lines.length} условных аппаратов`);
 add('model-boundary','DECLARED',`Раздельные сущности: ${project.loads?.length||0} потребителей, ${project.lines.length} цепей, ${project.branchDevices?.length||0} отходящих аппаратов и ${project.sharedDevices?.length||0} общих УЗО. Паспортные клеммы и подтверждение характеристик ещё не реализованы.`);
 if(project.sharedDevices?.length)add('shared-protection','NOT_VERIFIED','Связи групповых УЗО заявлены; электрическая схема и корректность нейтралей не подтверждены');
 const terminal=terminalAudit(project);add('terminal-links','NOT_VERIFIED',terminal.issues.length?'Контактные декларации: '+terminal.issues.length+' замечаний':'Символические контакты заполнены, монтаж не подтверждён');
 const feed=feedAudit(project);add('upstream-feed','NOT_VERIFIED',feed.issues.length?'Питающие декларации: '+feed.issues.map(i=>i.circuitId+' '+i.code).join('; '):'Питающие декларации заполнены; физическая топология не проверена');
 const wire=conductorAudit(project);if(wire.issues.length)add('conductors','NOT_VERIFIED','Черновые маршруты L/N/PE: '+wire.issues.map(i=>i.circuitId+' '+i.code).join('; '));else add('conductors','NOT_VERIFIED','Маршруты L/N/PE заявлены, но физические соединения не подтверждены');
 add('engineering','NOT_VERIFIED','Кабели, КЗ, время отключения, тип и характеристики аппаратов, защита PE/N, нагрев корпуса нормативно не проверены.');
 return {version:'0.12',model:'EXPLICIT_LOADS_AND_SHARED_PROTECTION_DRAFT',status:checks.some(x=>['ERROR','MISSING'].includes(x.status))?'INCOMPLETE':'DRAFT_ONLY',engineeringApproved:false,checks,summary:{totalLines:project.lines.length,unplaced:layout.unplaced.length,freeModules:project.railCapacity*project.railCount-layout.used}};
}
// Restricted numerical check only. Does not infer currents from installed power or breaker B/C labels.
// Fixed-point milliampere arithmetic prevents float disagreement at 1.45 Iz boundary.
function currentMilli(value){
 const raw=String(value??'').trim();
 if(!/^(?:\d{1,7})(?:[.,]\d{1,3})?$/.test(raw))return null;
 const [whole,fraction='']=raw.replace(',','.').split('.');
 const result=BigInt(whole)*1000n+BigInt((fraction+'000').slice(0,3));
 return result>0n && result<=1000000000n?result:null;
}
function checkOverload(inputs){
 if(!inputs||typeof inputs!=='object')return{numericStatus:'UNKNOWN',evidenceStatus:'UNVERIFIED',readyForInstallation:false,reason:'Не введены токи для цепи'};
 const values=['ibA','inA','izA','i2A'].map(x=>currentMilli(inputs[x]));
 if(values.some(x=>x===null))return{numericStatus:'UNKNOWN',evidenceStatus:'UNVERIFIED',readyForInstallation:false,reason:'Нужны четыре положительных тока в амперах, до 3 знаков после запятой'};
 const [ib,inn,iz,i2]=values;
 const order=ib<=inn&&inn<=iz,trip=i2*100n<=iz*145n;
 return{numericStatus:order&&trip?'PASS':'FAIL',evidenceStatus:'UNVERIFIED',readyForInstallation:false,checks:{ib_le_in:ib<=inn,in_le_iz:inn<=iz,i2_le_145pct_iz:trip},reason:'Проверена только арифметика введённых значений. Источники Ib, In, Iz, I2, условия прокладки и тип защиты не подтверждены.'};
}
function documentReadiness(project=state){
 const blockers=[];
 if(!project.title.trim())blockers.push('Не задано название проекта');
 if(project.earthing==='UNKNOWN')blockers.push('Система заземления не выбрана');
 if(!project.lines.length)blockers.push('Нет отходящих линий');
 for(const l of project.lines){
  if(!l.name.trim())blockers.push(`${l.id}: нет назначения`);
  if(!(l.power>0))blockers.push(`${l.id}: нет корректной мощности`);
  if(!l.phase)blockers.push(`${l.id}: не задана фаза`);
  if(!l.device)blockers.push(`${l.id}: не задан тип аппарата`);
  if(l.templateId&&DEVICE_TEMPLATES[l.templateId]&&l.modules!==DEVICE_TEMPLATES[l.templateId].modules)blockers.push(`${l.id}: условная ширина не совпадает с выбранным шаблоном`);
 }
 for(const issue of catalogAudit(project).issues)blockers.push(issue.circuitId+': '+issue.message);
 if(project.endpointBindingsV1?.length){
  const bridge=epEndpointBridgeAuditV1(project);
  if(bridge.status==='BLOCKED')blockers.push('Символьные контакты и провода: отсутствующая связь или противоречие');
  if(bridge.issues.some(x=>x.code==='ENDPOINT_UNBOUND'))
   blockers.push('Не все условные контакты сопоставлены с реальными клеммами модели');
 }
 if(project.deviceModelV19||project.boardBindingsV1?.length){
  const bound=epBoardBindingsAuditV1(project,catalogDevice);
  if(bound.status==='BLOCKED')blockers.push('Аппараты щита/клеммы: недействительная или устаревшая привязка');
  if(bound.issues.some(x=>['BOARD_DEVICE_UNBOUND','MODEL_DEVICE_UNBOUND'].includes(x.code)))
   blockers.push('Не все аппараты и электрические модели сопоставлены между собой');
 }
 if(project.deviceModelV19){
  const result=epDeviceAuditCoreV19(project.deviceModelV19);
  if(result.counts.FAIL)blockers.push('Аппараты/PE/N: '+result.counts.FAIL+' ошибок');
 }
 if(project.wiringModelV18&&project.deviceModelV19){
  const c=epWiringDeviceModelConsistencyV19(project.wiringModelV18,project.deviceModelV19);
  if(c.status==='BLOCKED')blockers.push('Две терминальные модели описывают разные клеммы/соединения');
 }
 if(project.wiringModelV18){
  const wiring=epWiringAuditCoreV18(project.wiringModelV18);
  if(wiring.counts.FAIL)blockers.push('Клеммная схема v1.8: '+wiring.counts.FAIL+' несоответствий');
 }
 const preflight=epEngineeringPreflight(project,catalogDevice,checkOverload);
 if(project.ttContext){
  const tt=epTTScreenV45(project.ttContext);
  if(project.earthing!=='TT'||project.ttContext.earthing_system!=='TT'||tt.status==='FAIL')
   blockers.push('TT/УЗО: несовместимая система заземления или заявленные параметры не проходят ограниченную проверку');
 }
 for(const row of preflight.lines.filter(x=>x.status==='BLOCKED'))
  blockers.push(row.circuitId+': '+row.rules.filter(x=>x.status==='BLOCKED').map(x=>x.detail).join('; '));
 for(const l of project.lines){
  const route=l.route44Input?ep44BindLine(project,l):null;
  if(route?.status==='BLOCKED')blockers.push(l.id+': TN v4.4 — несовместимая схема, устаревшие данные или расчётное несоответствие');
 }
 for(const l of project.lines){
  const r=l.lv43Input?epLV43BoundLine(project,l):null;
  if(r?.status==='BLOCKED')blockers.push(l.id+': конфликт системы TN, фазности, устаревшая проверка или числовой отказ');
 }
 const layout=layoutSlots(project);
 if(layout.unplaced.length)blockers.push(`Не размещены аппараты: ${layout.unplaced.map(x=>x.id).join(', ')}`);
 return {status:blockers.length?'INCOMPLETE':'DRAFT_ONLY',blockers,placed:equipmentEntries(project).length-layout.unplaced.length,unplaced:layout.unplaced.length,freeModules:project.railCount*project.railCapacity-layout.used,engineeringApproved:false};
}
function numeric(v){if(v===''||v===null||v===undefined)return null;const raw=String(v).trim();if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(raw))return null;const n=Number(raw.replace(',','.'));return Number.isFinite(n)?n:null;}
function countModules(){return equipmentEntries(ensureV2(state)).reduce((n,l)=>n+(Number(l.modules)||0),0)}
// Pack each apparatus on one DIN rail; do not split a multi-module device across rails.
function layoutSlots(project=state){
  const rails=Array.from({length:project.railCount},()=>Array(project.railCapacity).fill(null));
  const unplaced=[];let rail=0,position=0;
  for(const line of (project.sharedDevices?.length?equipmentEntries(project):project.lines)){
    const width=Number(line.modules);
    if(!Number.isInteger(width)||width<1||width>project.railCapacity){unplaced.push({id:line.id,reason:'Ширина аппарата больше вместимости рейки'});continue;}
    if(position+width>project.railCapacity){rail++;position=0;}
    if(rail>=project.railCount){unplaced.push({id:line.id,reason:'Не хватает места на рейках'});continue;}
    for(let i=0;i<width;i++)rails[rail][position+i]={line,first:i===0};
    position+=width;
  }
  return {rails,unplaced,used:rails.reduce((a,row)=>a+row.filter(Boolean).length,0)};
}
function phaseSummary(){
 const result={L1:0,L2:0,L3:0,unassigned:0,threePhaseTotal:0};
 for(const l of state.lines){const p=Number(l.power);if(!Number.isFinite(p)||p<=0)continue;
  if(l.phase==='3Ф'){const one=p/3;result.L1+=one;result.L2+=one;result.L3+=one;result.threePhaseTotal+=p;}
  else if(Object.hasOwn(result,l.phase))result[l.phase]+=p;
  else result.unassigned+=p;
 }return result;
}
function getPhasePercentages(){const r=phaseSummary(),max=Math.max(r.L1,r.L2,r.L3,0.001);return [['L1',r.L1/max*100,r.L1],['L2',r.L2/max*100,r.L2],['L3',r.L3/max*100,r.L3]];}

function issues(){const r=[];if(!state.title.trim())r.push('Не указано название проекта.');if(state.earthing==='UNKNOWN')r.push('Не выбрана система заземления.');if(state.lines.length===0)r.push('Нет отходящих линий.');for(const l of state.lines){if(!l.name.trim())r.push(`У линии ${l.id} не указано назначение.`);if(!(Number(l.power)>0))r.push(`Для «${l.name||l.id}» не задана положительная мощность.`);if(!l.device)r.push(`Для «${l.name||l.id}» не обозначен защитный аппарат.`);if(!l.phase)r.push(`Для «${l.name||l.id}» не указана фаза.`);}const placement=layoutSlots();if(placement.unplaced.length)r.push('Не размещены аппараты: '+placement.unplaced.map(x=>x.id).join(', ')+'.');r.push('Нет проверенных исходных данных для выбора кабелей, проверки КЗ, автоматического отключения и селективности.');r.push('Данные паспортов аппаратов и корпуса не сверены с изготовителями.');if(state.sharedDevices?.length)r.push('Групповые УЗО: требуется проверка схемы нейтралей, паспортов аппаратов и условий защиты.');for(const x of documentReadiness().blockers){if(!r.includes(x))r.push(x);}return r}
function render(){ ensureV2(state);$('breadcrumbTitle').textContent=state.title||'Новый проект'; $('stats').innerHTML=`<div class="stat"><strong>${state.lines.length}</strong><span>Отходящих линий</span></div><div class="stat"><strong>${state.lines.reduce((s,l)=>s+(Number(l.power)||0),0).toLocaleString('ru-RU',{maximumFractionDigits:2})} <small style="font-size:13px">кВт</small></strong><span>Установленная мощность</span></div><div class="stat"><strong>${countModules()} / ${state.railCapacity*state.railCount}</strong><span>Заявлено модулей / доступно</span></div>`; $('rowsCount').textContent=state.lines.length+' линий';renderRows();$('projectName').value=state.title;$('earthing').value=state.earthing;$('railCapacity').value=state.railCapacity;$('railCount').value=state.railCount;renderBoard();renderIssues();renderPhases();renderPlan();renderReadiness();renderAudit();renderCurrentCheck();renderTTContext();renderWiring18();renderDevice19();renderBoardBindingsV1();renderEndpointBridgeV1();renderEngineeringDiagnosticsV1();renderConsumers();renderSharedDevices();renderCircuitGraph();renderConductorEditor();renderTerminalEditor();renderFeedEditor();}

function renderEngineeringDiagnosticsV1(){
 const holder=$('engineeringDiagnostics');
 if(!holder)return;
 if(typeof epEngineeringDiagnosticsPanelV1!=='function'){
  holder.textContent='Модуль диагностики не загружен. Монтаж не подтверждён.';
  return;
 }
 holder.innerHTML=epEngineeringDiagnosticsPanelV1(state,catalogDevice);
 const preview=$('draftBoardPreview');
 if(preview)preview.innerHTML=typeof epDraftBoardPreviewV1==='function' ?
  epDraftBoardPreviewV1(state,catalogDevice,selectedLine):'Предварительная компоновка недоступна.';
 const alternatives=$('draftLayoutAlternatives');
 if(alternatives)alternatives.innerHTML=typeof epDraftLayoutAlternativesV1==='function'&&
  typeof epDraftLayoutAlternativesHtmlV1==='function'?
  epDraftLayoutAlternativesHtmlV1(epDraftLayoutAlternativesV1(state,catalogDevice)):
  'Альтернативное размещение недоступно.';
 const dossier=$('circuitDossier');
 if(dossier)renderCircuitWorkspaceV1();
 const bom=$('draftBomPanel');
 if(bom)bom.innerHTML=typeof epDraftBomV1==='function'&&typeof epDraftBomHtmlV1==='function'?
  epDraftBomHtmlV1(epDraftBomV1(state,catalogDevice)):'Модуль спецификации недоступен.';
 const singleHolder=$('singleLineDraftPanel');
 if(singleHolder)singleHolder.innerHTML=typeof epSingleLineDraftV1==='function'&&
  typeof epSingleLineSvgV1==='function'?
  epSingleLineSvgV1(epSingleLineDraftV1(state,catalogDevice),selectedLine):
  'Однолинейная схема недоступна.';
 const wireHolder=$('circuitWiringTracePanel');
 if(wireHolder)wireHolder.innerHTML=typeof epCircuitWiringTraceV1==='function'&&
  typeof epCircuitWiringTraceHtmlV1==='function'?
  epCircuitWiringTraceHtmlV1(epCircuitWiringTraceV1(state),selectedLine):
  'Прослеживаемость проводников недоступна.';
 const neutralHolder=$('neutralSegregationPanel');
 if(neutralHolder)neutralHolder.innerHTML=typeof epNeutralSegregationV1==='function'&&
  typeof epNeutralSegregationHtmlV1==='function'?
  epNeutralSegregationHtmlV1(epNeutralSegregationV1(state),selectedLine):
  'Проверка разделения нейтралей недоступна.';
 const crossView=$('crossViewAuditPanel'),issueHolder=$('engineeringIssueRegister');
 if(typeof epEngineeringBundleV1==='function'&&(crossView||issueHolder)){
  const bundle=epEngineeringBundleV1(state,catalogDevice);
  if(crossView)crossView.innerHTML=typeof epCrossViewAuditHtmlV1==='function'?
   epCrossViewAuditHtmlV1(bundle.sections.crossView,selectedLine):'Сквозная проверка недоступна.';
  if(issueHolder)issueHolder.innerHTML=typeof epEngineeringIssueRegisterHtmlV1==='function'?
   epEngineeringIssueRegisterHtmlV1(bundle.sections.issueRegister,selectedLine):'Реестр замечаний недоступен.';
 }
 const protection=$('protectionWorkbench');
 if(protection&&typeof epProtectionWorkbenchV1==='function'&&typeof epProtectionWorkbenchHtmlV1==='function'){
  const catalog=typeof EP_CATALOG==='object'&&EP_CATALOG?
   Object.entries(EP_CATALOG).map(([id,device])=>({id,device})):[];
  protection.innerHTML=epProtectionWorkbenchHtmlV1(epProtectionWorkbenchV1(state,catalogDevice,catalog,selectedLine));
 }
}
function renderCircuitWorkspaceV1(){
 const holder=$('circuitDossier');if(!holder)return;
 if(typeof epCircuitWorkspaceV1!=='function'||typeof epCircuitWorkspaceHtmlV1!=='function'){
  holder.textContent='Модуль поиска цепей не загружен.';return;
 }
 const result=epCircuitWorkspaceV1(state,catalogDevice,
  $('circuitWorkspaceQuery')?.value||'',$('circuitWorkspaceMode')?.value||'all');
 holder.innerHTML=epCircuitWorkspaceHtmlV1(result,selectedLine);
 const label=$('circuitFocusLabel');
 if(label){const line=state.lines.find(x=>x.id===selectedLine);label.textContent=line?'Выбрана цепь '+line.id+' · '+line.name:'Цепь не выбрана';}
}
function exportEngineeringGateV1(){
 const report=typeof epEngineeringGateV1==='function'
  ?epEngineeringGateV1(state,catalogDevice)
  :{status:'UNKNOWN',engineeringApproved:false,ready_for_installation:false,
     issues:[{code:'GATE_UNAVAILABLE',level:'UNKNOWN'}]};
 download(baseName()+'_engineering_diagnostics_DRAFT.json',
  JSON.stringify(report,null,2),'application/json;charset=utf-8');
}
function renderReadiness(){
 const target=$('readinessSummary');if(!target)return;
 const r=documentReadiness();target.replaceChildren();
 const title=document.createElement('strong');title.textContent=r.status==='DRAFT_ONLY'?'Исходные сведения заполнены · черновик':'Нужны уточнения · '+r.blockers.length;target.appendChild(title);
 const details=document.createElement('p');details.className='muted';details.textContent=`На рейках: ${r.placed} аппаратов. Свободно ${r.freeModules} мод. Неразмещено: ${r.unplaced}. Инженерный допуск: НЕТ.`;target.appendChild(details);
 for(const issue of r.blockers.slice(0,6)){const item=document.createElement('div');item.className='readiness-issue';item.textContent='• '+issue;target.appendChild(item);}
 if(r.blockers.length>6){const rest=document.createElement('p');rest.className='muted';rest.textContent=`Ещё замечаний: ${r.blockers.length-6}`;target.appendChild(rest);}
}
function renderAudit(){
 const holder=$('qualityChecks');if(!holder)return;const report=projectAudit();holder.replaceChildren();
 const lead=document.createElement('p');lead.className='muted';const incomplete=report.checks.filter(x=>['ERROR','MISSING'].includes(x.status));lead.textContent=`Статус: ${report.status==='DRAFT_ONLY'?'Черновик без блокирующих пробелов': 'Нужны исходные данные'}. Обнаружено замечаний: ${incomplete.length}. Инженерное подтверждение: НЕТ.`;holder.appendChild(lead);
 const display=[...incomplete,...report.checks.filter(x=>!['ERROR','MISSING','OK'].includes(x.status))];
 const statusNames={MISSING:'НЕ ЗАДАНО',ERROR:'ОШИБКА',DECLARED:'ЗАЯВЛЕНО',NOT_IMPLEMENTED:'НЕ ПОДДЕРЖИВАЕТСЯ',NOT_VERIFIED:'НЕ ПРОВЕРЕНО'};
 for(const x of display.slice(0,16)){const item=document.createElement('div');item.className='quality-check';const badge=document.createElement('b');badge.textContent=statusNames[x.status]||x.status;badge.className='quality-status '+x.status.toLowerCase();item.appendChild(badge);const description=document.createElement('span');description.textContent=x.detail;item.appendChild(description);holder.appendChild(item);}
 if(display.length>16){const more=document.createElement('p');more.className='muted';more.textContent=`Дополнительно: ${display.length-16} пунктов. Полный список — в JSON-отчёте.`;holder.appendChild(more);}
}
function renderCurrentCheck(){
 const box=$('currentLine'),result=$('currentResult');if(!box||!result)return;
 const prior=box.value;box.replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Выберите отходящую линию';box.appendChild(first);
 for(const l of state.lines){const opt=document.createElement('option');opt.value=l.id;opt.textContent=`${l.id} · ${l.name||'Без названия'}`;box.appendChild(opt);}
 box.value=state.lines.some(l=>l.id===prior)?prior:'';
 const line=state.lines.find(l=>l.id===box.value);
 for(const k of ['ibA','inA','izA','i2A'])$('input'+k).value=line?.overloadInput?.[k]??'';
 const check=checkOverload(line?.overloadInput);
 $('inputikKa').value=line?.faultInput?.ikKa??'';
 $('inputikSource').value=line?.faultInput?.source??'';
 $('v30Input').value=line?.overloadV30?JSON.stringify(line.overloadV30,null,2):'';
 $('lv43Input').value=line?.lv43Input?JSON.stringify(line.lv43Input,null,2):'';
 $('route44Input').value=line?.route44Input?JSON.stringify(line.route44Input,null,2):'';
 const adv=line?.overloadV30?epOverloadGuardV30(line.overloadV30):null;
 $('v30Result').textContent=line?(adv?'Арифметика v3.0: '+adv.numeric_status+'. Источники: '+adv.evidence_status+', отсутствует '+adv.missing_evidence.length+' из 10. Инженерная проверка не завершена.':'Дополнительные коэффициенты и источники пока не заданы.'):'Выберите линию.';
 const fault=line?epBreakingCapacityCheck(catalogDevice(line.catalogSku),line.faultInput?.ikKa):null;
 result.textContent=line?`Арифметика Ib/In/Iz/I2: ${check.numericStatus}. Проверка Iкз/Icn: ${fault.status}. ${fault.message}. ${line.calculationReview?.required?'ТРЕБУЕТСЯ ПОВТОРНАЯ ПРОВЕРКА ПОСЛЕ ИЗМЕНЕНИЯ ПРОЕКТА. ':''}ИСТОЧНИКИ И ПРИМЕНИМОСТЬ НЕ ПОДТВЕРЖДЕНЫ.`:'Выберите цепь. Номинал B/C или установленная мощность не дают надёжных значений Ib, I2 и Iкз.';
}
function saveCurrentCheck(){
 const l=state.lines.find(x=>x.id===$('currentLine').value);if(!l){notify('Сначала выберите цепь',true);return;}
 const inputs=Object.fromEntries(['ibA','inA','izA','i2A'].map(k=>[k,$('input'+k).value]));
 const complete=epCurrentInputCompleteness(inputs);
 if(complete==='PARTIAL'){notify('Для проверки перегрузки заполните все четыре тока или оставьте их пустыми',true);return;}
 if(complete==='COMPLETE'){
  const result=checkOverload(inputs);
  if(result.numericStatus==='UNKNOWN'){notify(result.reason,true);return;}
 }
 const rawIk=$('inputikKa').value.trim();
 if(rawIk&&epParsePositiveCurrentKa(rawIk)===null){notify('Некорректный Iкз (кА)',true);return;}
 checkpoint();
 if(complete==='COMPLETE')l.overloadInput=inputs;else delete l.overloadInput;
 if(rawIk)l.faultInput={ikKa:rawIk,source:$('inputikSource').value.trim().slice(0,200)};else delete l.faultInput;
 acknowledgeCalculationReview(l,'overloadInput');
 acknowledgeCalculationReview(l,'faultInput');
 changed();$('currentLine').value=l.id;renderCurrentCheck();
}
function saveV30Check(){
 const l=state.lines.find(x=>x.id===$('currentLine').value);
 if(!l){notify('Выберите отходящую линию',true);return;}
 const raw=$('v30Input').value.trim();
 let normalized=null;
 if(raw){
  if(raw.length>20000){notify('Расширенная проверка слишком большая',true);return;}
  try{normalized=normalizeV30Import(JSON.parse(raw));}catch(e){notify('Ошибка расширенной проверки: '+e.message,true);return;}
 }
 checkpoint();
 if(normalized)l.overloadV30=normalized;else delete l.overloadV30;
 acknowledgeCalculationReview(l,'overloadV30');
 changed();$('currentLine').value=l.id;renderCurrentCheck();
}
function renderTTContext(){
 const field=$('ttContextInput'),result=$('ttContextResult');
 if(!field||!result)return;
 field.value=state.ttContext?JSON.stringify(state.ttContext,null,2):'';
 if(!state.ttContext){result.textContent='Данные TT/УЗО не заданы. Проект не проверен на автоматическое отключение.';return;}
 const report=epTTScreenV45(state.ttContext);
 const mismatch=state.earthing!=='TT'||state.ttContext.earthing_system!=='TT';
 result.textContent='Ограниченная проверка TT: '+(mismatch?'OUT_OF_SCOPE':report.status)+'. '+
  (mismatch?'КОНФЛИКТ: система заземления проекта и исходные данные TT не согласованы. ':report.issues.join(', '))+
  ' Подтверждение монтажа: НЕТ.';
}
function saveTTContext(){
 const raw=$('ttContextInput').value.trim();
 let data=null;
 if(raw){
  if(raw.length>6000){notify('Слишком большой блок исходных данных TT',true);return;}
  try{data=epNormalizeTTContext(JSON.parse(raw));}
  catch(error){notify('Ошибка данных TT: '+error.message,true);return;}
 }
 checkpoint();
 if(data)state.ttContext=data;else delete state.ttContext;
 changed();renderTTContext();renderReadiness();renderAudit();
}
async function verifyCableSourceFile(){
 const field=$('cableSourceFile'),hashField=$('cableSourceHash'),output=$('cableSourceResult');
 const file=field.files?.[0],expected=hashField.value.trim();
 if(!file){output.textContent='Сначала выберите локальный файл';return;}
 try{
  const report=await epVerifyDocumentFileV34(file,expected);
  output.textContent='Целостность байтов: '+report.integrity_status+
   '. SHA-256 файла: '+report.actual_sha256+'. Размер: '+report.byte_count+
   ' байт. Подлинность источника и нормативная пригодность: НЕ ПОДТВЕРЖДЕНЫ.';
 }catch(error){
  output.textContent='Проверка НЕ выполнена: '+error.message+
   '. Происхождение документа остаётся непроверенным.';
 }
}
function assessCable31FromUI(){
 const input=$('cable31Input'),output=$('cable31Result'),raw=input.value.trim();
 if(!raw){output.textContent='Нет таблицы или исходных данных';return;}
 if(raw.length>150000){output.textContent='Объём превышает допустимый для локальной проверки';return;}
 try{
  const report=epCable31Assess(JSON.parse(raw));
  const codes=report.issues.map(x=>x.code);
  output.textContent='Арифметика: '+report.numeric_status+
   '. Структура таблицы: '+report.table_audit.structural_status+
   '. Совпадающая строка: '+(report.computed.table_row_index??'НЕ НАЙДЕНА')+
   '. Изменённая Iz: '+(report.computed.corrected_iz_a??'НЕ РАССЧИТАНА')+
   '. Замечания: '+(codes.join(', ')||'только обязательная проверка источника')+
   '. Нормативное подтверждение и монтажный допуск: НЕТ.';
 }catch(error){output.textContent='Ошибка проверки таблицы: '+error.message+'. Данные не изменены.';}
}
function saveRoute44(){
 const line=state.lines.find(l=>l.id===$('currentLine').value);
 if(!line){notify('Выберите отходящую линию',true);return;}
 let input;
 try{
  const raw=$('route44Input').value.trim();
  if(raw.length>14000)throw Error('Слишком большой JSON трассы');
  input=normalizeRoute44Import(JSON.parse(raw));
 }catch(error){notify('Трасса не сохранена: '+error.message,true);return;}
 if(ep43Num(line.overloadInput?.ibA)===null){
  notify('Задайте Ib в карточке выбранной линии',true);return;
 }
 checkpoint();line.route44Input=input;acknowledgeCalculationReview(line,'route44Input');
 changed();$('currentLine').value=line.id;renderCurrentCheck();
 const r=ep44BindLine(state,line);
 $('route44Result').textContent='Линия '+line.id+', Ib '+line.overloadInput.ibA+' A. Расчёт: '+
  r.result.status+', минимальный ток повреждения '+(r.result.calculated_min_fault_current_a??'НЕИЗВЕСТЕН')+
  ' А, Zs '+(r.result.calculated_zs_ohm??'НЕИЗВЕСТЕН')+
  ' Ом. Проверка проекта: '+r.status+'. Монтажный допуск: НЕТ.';
 renderAudit();renderReadiness();
}
function renderWiring18(){
 const input=$('wiring18Input'),result=$('wiring18Result');
 if(!input||!result)return;
 input.value=state.wiringModelV18?JSON.stringify(state.wiringModelV18,null,2):'';
 if(!state.wiringModelV18){
  result.textContent='Нет сохранённой терминальной схемы; соединения не проверены.';
  return;
 }
 const check=epWiringAuditCoreV18(state.wiringModelV18);
 result.textContent='Сохранённая схема: '+check.counts.FAIL+' ошибок; '+
  check.counts.UNKNOWN+' неизвестных условий. Это описание проводов, не подтверждение монтажа.';
}
async function checkWiring18(save=false){
 const out=$('wiring18Result'),raw=$('wiring18Input').value.trim();
 if(raw.length>100000){out.textContent='JSON превышает 100 000 символов';return;}
 let model,report;
 try{
  model=normalizeWiring18Import(JSON.parse(raw));
  report=await epWiringAuditV18(model);
 }catch(e){out.textContent='Ошибка схемы: '+e.message+'. Данные проекта не изменены.';return;}
 if(save){
  checkpoint();
  state.wiringModelV18=model;
  changed();
 }
 out.textContent='Проверка клемм: '+report.counts.FAIL+' ошибок, '+
  report.counts.UNKNOWN+' неизвестных условий, '+
  report.counts.PASS+' подтверждений непрерывности ТОЛЬКО в заявленной схеме. SHA-256: '+
  (report.input_sha256||'недоступен')+
  '. Сопоставление с физическими аппаратами и проектом НЕ завершено. Монтажный допуск: НЕТ.'+
  (report.diagnostics.filter(x=>x.status==='FAIL').length?' Ошибки: '+
   report.diagnostics.filter(x=>x.status==='FAIL').slice(0,6).map(x=>x.code).join(', '):'');
}
function renderEndpointBridgeV1(){
 const refs=$('endpointSymbolicRef'),terms=$('endpointTerminalId'),out=$('endpointBridgeResult');
 if(!refs||!terms||!out)return;
 const priorRef=refs.value,priorTerminal=terms.value;
 refs.replaceChildren();terms.replaceChildren();
 const option=(select,value,label)=>{const item=document.createElement('option');item.value=value;item.textContent=label;select.appendChild(item);};
 option(refs,'','Выберите контакт проекта');option(terms,'','Выберите клемму');
 const linkRefs=new Set(epSymbolicConnectionsV1(state).flatMap(x=>[x.from,x.to]));
 for(const ref of [...linkRefs].sort())option(refs,ref,ref);
 for(const term of state.wiringModelV18?.terminals||[])
  option(terms,term.id,term.id+' / '+term.conductor+' / '+term.device_id);
 refs.value=[...refs.options].some(o=>o.value===priorRef)?priorRef:'';
 const existing=(state.endpointBindingsV1||[]).find(x=>x.symbolicRef===refs.value);
 const selected=existing?.terminalId||priorTerminal;
 terms.value=[...terms.options].some(o=>o.value===selected)?selected:'';
 const report=epEndpointBridgeAuditV1(state);
 out.textContent='Сопоставлено '+report.matchedEndpoints+' из '+report.expectedEndpoints+
  ' условных контактов; нарушений '+report.issues.filter(x=>x.level==='BLOCKED').length+
  '. Провода и паспортные номера клемм не подтверждены физически.';
}
function saveEndpointBindingV1(){
 const ref=$('endpointSymbolicRef').value,terminal=$('endpointTerminalId').value;
 if(!ref||!terminal){notify('Выберите условный контакт и клемму',true);return;}
 const candidate=(state.endpointBindingsV1||[]).filter(x=>x.symbolicRef!==ref)
  .concat({symbolicRef:ref,terminalId:terminal});
 try{epNormalizeEndpointBindingsV1(candidate);}
 catch(error){notify('Некорректная привязка: '+error.message,true);return;}
 checkpoint();
 state.endpointBindingsV1=candidate;
 changed();
 $('endpointSymbolicRef').value=ref;$('endpointTerminalId').value=terminal;
 renderEndpointBridgeV1();renderAudit();renderReadiness();
}
function clearEndpointBindingV1(){
 const ref=$('endpointSymbolicRef').value;
 if(!ref){notify('Выберите условный контакт',true);return;}
 const old=state.endpointBindingsV1||[];
 const next=old.filter(x=>x.symbolicRef!==ref);
 if(next.length===old.length){notify('Выбранный контакт ещё не связан',true);return;}
 checkpoint();state.endpointBindingsV1=next;changed();
 $('endpointSymbolicRef').value=ref;renderEndpointBridgeV1();
}
function renderBoardBindingsV1(){
 const m=$('bindingModelDevice'),b=$('bindingBoardDevice'),out=$('bindingResult');
 if(!m||!b||!out)return;
 const oldM=m.value,oldB=b.value;
 m.replaceChildren();b.replaceChildren();
 const add=(select,value,label)=>{const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);};
 add(m,'','Выберите устройство модели');
 add(b,'','Выберите аппарат конструктора');
 for(const device of state.deviceModelV19?.devices||[])add(m,device.id,device.id+' / '+(device.kind||'тип не указан'));
 for(const device of epBoardDevicesV1(state))
  add(b,device.id,device.id+' / '+device.label+' / '+(device.circuitId||'общий'));
 m.value=[...m.options].some(x=>x.value===oldM)?oldM:'';
 b.value=[...b.options].some(x=>x.value===oldB)?oldB:'';
 const report=epBoardBindingsAuditV1(state,catalogDevice);
 out.textContent='Связано '+report.matched+' из '+report.boardTotal+
  ' аппаратов, ошибок '+report.issues.filter(x=>x.level==='BLOCKED').length+
  ', отсутствуют проверки '+report.issues.filter(x=>x.level==='UNKNOWN').length+
  '. Физическое соответствие контактам и паспортам: НЕ ПОДТВЕРЖДЕНО.';
}
function saveBoardBindingV1(){
 const model=$('bindingModelDevice').value,board=$('bindingBoardDevice').value;
 if(!model||!board){notify('Выберите оба устройства',true);return;}
 let binding;
 try{binding=epNewBoardBindingV1(state,model,board);}
 catch(e){notify(e.message,true);return;}
 const existing=state.boardBindingsV1||[];
 if(existing.some(x=>x.modelDeviceId!==model&&x.boardDeviceId===board)){
  notify('Аппарат щита уже связан с другим устройством',true);return;
 }
 checkpoint();
 state.boardBindingsV1=existing.filter(x=>x.modelDeviceId!==model).concat(binding);
 changed();
 $('bindingModelDevice').value=model;$('bindingBoardDevice').value=board;
 renderBoardBindingsV1();renderAudit();renderReadiness();
}
function clearBoardBindingV1(){
 const model=$('bindingModelDevice').value,board=$('bindingBoardDevice').value;
 const entries=state.boardBindingsV1||[];
 const next=entries.filter(x=>!(model?x.modelDeviceId===model:x.boardDeviceId===board));
 if(next.length===entries.length){notify('Выберите существующую связь',true);return;}
 checkpoint();state.boardBindingsV1=next;changed();renderBoardBindingsV1();
}
function renderDevice19(){
 const field=$('device19Input'),out=$('device19Result');
 if(!field||!out)return;
 field.value=state.deviceModelV19?JSON.stringify(state.deviceModelV19,null,2):'';
 if(!state.deviceModelV19){out.textContent='Модель полюсов и зон N не задана.';return;}
 const report=epDeviceAuditCoreV19(state.deviceModelV19);
 const consistent=epWiringDeviceModelConsistencyV19(state.wiringModelV18,state.deviceModelV19);
 out.textContent='Аппараты: '+report.counts.FAIL+' ошибок, '+report.counts.UNKNOWN+
  ' неизвестных условий. Сопоставление с проводами: '+consistent.status+
  '. Условия реальной сборки не подтверждены.';
}
async function checkDevice19(save=false){
 const out=$('device19Result'),raw=$('device19Input').value.trim();
 if(raw.length>100000){out.textContent='JSON слишком большой';return;}
 let input,r;
 try{
  input=normalizeDevice19Import(JSON.parse(raw));
  r=await epDeviceAuditV19(input);
 }catch(error){out.textContent='Ошибка модели: '+error.message+'. Проект не изменён.';return;}
 if(save){checkpoint();state.deviceModelV19=input;changed();}
 const linked=epWiringDeviceModelConsistencyV19(state.wiringModelV18,input);
 out.textContent='Аудит полюсов/PE/N: '+r.counts.FAIL+' ошибок, '+r.counts.UNKNOWN+
  ' неизвестных условий. Связь с моделью проводов: '+linked.status+
  (linked.issues.length?' ('+linked.issues.join(', ')+')':'')+
  '. SHA-256: '+(r.input_sha256||'недоступен')+
  '. Независимое подтверждение изготовителя, соединений и монтажа: НЕТ.'+
  (r.counts.FAIL?' Ошибки: '+r.diagnostics.filter(x=>x.status==='FAIL').slice(0,8)
   .map(x=>x.code).join(', '):'');
}
function runReference39(){
 const $v=id=>$(id).value;
 const payload={conductor_material:'Cu',insulation:'PVC',cores_loaded:2,
  installation_method:$v('ref39Method'),cross_section_mm2:$v('ref39Section'),
  ambient_air_c:$v('ref39Temp'),circuits_grouped:$v('ref39Groups'),
  grouping_layout:'bunched_air_surface_embedded_enclosed',
  other_derating_factors_present:$('ref39OtherFactors').checked,
  installation_method_verified:$('ref39VerifiedMethod').checked,
  all_circuits_simultaneously_loaded:$('ref39AllLoaded').checked,
  ib_a:$v('ref39Ib'),in_a:$v('ref39In'),i2_a:$v('ref39I2')};
 const result=epReferenceCableV39(payload);
 $('ref39Result').textContent='Справочная арифметика: '+result.numeric_status+
  '. База: '+(result.base_reference_a??'нет')+' А; поправка температуры: '+
  (result.temperature_factor??'нет')+'; группировка: '+(result.grouping_factor??'нет')+
  '; скорректированное значение: '+(result.adjusted_reference_iz_a??'нет')+
  ' А. Замечания: '+(result.issues.join(', ')||'не выявлены в пределах узкого справочного набора')+
  '. Проверка официального нормативного источника: НЕТ. Допуск к монтажу: НЕТ.';
}
function saveLV43ToLine(){
 const line=state.lines.find(x=>x.id===$('currentLine').value);
 if(!line){notify('Выберите отходящую линию для привязки',true);return;}
 let record;
 try{
  const raw=$('lv43Input').value.trim();
  if(raw.length>12000)throw Error('Слишком большой JSON');
  record=normalizeLV43Import(JSON.parse(raw));
 }catch(error){notify('Расчёт TN не сохранён: '+error.message,true);return;}
 if(!line.overloadInput?.ibA||ep43Num(line.overloadInput.ibA)===null){
  notify('Сначала задайте Ib в численной проверке выбранной линии',true);return;
 }
 checkpoint();
 line.lv43Input=record;
 acknowledgeCalculationReview(line,'lv43Input');
 changed();
 $('currentLine').value=line.id;
 renderCurrentCheck();
 renderAudit();renderReadiness();
 const report=epLV43BoundLine(state,line);
 $('lv43Result').textContent='Привязано к '+line.id+' (Ib '+line.overloadInput.ibA+' А). '+
  'TN: '+report.tn.status+', падение напряжения: '+report.voltage_drop.status+
  ', итоговая проверка: '+report.status+'. Инженерный допуск: НЕТ.';
}
function runLV43(){
 const raw=$('lv43Input').value.trim();
 if(raw.length>12000){$('lv43Result').textContent='Слишком большой JSON';return;}
 try{
  const obj=JSON.parse(raw);
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error('Требуется JSON-объект');
  const scope=epScopeV43(obj.scope),tn=epTNDisconnectionV43(obj.tn_disconnection);
  const drop=epVoltageDropV43(obj.voltage_drop,obj.design_current_a);
  const earthingOK=['TN-S','TN-C-S'].includes(state.earthing);
  const status=earthingOK&&scope.status==='IN_SCOPE_PRELIMINARY'
   ?'Проверка в пределах предварительной модели':'OUT_OF_SCOPE — несогласованность с проектом/областью применения';
  $('lv43Result').textContent=status+'. TN: '+(earthingOK?tn.status:'OUT_OF_SCOPE')+
   ' ('+tn.issues.join(', ')+'). Падение напряжения: '+(earthingOK?drop.status:'OUT_OF_SCOPE')+
   ' ('+drop.issues.join(', ')+'). Инженерный допуск: НЕТ. Исходные данные и кривые отключения должны быть независимо подтверждены.';
 }catch(error){$('lv43Result').textContent='Не удалось выполнить расчёт: '+error.message;}
}
function renderPhases(){
 const holder=$('phaseChart');if(!holder)return;
 const data=getPhasePercentages(); const total=phaseSummary();
 holder.innerHTML=data.map(([name,pct,p])=>`<div class="phase-item"><b>${name}</b><div class="phase-track"><span style="width:${pct.toFixed(2)}%"></span></div><strong>${p.toLocaleString('ru-RU',{maximumFractionDigits:2})} кВт</strong></div>`).join('')+
 `<p class="muted" style="font-size:12px;margin-top:9px">Не распределено: ${total.unassigned.toLocaleString('ru-RU',{maximumFractionDigits:2})} кВт. Трёхфазная нагрузка распределена поровну только для обзорной диаграммы. Это не расчёт токов, коэффициентов спроса или нейтрали.</p>`;
}
function renderPlan(){const el=$('planArea');if(!el)return;el.innerHTML='';if(!state.plan){el.textContent='План не загружен';return;}
 const title=document.createElement('strong');title.textContent=state.plan.name;el.appendChild(title);
 if((state.plan.dataUrl || planPreviewUrl) && state.plan.mime.startsWith('image/')){const img=document.createElement('img');img.src=state.plan.dataUrl||planPreviewUrl;img.alt='Загруженный план как иллюстрация';img.className='plan-preview';el.appendChild(img);}
 else {const p=document.createElement('p');p.className='muted';p.textContent='Подложка сохранена только по имени. Загрузите файл повторно; PDF и крупные изображения в JSON не встраиваются.';el.appendChild(p);}
}


function renderConsumers(){
 const el=$('consumerEditor');if(!el)return;
 ensureV2(state);
 const choices=state.lines.map(l=>`<option value="${safeText(l.id)}" ${l.id===selectedLine?'selected':''}>${safeText(l.id+' · '+l.name)}</option>`).join('');
 const line=state.lines.find(l=>l.id===selectedLine)||state.lines[0];
 if(!line){el.innerHTML='<p class="muted">Сначала добавьте цепь.</p>';return;}
 if(!selectedLine||!state.lines.some(l=>l.id===selectedLine))selectedLine=line.id;
 const loads=state.loads.filter(l=>l.circuitId===selectedLine);
 el.innerHTML=`<label>Отходящая цепь<select id="consumerCircuit">${choices}</select></label><div class="consumer-list">${loads.map(l=>`<div class="consumer-row"><div class="consumer-fields"><input aria-label="Название потребителя ${safeText(l.id)}" data-consumer-name="${safeText(l.id)}" maxlength="100" value="${safeText(l.name)}"><input aria-label="Мощность потребителя ${safeText(l.id)}" data-consumer-power="${safeText(l.id)}" inputmode="decimal" value="${l.powerKw??''}"></div><button class="btn tiny" data-save-consumer="${safeText(l.id)}">Сохранить</button><button class="btn tiny" data-remove-consumer="${safeText(l.id)}">Удалить</button></div>`).join('')||'<p class="muted">Нет потребителей</p>'}</div><div class="form-grid"><label>Потребитель<input id="consumerName" placeholder="Например, холодильник" maxlength="100"></label><label>Мощность, кВт<input id="consumerPower" inputmode="decimal" placeholder="1,2"></label></div><button class="btn" id="addConsumerBtn">Добавить потребителя в цепь</button>`;
}
function renderSharedDevices(){
 const el=$('sharedDeviceEditor');if(!el)return;ensureV2(state);
 const rows=state.sharedDevices.map(d=>`<div class="consumer-row"><span>${safeText(d.label)} · ${d.modules}M → ${safeText(d.circuitIds.join(', '))}</span><button class="btn tiny" data-remove-rcd="${safeText(d.id)}">Удалить</button></div>`).join('');
 const checkboxes=state.lines.map(l=>`<label class="check-choice"><input type="checkbox" data-rcd-circuit="${safeText(l.id)}"> ${safeText(l.id)} · ${safeText(l.name)}</label>`).join('');
 el.innerHTML=`${rows||'<p class="muted">Общих УЗО пока нет.</p>'}<div class="form-grid"><label>Тип общего УЗО<select id="sharedRcdType"><option value="RCD_2P">УЗО 2P · 2M</option><option value="RCD_4P">УЗО 4P · 4M</option></select></label><label>Обозначение<input id="sharedRcdLabel" maxlength="50" placeholder="Например, QD1"></label></div><div class="check-choices">${checkboxes}</div><button class="btn" id="addRcdBtn">Добавить общее УЗО</button><p class="muted">Группировка — заявленная логическая принадлежность. Не подтверждает схему N/PE, тип и номинал УЗО, селективность или защиту при повреждении.</p>`;
}
function renderCircuitGraph(){
 const host=$('circuitGraph');if(!host)return;
 const audit=graphAudit(state);
 host.innerHTML='<div class="graph-banner">Логические связи (черновик) · не подтверждённая электрическая схема</div>';
 for(const g of audit.graph){
  const row=document.createElement('div');row.className='graph-row';if(g.circuitId===selectedLine)row.classList.add('ep-circuit-active');
  const upstream=document.createElement('span');upstream.className='graph-upstream';upstream.textContent=g.upstreamLabel||'Без общего УЗО';
  const apparatus=document.createElement('span');apparatus.className='graph-apparatus';apparatus.textContent=(g.apparatusLabel||'Аппарат не задан')+' · '+g.apparatusId;
  const circuit=document.createElement('span');circuit.className='graph-circuit';circuit.textContent=g.circuitId+' · '+g.circuitName+' · '+(g.phase||'нет фазы');
  const loads=document.createElement('span');loads.className='graph-loads';loads.textContent=g.consumers.length?g.consumers.map(c=>c.name+' ('+(c.powerKw??'?')+' кВт)').join(', '):'Нет потребителей';
  const open=document.createElement('button');open.type='button';open.className='btn tiny';open.dataset.openCircuit=g.circuitId;open.textContent='К линии';
  row.append(upstream,apparatus,circuit,loads,open);host.append(row);
 }
 if(!audit.graph.length){const p=document.createElement('p');p.className='muted';p.textContent='Добавьте отходящую цепь';host.append(p);}
 const missing=$('graphWarnings');if(missing)missing.textContent=audit.checks.length?'Замечания по связям: '+audit.checks.map(x=>x.message).join('; '):'Объявленные назначения полны. Реальные соединения L/N/PE всё ещё не проверены.';
}
function renderConductorEditor(){
 const host=$('conductorEditor');if(!host)return;
 const report=conductorAudit(state);
 const rows=state.lines.map(c=>{
  const r=state.conductorRoutes.find(x=>x.circuitId===c.id),expected=expectedNBus(state,c.id);
  const buses=['N_MAIN',...state.sharedDevices.map(x=>'N_'+x.id)];
  const current=r?.neutralBus||expected;
  if(!buses.includes(current))buses.push(current);
  const options=buses.map(bus=>`<option value="${safeText(bus)}" ${bus===current?'selected':''}>${safeText(bus)}</option>`).join('');
  return `<div class="conductor-row"><b>${safeText(c.id+' · '+c.name)}</b><span>${safeText(r?(r.phaseConductors.join('/')||'L?')+' / '+r.neutralBus+' / '+(r.protectiveBus||'PE?'):'Маршрут отсутствует')}</span><label class="muted">Шина N <select data-route-neutral="${safeText(c.id)}">${options}</select></label><button class="btn tiny" data-declare-route="${safeText(c.id)}">Сохранить N</button><button class="btn tiny" data-confirm-pe="${safeText(c.id)}">Заявить PE</button><button class="btn tiny" data-clear-route="${safeText(c.id)}">Сбросить</button></div>`;
 }).join('');
 host.innerHTML=`<div class="conductor-banner">Данные для проверки проекта, НЕ схема монтажа и НЕ указание подключать проводники.</div><p class="muted">Программа может предложить черновую принадлежность L/N, но PE НЕ назначается автоматически. Нажатие «Заявить PE» фиксирует только ваше предположение, не результат измерений. Физические клеммы и проводники не установлены.</p>${rows||'<p class="muted">Нет отходящих цепей</p>'}<div class="mini-actions"><button class="btn" id="proposeRoutesBtn">Заполнить отсутствующие маршруты</button><button class="btn" id="exportConductorSvgBtn">Экспорт черновика SVG</button><button class="btn" id="exportConductorCsvBtn">Ведомость N/PE CSV</button></div><p class="mini-warning">${safeText(report.issues.length?report.issues.map(i=>i.circuitId+': '+i.message).join('; '):report.warning)}</p>`;
}
function renderTerminalEditor(){
 const host=$('terminalEditor');if(!host)return;
 const audit=terminalAudit(state);
 const rows=state.loads.map(l=>{const route=state.conductorRoutes.find(r=>r.circuitId===l.circuitId),linked=state.terminalLinks.filter(x=>x.loadId===l.id),errors=audit.issues.filter(i=>i.loadId===l.id);
 return `<div class="conductor-row"><b>${safeText(l.name||l.id)} · ${safeText(l.id)}</b><span>${linked.length} контактов · ${errors.length} замечаний · ${safeText(l.circuitId)}</span><button class="btn tiny" data-declare-terminal="${safeText(l.id)}" ${route?'':'disabled'}>Объявить контакты</button><button class="btn tiny" data-clear-terminal="${safeText(l.id)}">Сбросить</button></div>`;}).join('');
 host.innerHTML=`<div class="conductor-banner">Условные контакты, НЕ монтажный чертёж. Номера клемм и типы зажимов не указаны.</div><p class="muted">Сначала задайте маршрут цепи L/N; PE появляется только после явного заявления PE. При изменении N/фаз контакт помечается как устаревший, а не исправляется молча.</p>${rows||'<p class="muted">Нет потребителей</p>'}<div class="mini-actions"><button class="btn" id="declareMissingTerminalBtn">Добавить отсутствующие декларации</button><button class="btn" id="exportTerminalSvgBtn">Обзор контактов SVG</button><button class="btn" id="exportTerminalCsvBtn">Ведомость контактов CSV</button></div><p class="mini-warning">${safeText(audit.issues.length?audit.issues.slice(0,16).map(i=>i.loadId+'/'+i.kind+': '+i.message).join('; ')+(audit.issues.length>16?' ... и ещё '+(audit.issues.length-16):''):audit.warning)}</p>`;
}
function renderFeedEditor(){
 const host=$('feedEditor');if(!host)return;
 const audit=feedAudit(state);
 const groupRows=state.sharedDevices.map(g=>{const links=state.groupInputLinks.filter(x=>x.groupId===g.id),errors=audit.issues.filter(x=>x.groupId===g.id);return `<div class="conductor-row"><b>${safeText(g.label)} · ${safeText(g.id)} · ввод</b><span>${links.length} L/N · ${errors.length} замечаний</span><button class="btn tiny" data-declare-group-input="${safeText(g.id)}">Заявить ввод</button><button class="btn tiny" data-clear-group-input="${safeText(g.id)}">Сбросить</button></div>`;}).join('');
 const rows=state.lines.map(c=>{const feed=state.feedLinks.filter(f=>f.circuitId===c.id),errors=audit.issues.filter(i=>i.circuitId===c.id);
 return `<div class="conductor-row"><b>${safeText(c.name||c.id)} · ${safeText(c.id)}</b><span>${feed.length} питающих деклараций · ${errors.length} замечаний</span><button class="btn tiny" data-declare-feed="${safeText(c.id)}" ${state.conductorRoutes.some(r=>r.circuitId===c.id)?'':'disabled'}>Заявить питание</button><button class="btn tiny" data-clear-feed="${safeText(c.id)}">Сбросить</button></div>`;}).join('');
 host.innerHTML=`<div class="conductor-banner">Питающие связи УСЛОВНЫЕ · НЕ ДЛЯ МОНТАЖА</div><p class="muted">Декларация SOURCE → (общее УЗО) → отходящий аппарат. Нейтраль направляется на собственную N-шину группы, а PE здесь не проходит через аппарат. Ввод в УЗО теперь задаётся отдельной условной декларацией; паспортные клеммы не моделируются.</p>${groupRows}${rows||'<p class="muted">Цепи отсутствуют</p>'}<div class="mini-actions"><button class="btn" id="declareMissingGroupInputsBtn">Добавить отсутствующие вводы УЗО</button><button class="btn" id="declareMissingFeedBtn">Добавить отсутствующие</button><button class="btn" id="exportFeedCsvBtn">Ведомость питания CSV</button><button class="btn" id="exportFeedSvgBtn">Схема-обзор SVG</button></div><p class="mini-warning">${safeText(audit.issues.length?audit.issues.slice(0,16).map(x=>(x.groupId||x.circuitId)+'/'+x.kind+': '+x.message).join('; '):audit.warning)}</p>`;
}
function renderRows(){const tb=$('loadRows');tb.innerHTML='';state.lines.forEach((l,index)=>{const tr=document.createElement('tr');tr.dataset.id=l.id;if(l.id===selectedLine)tr.classList.add('ep-circuit-active');tr.innerHTML=`<td><input aria-label="Название линии" data-key="name" maxlength="100" value="${safeText(l.name)}"></td><td><input aria-label="Мощность кВт" data-key="power" inputmode="decimal" value="${l.power??''}" ${state.loads?.filter(x=>x.circuitId===l.id).length>1?'disabled title="Редактируйте потребителей ниже"':''}></td><td><select aria-label="Фаза" data-key="phase">${['','L1','L2','L3','3Ф'].map(x=>`<option value="${x}" ${l.phase===x?'selected':''}>${x||'—'}</option>`).join('')}</select></td><td><input aria-label="Обозначение аппарата" data-key="device" maxlength="25" value="${safeText(l.device||'')}"></td><td><input aria-label="Количество модулей" data-key="modules" type="number" min="1" max="12" step="1" value="${l.modules||1}"></td><td><span class="origin-tag" title="${safeText(l.sourceRef||'Происхождение строки; не подтверждение технических данных')}">${safeText(SOURCES[l.source]||SOURCES.unknown)}</span></td><td><button class="delete-btn" aria-label="Удалить линию" data-delete="${safeText(l.id)}">✕</button></td>`;tb.appendChild(tr);});}
$('loadRows').addEventListener('change',ev=>{const input=ev.target.closest('[data-key]');if(!input)return;const tr=ev.target.closest('tr'), l=state.lines.find(x=>x.id===tr.dataset.id);if(!l)return;const key=input.dataset.key;if(key==='power'){ensureV2(state);const consumers=state.loads.filter(x=>x.circuitId===l.id);if(consumers.length>1){notify('У линии несколько потребителей: редактируйте их в отдельном списке',true);render();return;}const value=numeric(input.value);if(value!==null&&(value<0||value>100000)){notify('Мощность должна быть числом от 0 до 100000 кВт',true);render();return;}checkpoint();if(consumers.length)consumers[0].powerKw=value;else if(value!==null)state.loads.push({id:'LOAD-'+l.id,circuitId:l.id,name:l.name,powerKw:value,source:l.source||'manual',sourceRef:l.sourceRef||''});if(l.power!==value)markCalculationReview(l,'LOAD_CHANGED');l.power=value;}else if(key==='modules'){const v=Number(input.value);if(!Number.isInteger(v)||v<1||v>12){notify('Допустимая условная ширина — 1–12 модулей',true);render();return;}checkpoint();updateBranchApparatus(state,l.id,{modules:v,templateId:null});delete l.catalogSku;}else{if(key==='phase'){const candidate=JSON.parse(JSON.stringify(ensureV2(state)));candidate.lines.find(x=>x.id===l.id).phase=input.value;try{validateEntities(candidate);}catch(err){notify(err.message,true);render();return;}}checkpoint();if(key==='device'){updateBranchApparatus(state,l.id,{label:input.value,templateId:null});delete l.catalogSku;}else {if(key==='phase'&&l.phase!==input.value)markCalculationReview(l,'PHASE_CHANGED');l[key]=input.value;}if(key==='phase'){state.conductorRoutes=state.conductorRoutes.filter(r=>r.circuitId!==l.id);}}changed();});
$('loadRows').addEventListener('click',ev=>{const btn=ev.target.closest('[data-delete]');if(!btn)return;removeLine(btn.dataset.delete);});
function newId(){let i=1;while(state.lines.some(l=>l.id==='L'+i))i++;return 'L'+i}
function addLine(name='',power=null,extras={}){if(state.lines.length>=MAX_LINES)throw Error('Лимит в 400 линий');ensureV2(state);const id=newId(),source=SOURCES[extras.source]?extras.source:'manual',sourceRef=String(extras.sourceRef||'').slice(0,120);state.lines.push({id,name,power,phase:extras.phase||'',device:extras.device||'',modules:extras.modules||1,source,sourceRef});if(name||power!==null)state.loads.push({id:'LOAD-'+id,circuitId:id,name,powerKw:power,source,sourceRef});}
function parseLines(text){
 const out=[],rejected=[]; let lineno=0;
 for(const raw of String(text).split(/\r?\n/)){
   lineno++;const line=raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').trim();if(!line)continue;
   let match=line.match(/^(.+?)\s*[—–:;\t]\s*(\d+(?:[.,]\d+)?)\s*(?:кВт|kw|квт)?\s*$/i);
   if(!match)match=line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(?:кВт|kw|квт)\s*$/i);
   if(!match){rejected.push({line:lineno,text:line.slice(0,120)});continue;}
   const p=numeric(match[2]),name=match[1].trim();
   if(p!==null&&p>0&&p<=100000&&name.length>0&&name.length<=100)out.push({name,power:p,sourceLine:lineno});
   else rejected.push({line:lineno,text:line.slice(0,120)});
 }return {rows:out,rejected};
}
function showPending(text){
 const result=parseLines(text);pendingRows=result.rows;
 const holder=$('taskPreview');holder.replaceChildren();
 const heading=document.createElement('b');heading.textContent=`Распознано: ${result.rows.length}; пропущено: ${result.rejected.length}`;holder.appendChild(heading);
 for(const row of result.rows.slice(0,12)){const p=document.createElement('div');p.textContent=`• ${row.name} — ${row.power} кВт`;holder.appendChild(p);}
 if(result.rows.length>12){const p=document.createElement('p');p.textContent=`…ещё ${result.rows.length-12} строк`;holder.appendChild(p);}
 if(result.rejected.length){const p=document.createElement('p');p.className='muted';p.textContent='Нераспознанные строки (не добавлены): '+result.rejected.slice(0,3).map(x=>`${x.line}: ${x.text}`).join(' | ');holder.appendChild(p);}
 $('parseSummary').textContent='Требуется подтверждение распознанных строк.';
 return result.rows.length>0;
}
function commitPending(){
 if(!pendingRows.length){notify('Сначала распознайте текст',true);return false;}
 if(state.lines.length+pendingRows.length>MAX_LINES){notify('Максимум 400 линий на проект',true);return false;}
 checkpoint();for(const x of pendingRows)addLine(x.name,x.power,{source:'tz',sourceRef:'ТЗ, строка '+x.sourceLine});
 const n=pendingRows.length;pendingRows=[];changed();switchView('loads');notify(`Добавлено ${n} строк. Сверьте с исходным ТЗ.`);return true;
}
function renderBoard(){
 const board=$('boardCanvas');board.innerHTML='';$('boardTitle').textContent=state.title+' / компоновка';
 const layout=layoutSlots();
 layout.rails.forEach((slots,r)=>{
  const holder=document.createElement('div');holder.className='rail-group';const used=slots.filter(Boolean).length;
  holder.innerHTML=`<div class="rail-title"><b>DIN ${r+1}</b><span>${used} / ${state.railCapacity} мод.</span></div><div class="din-rail" style="--columns:${state.railCapacity}"></div>`;
  const rail=holder.querySelector('.din-rail');
  let col=0;
  while(col<slots.length){const slot=slots[col];
   if(!slot){const empty=document.createElement('span');empty.className='din-slot empty';empty.textContent='·';empty.setAttribute('aria-label','Свободный модуль');rail.appendChild(empty);col++;continue;}
   const l=slot.line;let width=0;while(col+width<slots.length&&slots[col+width]?.line.id===l.id)width++;
   const d=document.createElement('button');d.type='button';d.draggable=true;d.dataset.line=l.id;d.style.gridColumn=`span ${width}`;
   const visual=deviceAppearance(l);
   d.className='din-apparatus ep-real-device ep-'+visual.type+(l.id===selectedLine?' selected':'');d.setAttribute('aria-label',`Аппарат ${l.id}, ${l.name}, ${width} модулей`);
   d.title=`${l.name||'Групповая защита'} · ${l.device||'Аппарат не указан'} · ${width} мод.`;
   const boardId=l.shared?l.id:(l.apparatusId||state.branchDevices?.find(x=>x.circuitId===l.id)?.id);
   const modelLink=(state.boardBindingsV1||[]).find(x=>x.boardDeviceId===boardId);
   const mapped=modelLink?epBoardBindingsAuditV1(state,catalogDevice):null;
   d.dataset.apparatusId=boardId||'';
   d.dataset.topologyLink=modelLink?(mapped?.issues.some(x=>x.level==='BLOCKED'&&
    (x.id===boardId||x.boardDeviceId===boardId))?'stale':'declared'):'unbound';
   d.title+=' · Терминальная схема: '+(modelLink?'связана декларативно':'не связана');

   d.innerHTML='<span class="ep-terminal ep-terminal-top"></span><span class="ep-face"><span class="ep-brand">'+safeText(visual.maker)+'</span><span class="ep-series">'+safeText(visual.series)+'</span><span class="ep-rating">'+safeText(visual.mark)+'</span><span class="ep-rocker"><i></i></span><span class="ep-sku">'+safeText(visual.sku||l.id)+'</span><span class="ep-note">'+safeText(l.id)+'</span></span><span class="ep-terminal ep-terminal-bottom"></span>';
   rail.appendChild(d);col+=width;
  }
  board.appendChild(holder);
 });
 if(layout.unplaced.length){const warn=document.createElement('div');warn.className='board-unplaced';warn.textContent='Не размещено: '+layout.unplaced.map(x=>x.id).join(', ');board.appendChild(warn);}
 const catalogueIssues=catalogAudit(state).issues;
 const preflight=epEngineeringPreflight(state,catalogDevice,checkOverload);
 const items=[['Все аппараты помещаются на рейках',layout.unplaced.length===0],
  ['У всех линий указан аппарат',state.lines.every(l=>!!l.device)],
  ['Нет конфликтов артикула и необработанных изменений',catalogueIssues.length===0],
  ['Нет обнаруженных критических противоречий расчётов',preflight.counts.BLOCKED===0],
  ['Расчётная применимость не подтверждена (нужна инженерная проверка)',false],
  ['Геометрия корпуса и тепловой режим не подтверждены',false]];
 $('boardChecks').innerHTML=items.map(([label,yes])=>`<div class="check-line"><span class="${yes?'good':'bad'}">${yes?'●':'◆'}</span><span>${label}</span></div>`).join('');
 const l=state.lines.find(x=>x.id===selectedLine);const branch=l&&state.branchDevices?.find(b=>b.circuitId===l.id);const cat=l?catalogDevice(l.catalogSku):null;
 $('selectedDevice').innerHTML=l?`<div class="selected-info">${devicePreviewHtml(l)}<b>${safeText(l.id)} · ${safeText(l.name)}</b><div class="muted">Аппарат: ${safeText(branch?.id||'ID не назначен')}</div><div>${safeText(l.device||'Аппарат не указан')} / ${l.modules} мод.</div><label class="device-preset-label">Типовой аппарат (условная геометрия)<select id="devicePreset"><option value="">Выбрать шаблон…</option>${Object.entries(DEVICE_TEMPLATES).map(([key,val])=>`<option value="${key}" ${l.templateId===key?'selected':''}>${safeText(val.label)} · ${val.modules}M</option>`).join('')}</select></label>${catalogFilterControls()}<label class="device-preset-label">Конкретный артикул<select id="catalogSku">${catalogChoices(l.catalogSku,l.phase)}</select></label><div class="catalog-spec">${cat?'<strong>'+safeText(cat.maker+' · '+cat.series)+'</strong><small>Артикул '+safeText(cat.sku)+' · '+cat.poles+'P · '+cat.widthMm+' мм · '+cat.inA+' А · '+cat.curve+' · Icn '+cat.icnKa+' кА</small><small><a href="'+safeText(cat.source)+'" target="_blank" rel="noopener noreferrer">Источник характеристик ↗</a></small>':'Выберите конкретный артикул из каталога. Пока доступна одна позиция на производителя.'}</div>${faultLineInfo(l)}${l.calculationReview?.required?'<div class="ep-fault-status ep-fault-fail"><strong>ПОВТОРНАЯ ПРОВЕРКА</strong><span>Параметры цепи или аппарат изменены. Сохранённые расчёты требуют перепроверки.</span></div>':''}<div class="mini-actions"><button id="moveUp">← Раньше</button><button id="moveDown">Позже →</button></div><p class="muted">Перетащите аппарат на другой, чтобы поменять порядок. Можно использовать кнопки.</p></div>`:'Выберите аппарат на рейке. Перемещение возможно мышью или кнопками.';
}
$('boardCanvas').addEventListener('click',e=>{const b=e.target.closest('[data-line]');if(!b)return;selectedLine=b.dataset.line;renderBoard();renderCircuitGraph();renderEngineeringDiagnosticsV1();});
$('boardCanvas').addEventListener('dragstart',e=>{const b=e.target.closest('[data-line]');if(!b)return;dragLineId=b.dataset.line;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragLineId);});
$('boardCanvas').addEventListener('dragover',e=>{const b=e.target.closest('[data-line]');if(!b||!dragLineId||b.dataset.line===dragLineId)return;e.preventDefault();e.dataTransfer.dropEffect='move';});
$('boardCanvas').addEventListener('drop',e=>{const b=e.target.closest('[data-line]');if(!b||!dragLineId)return;e.preventDefault();const id=dragLineId;dragLineId=null;reorderLine(id,b.dataset.line);});
$('boardCanvas').addEventListener('dragend',()=>{dragLineId=null;});
$('selectedDevice').addEventListener('change',e=>{
 if(e.target.id==='catalogMaker'){catalogMakerFilter=e.target.value;catalogSeriesFilter='';renderBoard();return;}
 if(e.target.id==='catalogSeries'){catalogSeriesFilter=e.target.value;renderBoard();return;}
 if(e.target.id==='devicePreset'&&selectedLine&&e.target.value){applyDeviceTemplate(selectedLine,e.target.value);notify('Шаблон применён. Характеристики не подтверждены.');}
 if(e.target.id==='catalogSku'&&selectedLine&&e.target.value){
  try{const draft=structuredCloneCompat(ensureV2(state));const dev=applyCatalogueSku(draft,selectedLine,e.target.value);checkpoint();state=draft;changed();notify('Выбран '+dev.maker+' / '+dev.sku+'. Расчёт защиты не подтверждён.');}
  catch(err){notify(err.message,true);renderBoard();}
 }});
$('selectedDevice').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!selectedLine||!['moveUp','moveDown'].includes(b.id))return;const idx=state.lines.findIndex(x=>x.id===selectedLine),direction=b.id==='moveUp'?-1:1,to=idx+direction;if(to<0||to>=state.lines.length)return;reorderLine(selectedLine,state.lines[to].id);});
function renderIssues(){$('documentIssues').innerHTML=issues().map(x=>`<div class="issue">◆ ${safeText(x)}</div>`).join('');}
function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
const baseName=()=>state.title.replace(/[^\p{L}\p{N}_-]+/gu,'_').slice(0,45)||'electropanel';
function saveProject(){download(baseName()+'.json',JSON.stringify(state,null,2),'application/json;charset=utf-8');notify('Проект сохранён в JSON.');}
function csv(){const header=['ID','Наименование','Мощность кВт','Фаза','Аппарат','Модули'], rows=state.lines.map(l=>[l.id,l.name,l.power??'',l.phase,l.device,l.modules]);const esc=v=>{const raw=String(v??'');const safe=/^\s*[=+@\t\r]/.test(raw)?'\''+raw:raw;return '"'+safe.replaceAll('"','""')+'"';};return '\uFEFF'+[header,...rows].map(r=>r.map(esc).join(';')).join('\r\n');}
function draftEquipment(){
 const grouped=new Map();
 for(const l of equipmentEntries(state)){
  const name=(l.device||'НЕ ВЫБРАН').trim(),width=l.modules,key=JSON.stringify([name,width]);
  const row=grouped.get(key)||{name,modules:width,quantity:0};row.quantity++;grouped.set(key,row);
 }
 return [...grouped.values()].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
}
function equipmentCsv(){
 const escapeCsv=v=>{const raw=String(v??'');const safe=/^\s*[=+@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"';};
 const rows=[['Условное обозначение','Модулей на аппарат','Количество','Модулей всего'],...draftEquipment().map(x=>[x.name,x.modules,x.quantity,x.modules*x.quantity])];
 return '\uFEFF'+rows.map(r=>r.map(escapeCsv).join(';')).join('\r\n');
}
function exportSvg(){
 const unit=38,left=80,top=105,height=state.railCount*151+125,w=Math.max(820,160+unit*state.railCapacity);
 const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">`,
 `<rect width="100%" height="100%" fill="#f8fafb"/>`,
 `<text x="${left}" y="47" font-family="Arial" font-size="22" font-weight="bold" fill="#1b303b">${escapeXml(state.title)}</text>`,
 `<text x="${left}" y="70" font-family="Arial" font-size="11" fill="#7b8791">КОМПОНОВКА / ЧЕРНОВОЙ ОБЗОР, НЕ МОНТАЖНАЯ СХЕМА</text>`];
 const layout=layoutSlots();
 layout.rails.forEach((slots,r)=>{const y=top+r*151;
  parts.push(`<text x="18" y="${y+48}" font-family="Arial" font-size="12" fill="#697e88">DIN ${r+1}</text><rect x="${left-5}" y="${y+29}" width="${state.railCapacity*unit+10}" height="66" fill="#d5dee3" rx="3"/>`);
  let col=0;
  while(col<slots.length){const slot=slots[col],x=left+col*unit;
   if(!slot){parts.push(`<rect x="${x}" y="${y+15}" width="${unit-2}" height="95" rx="3" fill="#edf1f2" stroke="#cbd5da"/>`);col++;continue;}
   const line=slot.line;let span=0;while(col+span<slots.length&&slots[col+span]?.line.id===line.id)span++;
   parts.push(`<rect x="${x}" y="${y+15}" width="${span*unit-2}" height="95" rx="5" fill="#f9f8f4" stroke="#aab9bc"/>`);
   for(let i=0;i<span;i++){const leverX=x+i*unit+Math.round(unit/2)-5;parts.push(`<rect x="${leverX}" y="${y+50}" width="10" height="24" rx="2" fill="#485e67"/><rect x="${leverX}" y="${y+50}" width="10" height="6" fill="#ed6b42"/>`);}
   parts.push(`<text x="${x+5}" y="${y+32}" font-family="Arial" font-size="10" font-weight="bold" fill="#344851">${escapeXml(line.id.slice(0,18))}</text><text x="${x+5}" y="${y+100}" font-family="Arial" font-size="10" fill="#344851">${escapeXml((line.device||'—').slice(0,20))} · ${span}M</text>`);
   col+=span;
  }
 });
 if(layout.unplaced.length)parts.push(`<text x="${left}" y="${height-43}" font-size="12" fill="#b23528">НЕ РАЗМЕЩЕНО: ${escapeXml(layout.unplaced.map(x=>x.id).join(', '))}</text>`);
 parts.push(`<text x="${left}" y="${height-20}" font-family="Arial" font-size="11" fill="#88979f">Черновик. Данные оборудования не подтверждены. Требуется инженерная проверка.</text></svg>`);
 download(baseName()+'_layout.svg',parts.join(''),'image/svg+xml;charset=utf-8');
}
function escapeXml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function showLegacyImportReport(inspection,layout){
 const dialog=document.createElement('dialog');dialog.className='ep-legacy-dialog';
 const heading=document.createElement('h2');heading.textContent='Старый Electropanel · проверка совместимости';
 const text=document.createElement('p');
 text.textContent='Файл старой версии распознан, но не заменяет текущий проект. Реек: '+inspection.counts.rails+
  ', аппаратов: '+inspection.counts.devices+', проводов: '+inspection.counts.wires+
  '. Занято: '+layout.occupied_modules+' из '+layout.total_modules+' модулей.';
 const warning=document.createElement('p');warning.className='ep-legacy-warning';
 warning.textContent='Автоматическое преобразование заблокировано: физические аппараты и связи старого Studio нельзя без проверки выдавать за цепи нового проекта.';
 const list=document.createElement('ul');
 const all=[...inspection.issues,...layout.problems.map(x=>x.code+': '+x.device_id+
  (x.other_device_id?' ↔ '+x.other_device_id:'')+(x.module?' · модуль '+x.module:''))];
 if(!all.length)all.push('Структурных ошибок не выявлено. Инженерная пригодность НЕ подтверждена.');
 for(const detail of all.slice(0,100)){const li=document.createElement('li');li.textContent=detail;list.append(li);}
 const buttons=document.createElement('div');buttons.className='ep-legacy-actions';
 const exportBtn=document.createElement('button');exportBtn.type='button';exportBtn.textContent='Сохранить отчёт JSON';
 exportBtn.onclick=()=>download('electropanel_legacy_compatibility_report.json',
  JSON.stringify({inspection,layout,engineeringApproved:false},null,2),'application/json;charset=utf-8');
 const close=document.createElement('button');close.type='button';close.textContent='Закрыть';
 close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 buttons.append(exportBtn,close);dialog.append(heading,text,warning,list,buttons);
 document.body.append(dialog);dialog.showModal();
}
function normalizeRoute44Import(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Трасса должна быть JSON-объектом');
 const fields=['model','route_length_verified','source_impedance_verified','route_length_m',
  'source_r_ohm','source_x_ohm','minimum_voltage_factor',
  'ia_a_at_required_disconnection_time','trip_curve_source_verified',
  'disconnection_time_limit_verified','voltage_drop_phase',
  'neutral_conductor_confirmed_equivalent','power_factor','max_drop_percent',
  'phase_conductor','pe_conductor'];
 const cfields=['resistance_reference_temperature_c','data_source_verified',
  'r20_ohm_per_km','alpha_per_c','operating_temperature_c','x_ohm_per_km'];
 if(Object.keys(value).some(x=>!fields.includes(x)))throw Error('Неизвестное поле трассы');
 const copy={};
 const safe=x=>typeof x==='boolean'||typeof x==='number'&&Number.isFinite(x)||
  typeof x==='string'&&x.length<=100;
 for(const key of fields)if(value[key]!==undefined){
  const val=value[key];
  if(['phase_conductor','pe_conductor'].includes(key)){
   if(!val||typeof val!=='object'||Array.isArray(val)||
    Object.keys(val).some(k=>!cfields.includes(k)))throw Error('Неверная запись проводника');
   copy[key]={};
   for(const [k,x] of Object.entries(val)){
    if(!safe(x))throw Error('Неверные параметры проводника');
    copy[key][k]=x;
   }
  }else{
   if(!safe(val))throw Error('Некорректное значение трассы '+key);
   copy[key]=val;
  }
 }
 return copy;
}
function normalizeDevice19Import(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ожидается JSON-объект аппаратов');
 const fields={
  devices:['id','kind','poles','evidence'],
  terminals:['id','device_id','conductor'],
  internal_links:['id','device_id','from','to','state','gang_id'],
  wires:['id','from','to'],
  neutral_zones:['id','terminals']
 };
 if(Object.keys(value).some(k=>!Object.hasOwn(fields,k)))throw Error('Неизвестная группа аппаратов');
 const input={};
 for(const [group,allowed] of Object.entries(fields)){
  const rows=value[group]??[];
  if(!Array.isArray(rows)||rows.length>1000)throw Error('Превышено число объектов '+group);
  input[group]=rows.map(row=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||
    Object.keys(row).some(k=>!allowed.includes(k)))throw Error('Неизвестные поля '+group);
   const clean={};
   for(const [key,v] of Object.entries(row)){
    if(group==='devices'&&key==='evidence'){
     if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Некорректные сведения изготовителя');
     const keys=['manufacturer','model','document_id','revision','source_url','sha256'];
     if(Object.keys(v).some(k=>!keys.includes(k)))throw Error('Неизвестное поле паспорта');
     clean.evidence={};
     for(const [k,text] of Object.entries(v)){
      if(typeof text!=='string'||text.length>400)throw Error('Повреждённый реквизит паспорта');
      clean.evidence[k]=text;
     }
    }else if(group==='devices'&&key==='poles'){
     if(!Number.isInteger(v)||v<0||v>10)throw Error('Число полюсов должно быть целым');
     clean[key]=v;
    }else if(group==='neutral_zones'&&key==='terminals'){
     if(!Array.isArray(v)||v.length>1000||v.some(x=>typeof x!=='string'||x.length>128))
      throw Error('Неверный список клемм нейтрали');
     clean[key]=v.slice();
    }else {
     if(typeof v!=='string'||v.length>128)throw Error('Некорректное значение '+group+'.'+key);
     clean[key]=v;
    }
   }
   return clean;
  });
 }
 if(JSON.stringify(input).length>100000)throw Error('Слишком большой набор аппаратов');
 return input;
}
function normalizeWiring18Import(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Wiring must be JSON object');
 const groups=['terminals','wires','internal_links','sources','loads'];
 const allowed={
  terminals:['id','device_id','conductor'],
  wires:['id','from','to'],internal_links:['id','device_id','from','to','state'],
  sources:['terminal','conductor'],loads:['id','terminal','conductor']
 };
 if(Object.keys(value).some(k=>!groups.includes(k)))throw Error('Неподдерживаемое поле терминальной модели');
 const out={};
 for(const group of groups){
  const list=value[group]??[];
  if(!Array.isArray(list)||list.length>1000)throw Error('Превышен лимит элементов '+group);
  out[group]=list.map((row)=>{
   if(!row||typeof row!=='object'||Array.isArray(row)||
    Object.keys(row).some(k=>!allowed[group].includes(k)))throw Error('Неизвестные поля '+group);
   const entry={};
   for(const [key,v] of Object.entries(row)){
    if(typeof v!=='string'||v.length>128)throw Error('Некорректные данные '+group+'.'+key);
    entry[key]=v;
   }
   return entry;
  });
 }
 if(JSON.stringify(out).length>100000)throw Error('Терминальная схема слишком большая');
 return out;
}
function normalizeLV43Import(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Расчёт TN должен быть JSON-объектом');
 const fields={scope:['installation_category','voltage_system','supply_architecture','special_installation'],
  voltage_drop:['method','phase_configuration','conductor_temperature_verified','total_route_verified',
   'r_ohm_per_conductor','x_ohm_per_conductor','power_factor','design_voltage_v','max_drop_percent'],
  tn_disconnection:['earthing_system','source_impedance_included','temperature_basis_checked',
   'disconnection_time_limit_verified','trip_curve_source_verified','u0_v','zs_ohm',
   'ia_a_at_required_disconnection_time','minimum_voltage_factor']};
 const allowed=[...Object.keys(fields),'design_current_a'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Неизвестные поля расчёта TN');
 const result={};
 for(const [key,keys] of Object.entries(fields)){
  if(!value[key]||typeof value[key]!=='object'||Array.isArray(value[key]))throw Error('Отсутствует раздел '+key);
  if(Object.keys(value[key]).some(k=>!keys.includes(k)))throw Error('Неизвестные параметры '+key);
  const out={};
  for(const prop of keys)if(value[key][prop]!==undefined){
   const v=value[key][prop];
   if(typeof v==='string'&&v.length<=100||typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')
    out[prop]=v;
   else throw Error('Некорректный параметр '+key+'.'+prop);
  }
  result[key]=out;
 }
 return result;
}
function normalizeV30Import(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Расширенная проверка должна быть JSON-объектом');
 const allowed=['ib_a','in_a','base_iz_a','i2_a','factors','evidence'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))throw Error('Неизвестное поле расширенной проверки');
 const scalar=v=>(v===null||typeof v==='string'&&v.length<=80||typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean');
 const out={};
 for(const key of ['ib_a','in_a','base_iz_a','i2_a']){
  if(value[key]!==undefined){if(!scalar(value[key]))throw Error('Недопустимое значение '+key);out[key]=value[key];}
 }
 if(value.factors!==undefined){
  if(!Array.isArray(value.factors)||value.factors.length>32)throw Error('Коэффициентов должно быть не более 32');
  out.factors=value.factors.map(f=>{
   if(!f||typeof f!=='object'||typeof f.name!=='string'||f.name.length>80||!scalar(f.value))
    throw Error('Некорректная запись коэффициента');
   return {name:f.name,value:f.value};
  });
 }
 if(value.evidence!==undefined){
  if(!value.evidence||typeof value.evidence!=='object'||Array.isArray(value.evidence)||
    Object.keys(value.evidence).some(k=>!EP_V30_EVIDENCE.includes(k)))
   throw Error('Неизвестные поля источников расширенной проверки');
  out.evidence={};
  for(const key of EP_V30_EVIDENCE)if(value.evidence[key]!==undefined){
   if(typeof value.evidence[key]!=='string'||value.evidence[key].length>400)
    throw Error('Недопустимое описание источника');
   out.evidence[key]=value.evidence[key];
  }
 }
 return out;
}
function normalizeFaultImport(value){
 if(!value||typeof value!=='object'||typeof value.ikKa!=='string'||epParsePositiveCurrentKa(value.ikKa)===null)
  throw Error('Некорректное значение ожидаемого тока КЗ в импортируемом проекте');
 if(value.source!==undefined&&typeof value.source!=='string')
  throw Error('Некорректное происхождение тока КЗ в импортируемом проекте');
 if(typeof value.source==='string'&&value.source.length>200)
  throw Error('Слишком длинное описание источника тока КЗ');
 return {ikKa:value.ikKa,source:value.source||''};
}
function normalizeImport(x){if(!x||!['electropanel.web.preview.1',PROJECT_SCHEMA].includes(x.schema)||!Array.isArray(x.lines)||x.lines.length>400)throw Error('Неподдерживаемый формат проекта');const p=initial();p.title=String(x.title||'Проект').slice(0,80);p.earthing=['UNKNOWN','TN-S','TN-C-S','TT'].includes(x.earthing)?x.earthing:'UNKNOWN';p.railCapacity=Number.isInteger(x.railCapacity)&&x.railCapacity>=6&&x.railCapacity<=72?x.railCapacity:12;p.railCount=Number.isInteger(x.railCount)&&x.railCount>=1&&x.railCount<=8?x.railCount:2;if(x.ttContext!==undefined)p.ttContext=epNormalizeTTContext(x.ttContext);if(x.wiringModelV18!==undefined)p.wiringModelV18=normalizeWiring18Import(x.wiringModelV18);if(x.deviceModelV19!==undefined)p.deviceModelV19=normalizeDevice19Import(x.deviceModelV19);if(x.boardBindingsV1!==undefined)p.boardBindingsV1=epNormalizeBoardBindingsV1(x.boardBindingsV1);if(x.endpointBindingsV1!==undefined)p.endpointBindingsV1=epNormalizeEndpointBindingsV1(x.endpointBindingsV1);const ids=new Set();p.lines=x.lines.map((l,i)=>{const id=String(l.id||'L'+(i+1));if(id.trim()!==id||!/^[\p{L}\p{N}_ -]{1,40}$/u.test(id))throw Error('Некорректный ID линии');if(ids.has(id))throw Error('Повтор ID линии');ids.add(id);const power=numeric(l.power);const modules=Number(l.modules);if(power!==null&&(power<0||power>100000))throw Error('Некорректная мощность');if(!Number.isInteger(modules)||modules<1||modules>12)throw Error('Некорректное число модулей');return{id,name:String(l.name||'').slice(0,100),power,phase:['','L1','L2','L3','3Ф'].includes(l.phase)?l.phase:'',device:String(l.device||'').slice(0,25),modules,source:SOURCES[l.source]?l.source:'unknown',sourceRef:String(l.sourceRef||'').slice(0,120),...(l.overloadInput&&typeof l.overloadInput==='object'?{overloadInput:Object.fromEntries(['ibA','inA','izA','i2A'].map(k=>[k,String(l.overloadInput[k]??'').slice(0,30)]))}:{}),...(l.faultInput!==undefined?{faultInput:normalizeFaultImport(l.faultInput)}:{}),...(l.overloadV30!==undefined?{overloadV30:normalizeV30Import(l.overloadV30)}:{}),...(l.lv43Input!==undefined?{lv43Input:normalizeLV43Import(l.lv43Input)}:{}),...(l.route44Input!==undefined?{route44Input:normalizeRoute44Import(l.route44Input)}:{}),...(l.calculationReview&&l.calculationReview.required===true?{calculationReview:{required:true,reason:typeof l.calculationReview.reason==='string'&&l.calculationReview.reason.length<=40?l.calculationReview.reason:'IMPORTED_REVIEW_REQUIRED',pending:Array.isArray(l.calculationReview.pending)?[...new Set(l.calculationReview.pending.filter(k=>REVIEW_FIELDS.includes(k)))]:REVIEW_FIELDS.filter(k=>!!l[k])}}:{}),...(typeof l.templateId==='string'&&DEVICE_TEMPLATES[l.templateId]?{templateId:l.templateId}:{}),...(typeof l.catalogSku==='string'&&l.catalogSku.length<=100?{catalogSku:l.catalogSku}:{})};});p.plan=null;
 if(x.plan&&typeof x.plan.name==='string'){
  const mime=String(x.plan.mime||'').slice(0,80);
  p.plan={name:x.plan.name.slice(0,120),mime};
  if(typeof x.plan.dataUrl==='string'&&x.plan.dataUrl.length<1_500_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(x.plan.dataUrl)&&['image/png','image/jpeg','image/webp'].includes(mime))p.plan.dataUrl=x.plan.dataUrl;
 }
 if(x.schema===PROJECT_SCHEMA){
  if(!Array.isArray(x.loads)||!Array.isArray(x.sharedDevices))throw Error('Файл новой версии не содержит модель потребителей или аппаратов');
  p.schema=PROJECT_SCHEMA;
  p.loads=x.loads.map(l=>({id:l.id,circuitId:l.circuitId,name:l.name,powerKw:l.powerKw,source:SOURCES[l.source]?l.source:'unknown',sourceRef:String(l.sourceRef||'').slice(0,120)}));
  p.sharedDevices=x.sharedDevices.map(d=>({id:d.id,templateId:d.templateId,label:d.label,modules:d.modules,circuitIds:d.circuitIds}));
  if(x.groupInputVersion===undefined&&Array.isArray(x.groupInputLinks)&&x.groupInputLinks.length)throw Error('Не указана версия вводов групповых УЗО');
  if(x.groupInputVersion!==undefined){if(x.groupInputVersion!==1||!Array.isArray(x.groupInputLinks))throw Error('Неподдерживаемая версия вводов групповых УЗО');p.groupInputLinks=x.groupInputLinks.map(f=>({id:f.id,groupId:f.groupId,kind:f.kind,from:f.from,to:f.to,origin:f.origin}));p.groupInputVersion=1;}
  if(x.wiringVersion===undefined&&Array.isArray(x.conductorRoutes)&&x.conductorRoutes.length)throw Error('У маршрутов проводников отсутствует номер версии');
  if(x.wiringVersion!==undefined){if(x.wiringVersion!==1||!Array.isArray(x.conductorRoutes))throw Error('Неподдерживаемая версия проводников');p.conductorRoutes=x.conductorRoutes.map(r=>({circuitId:r.circuitId,branchDeviceId:r.branchDeviceId,phaseConductors:r.phaseConductors,neutralBus:r.neutralBus,protectiveBus:r.protectiveBus,origin:r.origin}));p.wiringVersion=1;}
  if(x.terminalVersion===undefined&&Array.isArray(x.terminalLinks)&&x.terminalLinks.length)throw Error('У контактных деклараций нет номера версии');
  if(x.terminalVersion!==undefined){if(x.terminalVersion!==1||!Array.isArray(x.terminalLinks))throw Error('Неподдерживаемая версия контактных деклараций');p.terminalLinks=x.terminalLinks.map(l=>({id:l.id,loadId:l.loadId,circuitId:l.circuitId,kind:l.kind,from:l.from,to:l.to,origin:l.origin}));p.terminalVersion=1;}
  if(x.feedVersion===undefined&&Array.isArray(x.feedLinks)&&x.feedLinks.length)throw Error('У питающих связей отсутствует версия');
  if(x.feedVersion!==undefined){if(x.feedVersion!==1||!Array.isArray(x.feedLinks))throw Error('Неподдерживаемая версия питающих связей');p.feedLinks=x.feedLinks.map(f=>({id:f.id,circuitId:f.circuitId,kind:f.kind,from:f.from,to:f.to,origin:f.origin}));p.feedVersion=1;}
  if(x.branchModelVersion===1){if(!Array.isArray(x.branchDevices))throw Error('Повреждён список отходящих аппаратов');p.branchDevices=x.branchDevices.map(d=>({id:d.id,circuitId:d.circuitId,label:d.label,modules:d.modules,templateId:d.templateId??null}));p.branchModelVersion=1;}
 }else migrateLegacyEntities(p);
 ensureV2(p);
 return p;}
function parseCSV(text){
 // RFC 4180-style quoted fields, including line breaks in quoted text.
 const t=String(text).replace(/^\uFEFF/,'');if(t.length>1_000_000)throw Error('CSV превышает допустимый размер');
 const first=t.split(/\r?\n/,1)[0],sep=first.includes(';')?';':',';
 const rows=[],row=[];let field='',quoted=false,atFieldStart=true;
 for(let i=0;i<t.length;i++){
  const c=t[i];
  if(quoted){if(c==='"'&&t[i+1]==='"'){field+='"';i++;}else if(c==='"'){quoted=false;}else field+=c;}
  else if(c==='"'&&atFieldStart){quoted=true;atFieldStart=false;}
  else if(c===sep){row.push(field);field='';atFieldStart=true;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row.slice());row.length=0;field='';atFieldStart=true;}
  else if(c==='"')throw Error('Некорректная кавычка в CSV');
  else{field+=c;atFieldStart=false;}
 }
 if(quoted)throw Error('Незакрытая кавычка в CSV');row.push(field);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length>401)throw Error('Слишком много строк CSV');if(!rows.length)return [];
 const head=rows[0].map(x=>x.trim().toLowerCase());
 const own=head.includes('id')&&head.some(x=>x.includes('наименование'))&&head.some(x=>x.includes('мощность'));
 if(own){rows.shift();return rows.map((raw,i)=>{
  const r=raw.map(x=>x.trim());if(r.length!==6)throw Error(`Строка ${i+2}: ожидается 6 столбцов`);
  const p=numeric(r[2]),m=Number(r[5]);if(!r[1]||p===null||p<=0||p>100000||!Number.isInteger(m)||m<1||m>12)throw Error(`Строка ${i+2}: некорректная мощность или ширина`);
  if(!['','L1','L2','L3','3Ф'].includes(r[3]))throw Error(`Строка ${i+2}: неизвестная фаза`);
  return{name:r[1].slice(0,100),power:p,phase:r[3],device:r[4].slice(0,25),modules:m,source:'csv'};
 });}
 if(/мощность|наименование|power|name/i.test(rows[0].join(' ')))rows.shift();
 return rows.map((r,i)=>{if(r.length!==2)throw Error(`Строка ${i+1}: для простого CSV требуется 2 столбца`);const p=numeric(r[1].trim());const name=r[0].trim();if(!name||p===null||p<=0||p>100000)throw Error(`Строка ${i+1}: требуется имя и положительная мощность`);return {name:name.slice(0,100),power:p,source:'csv'};});
}

$('nav').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)switchView(b.dataset.view);});
$('circuitGraph').addEventListener('click',e=>{const btn=e.target.closest('[data-open-circuit]');if(!btn)return;selectedLine=btn.dataset.openCircuit;switchView('loads');});
$('menuToggle').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('open'));
$('startManual').onclick=$('manualCard').onclick=()=>switchView('loads');$('loadDemo').onclick=()=>{if(state.lines.length&&!confirm('Заменить текущий проект примером квартиры?'))return;checkpoint();if(planPreviewUrl){URL.revokeObjectURL(planPreviewUrl);planPreviewUrl=null;}state=demo();selectedLine=null;changed();switchView('loads');notify('Открыт демонстрационный проект. Данные условные.');};
$('pasteTask').onclick=()=>{$('taskModal').classList.remove('hidden');$('taskText').focus();showPending($('taskText').value);};$('closeModal').onclick=()=>$('taskModal').classList.add('hidden');$('taskModal').addEventListener('click',e=>{if(e.target===$('taskModal'))$('taskModal').classList.add('hidden');});$('taskText').addEventListener('input',e=>showPending(e.target.value));
$('confirmParse').onclick=()=>{showPending($('taskText').value);if(commitPending())$('taskModal').classList.add('hidden');};
$('parseTextBtn').onclick=()=>{$('taskModal').classList.remove('hidden');$('taskText').value=$('quickText').value;showPending($('taskText').value);};
$('addRowBtn').onclick=()=>{try{checkpoint();addLine();changed();}catch(e){notify(e.message,true);}};
$('projectName').addEventListener('change',e=>{checkpoint();state.title=e.target.value.slice(0,80);changed();});$('earthing').addEventListener('change',e=>{checkpoint();state.earthing=e.target.value;changed();});for(const key of ['railCapacity','railCount'])$(key).addEventListener('change',e=>{const n=Number(e.target.value),min=key==='railCount'?1:6,max=key==='railCount'?8:72;if(!Number.isInteger(n)||n<min||n>max){notify('Недопустимое значение',true);render();return;}checkpoint();state[key]=n;changed();});
$('currentLine').addEventListener('change',renderCurrentCheck);$('runCurrentCheck').onclick=saveCurrentCheck;$('saveV30Check').onclick=saveV30Check;$('saveTTContext').onclick=saveTTContext;$('verifyCableSource').onclick=verifyCableSourceFile;$('assessCable31').onclick=assessCable31FromUI;$('ref39Run').onclick=runReference39;$('lv43Run').onclick=runLV43;$('lv43SaveLine').onclick=saveLV43ToLine;$('route44Save').onclick=saveRoute44;$('wiring18Check').onclick=()=>checkWiring18(false);$('wiring18Save').onclick=()=>checkWiring18(true);$('device19Check').onclick=()=>checkDevice19(false);$('device19Save').onclick=()=>checkDevice19(true);$('bindingSave').onclick=saveBoardBindingV1;$('bindingClear').onclick=clearBoardBindingV1;$('endpointSave').onclick=saveEndpointBindingV1;$('endpointClear').onclick=clearEndpointBindingV1;$('endpointSymbolicRef').onchange=renderEndpointBridgeV1;
$('loadCommercial').onclick=()=>{if(state.lines.length&&!confirm('Заменить текущий проект коммерческим примером?'))return;checkpoint();if(planPreviewUrl){URL.revokeObjectURL(planPreviewUrl);planPreviewUrl=null;}state=demoCommercial();selectedLine=null;changed();switchView('loads');notify('Открыт учебный коммерческий пример.');};
$('saveProjectBtn').onclick=$('saveProjectBtn2').onclick=saveProject;$('exportCsvBtn').onclick=()=>download(baseName()+'_loads.csv',csv(),'text/csv;charset=utf-8');$('exportSvgBtn').onclick=$('exportSvgBtn2').onclick=exportSvg;$('exportEquipmentBtn').onclick=()=>download(baseName()+'_equipment_draft.csv',equipmentCsv(),'text/csv;charset=utf-8');
$('exportAuditBtn').onclick=()=>download(baseName()+'_audit.json',JSON.stringify({project:state.title,audit:projectAudit(),generatedAt:new Date().toISOString()},null,2),'application/json;charset=utf-8');
$('exportIssuesBtn').onclick=()=>download(baseName()+'_issues.txt',[state.title,'ИНЖЕНЕРНЫЕ ЗАМЕЧАНИЯ (ЧЕРНОВИК)',...issues().map((x,i)=>`${i+1}. ${x}`)].join('\n'),'text/plain;charset=utf-8');
$('importProjectBtn').onclick=()=>$('projectFile').click();$('projectFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Файл слишком большой');const raw=JSON.parse(await file.text());const legacy=epInspectLegacyPanel(raw);
 if(legacy.recognized){
  const oldLayout=epLegacyLayoutCapacity(raw);
  showLegacyImportReport(legacy,oldLayout);
  throw Error('Обнаружен проект прежнего Studio: '+legacy.counts.devices+' аппаратов, '+legacy.counts.rails+' реек, '+legacy.counts.wires+' проводников. DIN занято '+oldLayout.occupied_modules+'/'+oldLayout.total_modules+', коллизий/выходов: '+oldLayout.problems.length+'. Автоперенос заблокирован, чтобы не потерять расчёты и связи. '+(legacy.issues.length?'Ошибки: '+legacy.issues.slice(0,2).join('; '):'Файл распознан для дальнейшего сопоставления.'));
 }
 const loaded=normalizeImport(raw);if(planPreviewUrl){URL.revokeObjectURL(planPreviewUrl);planPreviewUrl=null;}checkpoint();state=loaded;selectedLine=null;changed();switchView('loads');notify('Проект открыт');}catch(err){notify('Ошибка файла: '+err.message,true);}e.target.value='';});
$('csvImportBtn').onclick=()=>$('csvFile').click();$('csvFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1_000_000)throw Error('Файл слишком большой');const rows=parseCSV(await f.text());if(!rows.length)throw Error('Не найдены строки с мощностью');if(state.lines.length+rows.length>MAX_LINES)throw Error('Превышен лимит 400 линий');checkpoint();rows.forEach((l,i)=>addLine(l.name,l.power,{...l,sourceRef:f.name+' · запись '+(i+1)}));changed();notify('Импортировано строк: '+rows.length);}catch(err){notify(err.message,true);}e.target.value='';});
$('uploadPlan').onclick=()=>$('planFile').click();$('planFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;
 try{
  if(f.size>15_000_000)throw Error('Максимальный размер плана — 15 МБ');
  const isImage=['image/png','image/jpeg','image/webp'].includes(f.type);
  if(!isImage&&f.type!=='application/pdf')throw Error('Поддерживаются PDF, PNG, JPG и WebP. SVG исключён из соображений безопасности.');
  const plan={name:f.name.slice(0,120),mime:f.type};
  if(isImage&&f.size<=950_000){
   plan.dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Не удалось прочитать файл'));reader.readAsDataURL(f);});
   if(!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(plan.dataUrl))throw Error('Неверные данные изображения');
  }
  if(planPreviewUrl)URL.revokeObjectURL(planPreviewUrl);
  planPreviewUrl=URL.createObjectURL(f);checkpoint();state.plan=plan;changed();
  notify(plan.dataUrl?'Подложка встроена в JSON проекта.':'Подложка доступна только в текущей сессии: файл слишком большой или является PDF.');
 }catch(err){notify(err.message,true);}finally{e.target.value='';}
});

$('undoBtn').onclick=()=>restoreHistory(historyUndo,historyRedo);
$('redoBtn').onclick=()=>restoreHistory(historyRedo,historyUndo);
$('taskFileBtn').onclick=()=>$('taskFile').click();
$('taskFile').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>250_000)throw Error('ТЗ слишком большое (максимум 250 КБ)');const text=await f.text();$('taskText').value=text;$('taskModal').classList.remove('hidden');showPending(text);notify('Текст загружен. Проверьте извлечённые строки.');}catch(err){notify(err.message,true);}e.target.value='';});
$('consumerEditor').addEventListener('change',e=>{if(e.target.id==='consumerCircuit'){selectedLine=e.target.value;renderConsumers();}});
$('consumerEditor').addEventListener('click',e=>{
 const save=e.target.closest('[data-save-consumer]');if(save){
  const id=save.dataset.saveConsumer;
  const name=[...$('consumerEditor').querySelectorAll('[data-consumer-name]')].find(x=>x.dataset.consumerName===id)?.value;
  const powerRaw=[...$('consumerEditor').querySelectorAll('[data-consumer-power]')].find(x=>x.dataset.consumerPower===id)?.value;
  const power=numeric(powerRaw);
  if(power===null||power<=0||!name?.trim()){notify('Укажите название и положительную мощность',true);return;}
  try{const draft=structuredCloneCompat(ensureV2(state));editConsumerIn(draft,id,name,power);checkpoint();state.loads=draft.loads;state.lines=draft.lines;changed();notify('Потребитель обновлён. Источник помечен как ручная корректировка.');}catch(err){notify(err.message,true);}return;
 }
 const remove=e.target.closest('[data-remove-consumer]');if(remove){checkpoint();removeConsumerFrom(ensureV2(state),remove.dataset.removeConsumer);changed();return;}
 if(e.target.id!=='addConsumerBtn')return;
 const name=$('consumerName').value.trim(),p=numeric($('consumerPower').value);
 try{if(p===null)throw Error('Введите положительную мощность');const draft=structuredCloneCompat(ensureV2(state));addConsumerTo(draft,selectedLine,name,p);checkpoint();state.loads=draft.loads;state.lines=draft.lines;changed();}catch(err){notify(err.message,true);}
});
$('sharedDeviceEditor').addEventListener('click',e=>{
 const remove=e.target.closest('[data-remove-rcd]');if(remove){checkpoint();removeSharedDeviceFrom(ensureV2(state),remove.dataset.removeRcd);changed();return;}
 if(e.target.id!=='addRcdBtn')return;
 const ids=[...document.querySelectorAll('[data-rcd-circuit]:checked')].map(x=>x.dataset.rcdCircuit);
 try{const draft=JSON.parse(JSON.stringify(ensureV2(state)));addSharedRCDTo(draft,$('sharedRcdType').value,$('sharedRcdLabel').value.trim(),ids);checkpoint();state.sharedDevices=draft.sharedDevices;changed();notify('Общее УЗО добавлено как черновая логическая группа');}catch(err){notify(err.message,true);}
});
$('exportGraphSvgBtn').onclick=()=>download(baseName()+'_logical_graph.svg',graphSvg(state),'image/svg+xml;charset=utf-8');
$('conductorEditor').addEventListener('click',e=>{
 const peBtn=e.target.closest('[data-confirm-pe]');
 if(peBtn){try{const id=peBtn.dataset.confirmPe;const current=state.conductorRoutes.find(r=>r.circuitId===id);if(!current)throw Error('Сначала назначьте маршрут N');const draft=JSON.parse(JSON.stringify(ensureV2(state)));setConductorRoute(draft,id,current.neutralBus,'PE_MAIN');checkpoint();state.conductorRoutes=draft.conductorRoutes;changed();notify('PE заявлен вручную. Непрерывность и сечение PE не проверены.');}catch(err){notify(err.message,true);}return;}
 const reset=e.target.closest('[data-clear-route]');
 if(reset){if(!state.conductorRoutes.some(r=>r.circuitId===reset.dataset.clearRoute))return;checkpoint();clearConductorRoute(state,reset.dataset.clearRoute);changed();return;}
 const btn=e.target.closest('[data-declare-route]');
 if(btn){try{const proposal=proposedConductorRoute(state,btn.dataset.declareRoute);const selector=[...$('conductorEditor').querySelectorAll('[data-route-neutral]')].find(x=>x.dataset.routeNeutral===proposal.circuitId);const chosen=selector?.value||proposal.neutralBus;const draft=JSON.parse(JSON.stringify(ensureV2(state)));setConductorRoute(draft,proposal.circuitId,chosen,state.conductorRoutes.find(r=>r.circuitId===proposal.circuitId)?.protectiveBus??null);checkpoint();state.conductorRoutes=draft.conductorRoutes;changed();notify('Сохранено черновое назначение. Монтаж не подтверждён.');}catch(err){notify(err.message,true);}return;}
 if(e.target.id==='proposeRoutesBtn'){
  try{const draft=JSON.parse(JSON.stringify(ensureV2(state)));proposeAllConductorRoutes(draft);checkpoint();state.conductorRoutes=draft.conductorRoutes;state.wiringVersion=1;changed();notify('Черновые маршруты L/N предложены. PE не назначался автоматически.');}catch(err){notify(err.message,true);}return;
 }
 if(e.target.id==='exportConductorSvgBtn')download(baseName()+'_conductors_DRAFT.svg',conductorSvg(state),'image/svg+xml;charset=utf-8');
 if(e.target.id==='exportConductorCsvBtn')download(baseName()+'_conductors_DRAFT.csv',conductorCsv(state),'text/csv;charset=utf-8');
});
$('terminalEditor').addEventListener('click',e=>{
 const btn=e.target.closest('[data-declare-terminal]');
 if(btn){try{const draft=structuredCloneCompat(ensureV2(state));declareTerminalLinks(draft,btn.dataset.declareTerminal);checkpoint();state.terminalLinks=draft.terminalLinks;changed();notify('Символические контакты заявлены. Монтаж не проверен.');}catch(err){notify(err.message,true);}return;}
 const clear=e.target.closest('[data-clear-terminal]');
 if(clear){if(!state.terminalLinks.some(x=>x.loadId===clear.dataset.clearTerminal))return;checkpoint();clearTerminalLinks(state,clear.dataset.clearTerminal);changed();return;}
 if(e.target.id==='declareMissingTerminalBtn'){try{const draft=structuredCloneCompat(ensureV2(state));declareAllTerminalLinks(draft);checkpoint();state.terminalLinks=draft.terminalLinks;changed();notify('Заполнены только отсутствующие символические контакты.');}catch(err){notify(err.message,true);}return;}
 if(e.target.id==='exportTerminalCsvBtn')download(baseName()+'_terminal_DRAFT.csv',terminalCsv(state),'text/csv;charset=utf-8');
 if(e.target.id==='exportTerminalSvgBtn')download(baseName()+'_terminal_DRAFT.svg',terminalSvg(state),'image/svg+xml;charset=utf-8');
});
$('feedEditor').addEventListener('click',e=>{
 const button=e.target.closest('[data-declare-feed]');
 if(button){try{const draft=structuredCloneCompat(ensureV2(state));declareFeedLinks(draft,button.dataset.declareFeed);checkpoint();state.feedLinks=draft.feedLinks;changed();notify('Питание объявлено условно. Монтаж не подтверждён.');}catch(err){notify(err.message,true);}return;}
 const clear=e.target.closest('[data-clear-feed]');
 if(clear){if(!state.feedLinks.some(f=>f.circuitId===clear.dataset.clearFeed))return;checkpoint();clearFeedLinks(state,clear.dataset.clearFeed);changed();return;}
 const groupBtn=e.target.closest('[data-declare-group-input]');
 if(groupBtn){try{const draft=structuredCloneCompat(ensureV2(state));declareGroupInputs(draft,groupBtn.dataset.declareGroupInput);checkpoint();state.groupInputLinks=draft.groupInputLinks;changed();notify('Ввод группового УЗО заявлен условно, монтаж не подтверждён.');}catch(err){notify(err.message,true);}return;}
 const groupClear=e.target.closest('[data-clear-group-input]');
 if(groupClear){if(!state.groupInputLinks.some(x=>x.groupId===groupClear.dataset.clearGroupInput))return;checkpoint();clearGroupInputs(state,groupClear.dataset.clearGroupInput);changed();return;}
 if(e.target.id==='declareMissingGroupInputsBtn'){try{const draft=structuredCloneCompat(ensureV2(state));declareMissingGroupInputs(draft);if(draft.groupInputLinks.length===state.groupInputLinks.length){notify('Новых вводов нет');return;}checkpoint();state.groupInputLinks=draft.groupInputLinks;changed();}catch(err){notify(err.message,true);}return;}
 if(e.target.id==='declareMissingFeedBtn'){try{const draft=structuredCloneCompat(ensureV2(state));const before=state.feedLinks.length;declareMissingFeedLinks(draft);if(draft.feedLinks.length===before){notify('Новых деклараций нет');return;}checkpoint();state.feedLinks=draft.feedLinks;changed();notify('Отсутствующие декларации добавлены без замены существующих.');}catch(err){notify(err.message,true);}return;}
 if(e.target.id==='exportFeedCsvBtn')download(baseName()+'_feed_DRAFT.csv',feedCsv(state),'text/csv;charset=utf-8');
 if(e.target.id==='exportFeedSvgBtn')download(baseName()+'_feed_DRAFT.svg',feedSvg(state),'image/svg+xml;charset=utf-8');
});
$('exportProtectionCsvBtn').addEventListener('click',()=>{
 if(typeof epProtectionWorkbenchV1!=='function'||typeof epProtectionWorkbenchCsvV1!=='function')
  return notify('Ведомость защиты недоступна',true);
 const catalog=Object.entries(EP_CATALOG).map(([id,device])=>({id,device}));
 const report=epProtectionWorkbenchV1(state,catalogDevice,catalog,selectedLine);
 download(baseName()+'_protection_DRAFT.csv',epProtectionWorkbenchCsvV1(report),'text/csv;charset=utf-8');
});
$('neutralSegregationPanel').addEventListener('click',e=>{
 const btn=e.target.closest('[data-neutral-focus]');if(!btn)return;
 const id=btn.dataset.neutralFocus;
 if(!state.lines.some(line=>line.id===id))return notify('Цепь не найдена',true);
 selectedLine=id;render();
});
$('engineeringIssueRegister').addEventListener('click',e=>{
 const btn=e.target.closest('[data-issue-focus]');if(!btn)return;
 const id=btn.dataset.issueFocus;
 if(!state.lines.some(line=>line.id===id))return notify('Цепь замечания не найдена',true);
 selectedLine=id;render();
});
$('exportIssueRegisterCsvBtn').addEventListener('click',()=>{
 if(typeof epEngineeringBundleV1!=='function'||typeof epEngineeringIssueRegisterCsvV1!=='function')
  return notify('Реестр замечаний недоступен',true);
 const report=epEngineeringBundleV1(state,catalogDevice).sections.issueRegister;
 download(baseName()+'_issues_DRAFT.csv',epEngineeringIssueRegisterCsvV1(report),'text/csv;charset=utf-8');
});
$('singleLineDraftPanel').addEventListener('click',e=>{
 const target=e.target.closest('[data-single-line-focus]');if(!target)return;
 const id=target.getAttribute('data-single-line-focus');
 if(!state.lines.some(line=>line.id===id))return notify('Цепь не найдена',true);
 selectedLine=id;render();
});
$('singleLineDraftPanel').addEventListener('keydown',e=>{
 if(e.key!=='Enter'&&e.key!==' ')return;
 const target=e.target.closest('[data-single-line-focus]');if(!target)return;
 e.preventDefault();const id=target.getAttribute('data-single-line-focus');
 if(!state.lines.some(line=>line.id===id))return;
 selectedLine=id;render();
});
$('draftBoardPreview').addEventListener('click',e=>{
 const button=e.target.closest('[data-din-focus]');if(!button||button.disabled)return;
 const id=button.dataset.dinFocus;
 if(!state.lines.some(line=>line.id===id))return notify('Цепь DIN не найдена',true);
 selectedLine=id;render();
});
$('crossViewAuditPanel').addEventListener('click',e=>{
 const btn=e.target.closest('[data-crossview-focus]');if(!btn)return;
 const id=btn.dataset.crossviewFocus;
 if(!state.lines.some(line=>line.id===id))return notify('Цепь не найдена',true);
 selectedLine=id;render();
});
$('exportWiringTraceCsvBtn').addEventListener('click',()=>{
 if(typeof epCircuitWiringTraceV1!=='function'||typeof epCircuitWiringTraceCsvV1!=='function')
  return notify('Прослеживаемость проводников недоступна',true);
 const report=epCircuitWiringTraceV1(state);
 download(baseName()+'_wiring_trace_DRAFT.csv',epCircuitWiringTraceCsvV1(report),'text/csv;charset=utf-8');
});
$('exportCrossViewCsvBtn').addEventListener('click',()=>{
 if(typeof epEngineeringBundleV1!=='function'||typeof epCrossViewAuditCsvV1!=='function')
  return notify('Проверка согласованности недоступна',true);
 const report=epEngineeringBundleV1(state,catalogDevice).sections.crossView;
 download(baseName()+'_crossview_DRAFT.csv',epCrossViewAuditCsvV1(report),'text/csv;charset=utf-8');
});
$('exportCrossViewJsonBtn').addEventListener('click',()=>{
 if(typeof epEngineeringBundleV1!=='function')return notify('Проверка согласованности недоступна',true);
 const report=epEngineeringBundleV1(state,catalogDevice).sections.crossView;
 download(baseName()+'_crossview_DRAFT.json',JSON.stringify(report,null,2),'application/json;charset=utf-8');
});
$('protectionWorkbench').addEventListener('submit',e=>{
 const form=e.target.closest('[data-protection-input-form]');if(!form)return;
 e.preventDefault();
 const id=form.dataset.protectionInputForm;
 const inputs={ibA:form.elements.namedItem('ibA')?.value,
  izA:form.elements.namedItem('izA')?.value,ikKa:form.elements.namedItem('ikKa')?.value};
 if(typeof epProtectionInputsV1!=='function')return notify('Модуль исходных токов недоступен',true);
 const result=epProtectionInputsV1(state,id,inputs);
 if(!result.project)return notify('Исходные токи не записаны: '+result.code,true);
 checkpoint();state=result.project;selectedLine=id;changed();
 notify('Токи записаны как исходные данные. Требуется инженерная проверка.');
});
$('protectionWorkbench').addEventListener('click',e=>{
 const btn=e.target.closest('[data-protection-sku][data-protection-line]');if(!btn||btn.disabled)return;
 const id=btn.dataset.protectionLine,sku=btn.dataset.protectionSku;
 const line=state.lines.find(x=>x.id===id);
 if(!line||!catalogDevice(sku))return notify('Цепь или артикул не найдены',true);
 const catalog=Object.entries(EP_CATALOG).map(([key,device])=>({id:key,device}));
 const check=epProtectionWorkbenchV1(state,catalogDevice,catalog,id);
 if(check.selected?.lineId!==id||!check.selected.candidates.some(x=>x.sku===sku&&x.status!=='REJECTED'))
  return notify('Аппарат не проходит предварительную проверку',true);
 try{const draft=structuredCloneCompat(ensureV2(state));applyCatalogueSku(draft,id,sku);
  checkpoint();state=draft;selectedLine=id;changed();
  notify('Артикул назначен. Расчёты требуют перепроверки.');
 }catch(err){notify(err.message||'Не удалось назначить артикул',true);}
});
$('circuitDossier').addEventListener('click',e=>{
 const focus=e.target.closest('[data-focus-circuit],[data-open-load-circuit],[data-open-board-circuit]');if(!focus)return;
 const id=focus.dataset.focusCircuit||focus.dataset.openLoadCircuit||focus.dataset.openBoardCircuit;
 if(!state.lines.some(x=>x.id===id))return;
 selectedLine=id;
 if(focus.dataset.openLoadCircuit){switchView('loads');
  const row=[...$('loadRows').querySelectorAll('tr')].find(x=>x.dataset.id===id);
  if(row){row.scrollIntoView({block:'center',behavior:'smooth'});row.querySelector('[data-key="name"]')?.focus();}
 }else if(focus.dataset.openBoardCircuit){switchView('board');
  const device=[...$('boardCanvas').querySelectorAll('[data-line]')].find(x=>x.dataset.line===id);
  if(device){device.scrollIntoView({block:'center',behavior:'smooth'});device.focus();}
 }else{renderBoard();renderCircuitGraph();renderCircuitWorkspaceV1();renderEngineeringDiagnosticsV1();}
});
$('circuitWorkspaceQuery').addEventListener('input',renderCircuitWorkspaceV1);
$('circuitWorkspaceMode').addEventListener('change',renderCircuitWorkspaceV1);
$('exportEngineeringPrintBtn').addEventListener('click',()=>{
 if(typeof epEngineeringBundleV1!=='function'||typeof epEngineeringPrintV1!=='function')
  return notify('Печатный отчёт недоступен',true);
 const report=epEngineeringBundleV1(state,catalogDevice);
 download(baseName()+'_engineering_DRAFT.html',epEngineeringPrintV1(report),'text/html;charset=utf-8');
});
$('exportEngineeringBundleBtn').addEventListener('click',()=>{
 if(typeof epEngineeringBundleV1!=='function')return notify('Сводный отчёт недоступен',true);
 download(baseName()+'_engineering_bundle_DRAFT.json',
  JSON.stringify(epEngineeringBundleV1(state,catalogDevice),null,2),'application/json;charset=utf-8');
});
$('exportDraftBomCsvBtn').addEventListener('click',()=>{
 if(typeof epDraftBomV1!=='function'||typeof epDraftBomCsvV1!=='function')return notify('Спецификация недоступна',true);
 download(baseName()+'_equipment_BOM_DRAFT.csv',epDraftBomCsvV1(epDraftBomV1(state,catalogDevice)),'text/csv;charset=utf-8');
});
$('exportDraftBomJsonBtn').addEventListener('click',()=>{
 if(typeof epDraftBomV1!=='function')return notify('Спецификация недоступна',true);
 download(baseName()+'_equipment_BOM_DRAFT.json',JSON.stringify(epDraftBomV1(state,catalogDevice),null,2),'application/json;charset=utf-8');
});
$('exportEngineeringGateBtn').addEventListener('click',exportEngineeringGateV1);
$('exportCircuitDossierJsonBtn').addEventListener('click',()=>{
 if(typeof epCircuitDossierV1!=='function'){notify('Модуль ведомости не загружен',true);return;}
 download(baseName()+'_circuit_dossier_DRAFT.json',
  JSON.stringify(epCircuitDossierV1(state,catalogDevice),null,2),'application/json;charset=utf-8');
});
$('exportCircuitDossierCsvBtn').addEventListener('click',()=>{
 if(typeof epCircuitDossierV1!=='function'||typeof epCircuitDossierCsvV1!=='function'){
  notify('Модуль ведомости не загружен',true);return;
 }
 download(baseName()+'_circuit_dossier_DRAFT.csv',
  epCircuitDossierCsvV1(epCircuitDossierV1(state,catalogDevice)),'text/csv;charset=utf-8');
});
try{const s=localStorage.getItem('electropanel_web_preview');if(s)state=normalizeImport(JSON.parse(s));}catch(e){console.warn('Stored project ignored',e);}render();