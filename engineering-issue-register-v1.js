'use strict';
// Aggregate all draft engineering issues without claiming regulatory compliance.
function epEngineeringIssueRegisterV1(bundle){
 const sections=bundle?.sections||{},entries=[],counts={BLOCKED:0,UNKNOWN:0};
 const sectionNames=['dossier','bom','board','layoutAlternatives','protection','crossView','wiringTrace','neutralSegregation','singleLine','engineering'];
 for(const name of sectionNames){
  const section=sections[name];
  if(!section||!Array.isArray(section.issues)){
   entries.push({section:name,level:'BLOCKED',code:'SECTION_ISSUES_UNAVAILABLE',circuitId:null});continue;
  }
  for(const issue of section.issues.slice(0,2000)){
   if(!issue||typeof issue.code!=='string'||!issue.code){
    entries.push({section:name,level:'BLOCKED',code:'ISSUE_INVALID',circuitId:null});continue;
   }
   const level=issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN';
   const circuitId=issue.lineId??issue.circuitId??issue.owner??null;
   entries.push({section:name,level,code:issue.code,circuitId:
    typeof circuitId==='string'?circuitId:null});
  }
 }
 for(const x of entries)counts[x.level]++;
 return {schema:'electropanel.issue.register.draft.1',status:counts.BLOCKED?'BLOCKED':'UNKNOWN',
  entries,counts,sections:sectionNames,engineeringApproved:false,ready_for_installation:false};
}
function epEngineeringIssueRegisterHtmlV1(report,selectedId=null){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report?.entries)return '<p>Реестр замечаний недоступен. Проверка не завершена.</p>';
 const items=report.entries.slice(0,250).map(x=>{
  const guide=typeof epIssueGuidanceV1==='function'?epIssueGuidanceV1(x.code):
   {title:'Требуется разбор замечания',action:'Проверьте исходные данные'};
  return '<tr'+(x.circuitId===selectedId?' class="ep-circuit-active"':'')+'>'+
   '<td>'+esc(x.level)+'</td><td>'+esc(x.section)+'</td><td>'+esc(guide.title)+' <small>('+esc(x.code)+')</small></td>'+
   '<td>'+esc(guide.action)+'</td>'+
   '<td>'+(x.circuitId?'<button class="btn tiny" type="button" data-issue-focus="'+esc(x.circuitId)+'">'+esc(x.circuitId)+'</button>':'Проект')+'</td></tr>';
 }).join('');
 return '<details class="ep-issue-register"><summary>Сводный реестр замечаний · блокирующих '+
  report.counts.BLOCKED+', неопределённостей '+report.counts.UNKNOWN+'</summary>'+
  '<p>Замечания могут повторяться в разных инженерных разделах. Это журнал проверки, не допуск.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Уровень</th><th>Раздел</th><th>Проблема</th><th>Что проверить</th><th>Цепь</th></tr></thead><tbody>'+
  (items||'<tr><td colspan="5">Замечания не перечислены; подтверждение монтажа отсутствует.</td></tr>')+
  '</tbody></table></div></details>';
}
function epEngineeringIssueRegisterCsvV1(report){
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 return '\uFEFF'+[['Раздел','Уровень','Код','Цепь'],
  ...(report?.entries||[]).map(x=>[x.section,x.level,x.code,x.circuitId])]
  .map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epEngineeringIssueRegisterV1,epEngineeringIssueRegisterHtmlV1,epEngineeringIssueRegisterCsvV1};
