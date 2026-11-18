'use strict';
// Persist advisory recheck requirements, never approvals or derived calculations.
const EP_REVIEW_DOMAINS_V1=Object.freeze(['load','network','cable','device','topology','enclosure']);
function epDesignReviewNoticeNormalizeV1(raw){
 if(raw===undefined||raw===null)return null;
 const isObj=raw&&typeof raw==='object'&&!Array.isArray(raw);
 if(!isObj||raw.version!==1||!Number.isInteger(raw.revision)||
  raw.revision<1||raw.revision>1000000000||
  Object.keys(raw).some(k=>!['version','revision','pendingDomains','lastChangedDomains'].includes(k)))
  throw Error('DESIGN_REVIEW_NOTICE_INVALID');
 const check=values=>Array.isArray(values)&&values.length<=6&&
  values.every(x=>typeof x==='string'&&EP_REVIEW_DOMAINS_V1.includes(x))&&
  new Set(values).size===values.length;
 if(!check(raw.pendingDomains)||!raw.pendingDomains.length||!check(raw.lastChangedDomains))
  throw Error('DESIGN_REVIEW_NOTICE_DOMAINS_INVALID');
 return {version:1,revision:raw.revision,
  pendingDomains:EP_REVIEW_DOMAINS_V1.filter(x=>raw.pendingDomains.includes(x)),
  lastChangedDomains:EP_REVIEW_DOMAINS_V1.filter(x=>raw.lastChangedDomains.includes(x))};
}
function epDesignReviewNoticeUpdateV1(raw,impact){
 const previous=epDesignReviewNoticeNormalizeV1(raw);
 if(!impact||!Array.isArray(impact.affected)||!impact.affected.length)return previous;
 if(impact.status!=='REVIEW_REQUIRED'||impact.affected.some(x=>!EP_REVIEW_DOMAINS_V1.includes(x))||
  !Array.isArray(impact.changed)||impact.changed.some(x=>!EP_REVIEW_DOMAINS_V1.includes(x)))
  throw Error('DESIGN_REVIEW_IMPACT_INVALID');
 return {version:1,revision:Math.min(1000000000,(previous?.revision||0)+1),
  pendingDomains:EP_REVIEW_DOMAINS_V1.filter(x=>
   impact.affected.includes(x)||previous?.pendingDomains.includes(x)),
  lastChangedDomains:EP_REVIEW_DOMAINS_V1.filter(x=>impact.changed.includes(x))};
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 EP_REVIEW_DOMAINS_V1,epDesignReviewNoticeNormalizeV1,epDesignReviewNoticeUpdateV1};
