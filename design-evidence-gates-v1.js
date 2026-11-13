'use strict';
// Design-stage evidence assessment. Does not inspect or certify a physically assembled board.
const REQUIRED = Object.freeze(['load','network','cable','device','topology','enclosure']);
const VALID = new Set(['verified','failed','unknown']);
function assessDesignEvidence(project) {
  const records = project && typeof project === 'object' && !Array.isArray(project) ? project.evidence : null;
  const items = [];
  for (const area of REQUIRED) {
    const entry = records && Object.prototype.hasOwnProperty.call(records, area) ? records[area] : null;
    let status = 'unknown', reason = 'Нет проверяемых исходных данных';
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const claimed = entry.status;
      const hasSource = typeof entry.source === 'string' && entry.source.trim().length > 0;
      const hasMethod = typeof entry.method === 'string' && entry.method.trim().length > 0;
      if (claimed === 'failed') { status = 'failed'; reason = 'Зафиксировано инженерное противоречие'; }
      else if (claimed === 'verified' && hasSource && hasMethod) {
        status = 'verified'; reason = 'Есть источник и метод проверки';
      } else if (claimed === 'verified') reason = 'Не указан источник или метод проверки';
      else if (VALID.has(claimed)) reason = 'Проверка не подтверждена';
    }
    items.push({area,status,reason});
  }
  const failed = items.filter(x=>x.status==='failed').length;
  const unknown = items.filter(x=>x.status==='unknown').length;
  return {
    status: failed ? 'failed' : unknown ? 'incomplete' : 'documented',
    items, counts: {verified:items.length-failed-unknown,failed,unknown},
    // Documentation status only. Independent engineering review remains necessary.
    installationApproved:false
  };
}
if(typeof module!=='undefined')module.exports={assessDesignEvidence,REQUIRED};
