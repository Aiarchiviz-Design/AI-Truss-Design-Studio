// CadTech independent engineering workflow helpers.
// Values in the generic connection library are USER/PROJECT inputs, not manufacturer approvals.
export const CODE_PROFILES={
 'US-ASCE7-22/NDS':{label:'US — ASCE 7-22 / NDS workflow',jurisdiction:'US',note:'Workflow profile only; verify adopted IBC/IRC edition and local amendments.'},
 'CA-NBCC/O86':{label:'Canada — NBCC / CSA O86 workflow',jurisdiction:'CA',note:'Workflow profile only; verify provincial adoption and project importance category.'},
 'AU-NCC/AS1720':{label:'Australia — NCC / AS 1720 workflow',jurisdiction:'AU',note:'Workflow profile only; verify NCC edition, wind region and applicable standards.'},
 'CUSTOM':{label:'Custom / engineering review',jurisdiction:'CUSTOM',note:'User-defined loads and capacities.'}
};
export const WOOD_GRADES={
 'SPF-No2':{label:'SPF No.2 (project values required)',Epsi:1400000,allowPsi:700},
 'DFL-No2':{label:'Douglas Fir-Larch No.2 (project values required)',Epsi:1600000,allowPsi:875},
 'SYP-No2':{label:'Southern Pine No.2 (project values required)',Epsi:1600000,allowPsi:925},
 'CUSTOM':{label:'Custom timber values',Epsi:null,allowPsi:null}
};
export function engineeringPostProcess(assembly,p={}){
 const trusses=assembly?.trusses||[], byId=new Map(trusses.map(t=>[t.id,t]));
 // Transfer jack end reactions to their detected girder/hip carrier. This is explicit and auditable;
 // the transferred loads are reported separately because the base 2D solver does not yet re-solve nodal point loads.
 for(const t of trusses){t.engineering={...(t.engineering||{}),transfersIn:[],transfersOut:[],warnings:[]};}
 for(const t of trusses){if(!t.connections?.length||!t.analysis?.reactions?.length)continue;const target=byId.get(t.connections[0].to);if(!target)continue;const gov=t.analysis.reactions.reduce((best,c)=>{const v=Math.max(...c.reactions.map(r=>Math.abs(r.force||0)));return !best||v>best.v?{case:c.case,v}:best},null);if(!gov)continue;const item={from:t.id,to:target.id,case:gov.case,designReaction_kN:gov.v,point:t.connections[0].point||null,status:'TRANSFER IDENTIFIED — TARGET REANALYSIS WITH NODAL LOAD REQUIRED'};t.engineering.transfersOut.push(item);target.engineering.transfersIn.push(item);target.engineering.warnings.push(`Transferred reaction from ${t.id} identified; nodal reanalysis required.`);}
 for(const t of trusses){const a=t.analysis;if(!a)continue;const ply=a.ply||t.ply||1, maxReaction=Math.max(0,...(a.reactions||[]).flatMap(c=>c.reactions.map(r=>Math.abs(r.force||0))));
   const bearingLen=Number(p.bearingLength||89);const bearingCap=Number(p.bearingCapacity||4.0)*bearingLen/89*ply;const bearingRatio=bearingCap>0?maxReaction/bearingCap:Infinity;
   const uplift=Math.max(0,...(a.reactions||[]).flatMap(c=>c.reactions.map(r=>Math.max(0,-(r.force||0)))));const holdCap=Number(p.holdDownCapacity||0);const upliftRatio=holdCap>0?uplift/holdCap:(uplift>0?Infinity:0);
   const plateCap=Number(p.plateCapacity||0),joints=uniqueJoints(t),jointDemand=Math.max(0,...(a.members||[]).map(m=>Math.abs(m.force||0))),plateRatio=plateCap>0?jointDemand/plateCap:Infinity;
   const compression=(a.members||[]).filter(m=>m.compression),braceLimit=Number(p.braceLength||2400)/1000,bracing=compression.filter(m=>(m.length||0)>braceLimit).map(m=>({member:`M${m.index+1}`,length_m:m.length,action:'LATERAL RESTRAINT / BRACING REVIEW'}));
   const timberCost=(a.members||[]).reduce((s,m)=>s+(m.length||0)*sectionCost(m.size)*ply,0),plateCost=joints.length*Number(p.plateUnitCost||1.5),labor=(t.members?.length||0)*Number(p.memberLaborCost||.5),score=timberCost+plateCost+labor;
   const checks={bearing:{demand_kN:maxReaction,capacity_kN:bearingCap,ratio:bearingRatio,status:bearingRatio<=1?'PASS':'DESIGN REQUIRED'},uplift:{demand_kN:uplift,capacity_kN:holdCap,ratio:upliftRatio,status:upliftRatio<=1?'PASS':'DESIGN REQUIRED'},connections:{jointCount:joints.length,demand_kN:jointDemand,userCapacity_kN:plateCap,ratio:plateRatio,status:plateCap>0&&plateRatio<=1?'PRELIMINARY PASS':'DESIGN REQUIRED'},bracing:{flagged:bracing,status:bracing.length?'REVIEW':'NO LONG COMPRESSION MEMBERS FLAGGED'}};
   t.engineering={...t.engineering,codeProfile:p.codeProfile||'CUSTOM',woodGrade:p.woodGrade||'CUSTOM',checks,cost:{timber:timberCost,plates:plateCost,labor,total:score,currency:p.currency||'USD'},splices:chordSplices(t),revision:p.revision||'A'};
   if(t.engineering.transfersIn.length)a.status='DESIGN REQUIRED — TRANSFER LOADS';
   if(bearingRatio>1||upliftRatio>1||(plateCap<=0||plateRatio>1))a.status='DESIGN REQUIRED';
 }
 return assembly;
}
function uniqueJoints(t){const out=[];for(const m of t.members||[])for(const p of [m.a,m.b])if(!out.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])<.006))out.push(p);return out;}
function chordSplices(t){const roles=['top','bottom'],out=[];for(const role of roles){const ms=(t.members||[]).filter(m=>m.role===role);for(let i=0;i<ms.length-1;i++){const a=ms[i],b=ms[i+1],shared=[a.a,a.b].find(p=>[b.a,b.b].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<.006));if(shared)out.push({role,point:shared,status:'SPLICE / JOINT CONNECTION CHECK REQUIRED'});}}return out;}
function sectionCost(s){return ({'2x4':1,'2x6':1.35,'2x8':1.75,'2x10':2.25,'2x12':2.8}[s]||1);}
export function fabricationSchedule(assembly){const rows=[];for(const t of assembly?.trusses||[])for(let i=0;i<(t.members||[]).length;i++){const m=t.members[i],r=t.analysis?.members?.find(x=>x.index===i);rows.push({truss:t.id,member:`M${i+1}`,role:m.role,size:r?.size||m.sectionName||'2x4',ply:t.analysis?.ply||t.ply||1,length_m:m.length,leftCut:'FIELD/SHOP DETAIL',rightCut:'FIELD/SHOP DETAIL'});}return rows;}
export function revisionSnapshot(assembly,label='A'){return {revision:label,created:new Date().toISOString(),trusses:(assembly?.trusses||[]).map(t=>({id:t.id,type:t.type,span:t.span,memberCount:t.members?.length||0,status:t.analysis?.status||'NOT ANALYZED',ratio:t.analysis?.ratio??null}))};}
