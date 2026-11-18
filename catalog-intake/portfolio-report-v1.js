'use strict';
const {buildPortfolio}=require('./portfolio-v1.js');
const result=buildPortfolio();
const summary={
 schemaVersion:result.schemaVersion,mode:result.mode,engineeringApproved:result.engineeringApproved,autoImportAllowed:result.autoImportAllowed,
 total:result.total,newToCore:result.newToCore,overlapWithCore:result.overlapWithCore,
 counts:result.counts,missingKinds:result.missingKinds,completeGeometry:result.completeGeometry,
 missingGeometry:result.missingGeometry,duplicateErrors:result.duplicateErrors,
 coreConflicts:result.coreConflicts,blockers:result.blockers
};
if(require.main===module)process.stdout.write(JSON.stringify({...summary,sourceRecords:result.sourceRecords},null,2)+'\n');
module.exports={summary};
