'use strict';
// Stage-scoped assessment of declared design checks. Never claims physical installation approval.
const REQUIRED = Object.freeze(['load','network','cable','device','topology','enclosure']);
const VALID = new Set(['verified','failed','unknown']);
// Fields are checked when explicitly supplied, or when their output/stage requires them.
// No source document or method declaration is required for an engineer-entered value.
function assessDesignEvidence(project,options={}) {
  const records = project && typeof project === 'object' && !Array.isArray(project) ? project.evidence : null;
  const explicit = Array.isArray(options.requiredAreas) ? options.requiredAreas : [];
  const required = new Set(explicit.filter(area=>REQUIRED.includes(area)));
  const items=[];
  for(const area of REQUIRED){
    const entry = records && Object.prototype.hasOwnProperty.call(records,area) ? records[area] : null;
    const present = entry && typeof entry==='object' && !Array.isArray(entry);
    let status='not_required', reason='Не требуется на выбранном этапе';
    if(required.has(area) || present){
      status='unknown';reason='Проверка пока не выполнена';
      if(present){
        if(entry.status==='failed'){status='failed';reason='Зафиксировано инженерное противоречие';}
        else if(entry.stale===true){reason='Результат требует пересчёта';}
        else if(entry.status==='verified'){status='verified';reason='Проверка выполнена по заданным исходным данным';}
        else if(VALID.has(entry.status)){reason='Результат ещё не определён';}
      }
    }
    items.push({area,status,reason,source:typeof entry?.source==='string'?entry.source:'',method:typeof entry?.method==='string'?entry.method:'',stale:entry?.stale===true});
  }
  const failed=items.filter(x=>x.status==='failed').length;
  const unknown=items.filter(x=>x.status==='unknown').length;
  const verified=items.filter(x=>x.status==='verified').length;
  const notRequired=items.filter(x=>x.status==='not_required').length;
  return {
    status:failed?'failed':unknown?'incomplete':verified?'documented':'not_required',
    items,counts:{verified,failed,unknown,notRequired},
    installationApproved:false
  };
}
if(typeof module!=='undefined')module.exports={assessDesignEvidence,REQUIRED};
