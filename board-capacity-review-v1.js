'use strict';
// DIN capacity diagnostics based only on explicitly declared modules and actual draft placements.
function epBoardCapacityReviewV1(project,lookup){
 const issues=[],rails=[],add=(code,level='UNKNOWN',deviceId=null)=>issues.push({code,level,deviceId});
 const result=()=>({schema:'electropanel.board.capacity.review.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  rails,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Number.isInteger(project.railCount)||!Number.isInteger(project.railCapacity)||
 project.railCount<1||project.railCapacity<1||project.railCount>100||project.railCapacity>200){
  add('CAPACITY_INVALID','BLOCKED');return result();
 }
 if(typeof epDraftBoardPlanV1!=='function'){add('CAPACITY_ENGINE_UNAVAILABLE','BLOCKED');return result();}
 let board;
 try{board=epDraftBoardPlanV1(project,lookup);}catch(_){add('CAPACITY_ENGINE_FAILED','BLOCKED');return result();}
 if(board.status==='BLOCKED')add('CAPACITY_BOARD_BLOCKED','BLOCKED');
 const used=new Set();
 for(let railIndex=0;railIndex<project.railCount;railIndex++){
  const slots=Array(project.railCapacity).fill(null),devices=[];
  for(const p of board.placements||[]){
   if(p.railIndex!==railIndex)continue;
   if(used.has(p.deviceId)){add('CAPACITY_DUPLICATE_DEVICE','BLOCKED',p.deviceId);continue;}
   used.add(p.deviceId);
   if(!Number.isInteger(p.startModule)||!Number.isInteger(p.modules)||p.startModule<0||
    p.modules<1||p.startModule+p.modules>slots.length){
    add('CAPACITY_PLACEMENT_OUT_OF_BOUNDS','BLOCKED',p.deviceId);continue;
   }
   for(let i=p.startModule;i<p.startModule+p.modules;i++){
    if(slots[i]!==null)add('CAPACITY_PLACEMENT_OVERLAP','BLOCKED',p.deviceId);
    slots[i]=p.deviceId;
   }
   devices.push({deviceId:p.deviceId,startModule:p.startModule,modules:p.modules,
    article:p.article??null,kind:p.kind??null});
  }
  const gaps=[];let start=-1;
  for(let i=0;i<=slots.length;i++){
   if(i<slots.length&&slots[i]===null){if(start<0)start=i;}
   else if(start>=0){gaps.push({startModule:start,modules:i-start});start=-1;}
  }
  const occupied=slots.filter(x=>x!==null).length;
  rails.push({railIndex,capacity:slots.length,occupied,free:slots.length-occupied,
   utilizationPct:Math.round(100*occupied/slots.length*10)/10,
   largestFreeRun:gaps.reduce((max,g)=>Math.max(max,g.modules),0),
   gaps,devices:devices.sort((a,b)=>a.startModule-b.startModule)});
 }
 const placedCount=rails.reduce((n,r)=>n+r.devices.length,0);
 const expected=(Array.isArray(project.lines)?project.lines.length:0)+
  (Array.isArray(project.sharedDevices)?project.sharedDevices.length:0);
 if(placedCount<expected)add('CAPACITY_DEVICES_UNPLACED','BLOCKED');
 if(placedCount>expected)add('CAPACITY_UNEXPECTED_PLACEMENTS','BLOCKED');
 if(rails.some(r=>r.free===0))add('CAPACITY_RAIL_FULL','UNKNOWN');
 if(rails.some(r=>r.free>0&&r.largestFreeRun<r.free))add('CAPACITY_FRAGMENTED_FREE_SPACE','UNKNOWN');
 return result();
}
if(typeof module!=='undefined')module.exports={epBoardCapacityReviewV1};
