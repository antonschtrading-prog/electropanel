'use strict';
const {buildPortfolio}=require('./portfolio-v1.js');
const {makeBacklog,summary}=require('./verification-backlog-v1.js');
function buildReleaseBundle(){
 const portfolio=buildPortfolio(),queue=makeBacklog(),tasks=summary(queue);
 const sourceBySku=Object.fromEntries(portfolio.sourceRecords.map(r=>[r.sku,r.source]));
 const articles=queue.map(q=>({
  sku:q.sku,kind:q.kind,source:sourceBySku[q.sku],priority:q.priority,
  status:q.sourceReviewComplete?'REVIEW_REQUIRED':'BLOCKED',tasks:q.tasks,
  liveSelectionAllowed:false
 }));
 return {format:'electropanel-catalog-review-bundle',version:1,
  coreIntegrationAllowed:false,geometryComplete:portfolio.completeGeometry,
  portfolio:{total:portfolio.total,newToCore:portfolio.newToCore,overlapWithCore:portfolio.overlapWithCore,counts:portfolio.counts,missingKinds:portfolio.missingKinds},
  verification:tasks,articles};
}
if(require.main===module)process.stdout.write(JSON.stringify(buildReleaseBundle(),null,2)+'\n');
module.exports={buildReleaseBundle};
