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
// ---- V9.9.8 auto-design checks -------------------------------------------------------------------------------------------
// Every check ends in PASS or FAIL.  Where a check used to say "DESIGN REQUIRED" / "REVIEW" the design is now changed or the
// design requirement is stated:  bearing length is lengthened (then plies are added by autodesign.js), uplift is covered by
// hold-downs sized to the demand, bracing points are specified for long compression members, joint capacity is stated per
// joint, and jack reactions are applied to the girder as nodal loads and re-analysed.
export const STD_BEARING_MM=[89,140];   // 3.5 and 5.5 in: longer bearings are not realistic on a wall plate, so plies are added instead
const near=(a,b)=>Math.abs(a-b)<=Math.max(.05,.02*Math.max(Math.abs(a),Math.abs(b)));
const loadsMatch=(applied,wanted)=>{const keys=new Set([...Object.keys(applied||{}),...Object.keys(wanted||{})]);for(const k of keys)if(!near(Number(applied?.[k])||0,Number(wanted?.[k])||0))return false;return true;};
export function computeTransfers(assembly){
  const trusses=assembly?.trusses||[],byId=new Map(trusses.map(t=>[t.id,t])),out=new Map();
  const frame=t=>{const o=t.profile[0],e=t.profile.at(-1),L=Math.hypot(e[0]-o[0],e[1]-o[1])||1;return {o,u:[(e[0]-o[0])/L,(e[1]-o[1])/L]};};
  for(const t of trusses){
    if(!t.analysis?.reactions?.length||!t.connections?.length)continue;
    const fj=frame(t);
    for(const c of t.connections){
      const rec=byId.get(c.to);if(!rec||rec===t||!c.point)continue;
      const xj=(c.point[0]-fj.o[0])*fj.u[0]+(c.point[1]-fj.o[1])*fj.u[1],cases={};let gov={case:'',kN:0};
      for(const lc of t.analysis.reactions){const r=lc.reactions.reduce((b,x)=>Math.abs(x.x-xj)<Math.abs(b.x-xj)?x:b,lc.reactions[0]);cases[lc.case]=r.force;if(Math.abs(r.force)>gov.kN)gov={case:lc.case,kN:Math.abs(r.force)};}
      const fr=frame(rec),xr=(c.point[0]-fr.o[0])*fr.u[0]+(c.point[1]-fr.o[1])*fr.u[1];
      if(!out.has(rec.id))out.set(rec.id,[]);
      out.get(rec.id).push({from:t.id,to:rec.id,x:xr,cases,case:gov.case,designReaction_kN:gov.kN,point:[...c.point]});
    }
  }
  return out;
}
export function engineeringPostProcess(assembly,p={}){
  const trusses=assembly?.trusses||[],byId=new Map(trusses.map(t=>[t.id,t]));
  for(const t of trusses){t.engineering={...(t.engineering||{}),transfersIn:[],transfersOut:[],warnings:[]};}
  for(const [to,list] of computeTransfers(assembly)){const rec=byId.get(to);for(const it of list){byId.get(it.from).engineering.transfersOut.push(it);rec.engineering.transfersIn.push(it);}}
  for(const t of trusses){const a=t.analysis;if(!a)continue;
   const ply=a.ply||t.ply||1,failures=[],actions=[],requirements={};
   if(a.screeningStatus===undefined)a.screeningStatus=a.status;
   // reactions
   const downs=[],ups=[];for(const c of a.reactions||[])for(const r of c.reactions){const f=r.force||0;(f>0?downs:ups).push(Math.abs(f));}
   const maxDown=Math.max(0,...downs),uplift=Math.max(0,...ups);
   // 1 strength + deflection (from the solver)
   const solverPass=!!a.pass&&Number.isFinite(a.ratio);
   if(!solverPass)failures.push(a.error?`analysis error: ${a.error}`:`members/deflection fail at the largest screening size (utilization ${Number.isFinite(a.ratio)?a.ratio.toFixed(2):'--'}) - engineered members, more bearings or a different layout required`);
   // 2 bearing: lengthen, then (autodesign.js) add plies
   const userLen=Number(p.bearingLength||89),capPerMm=Number(p.bearingCapacity||4)/89*ply,required=capPerMm>0?maxDown/capPerMm:Infinity;
   const options=[...new Set([userLen,...STD_BEARING_MM.filter(x=>x>userLen)])],chosen=options.find(x=>x>=required-1e-9),provided=chosen??options.at(-1);
   const bearing={demand_kN:maxDown,requiredLength_mm:required,userLength_mm:userLen,providedLength_mm:provided,capacity_kN:capPerMm*provided,ratio:capPerMm*provided>0?maxDown/(capPerMm*provided):Infinity,status:chosen?'PASS':'FAIL',needMorePly:!chosen};
   if(chosen&&chosen>userLen)actions.push(`bearing length ${userLen} -> ${chosen} mm`);
   if(!chosen)failures.push(`bearing: ${maxDown.toFixed(1)} kN needs ${Math.ceil(required)} mm of bearing at ${ply}-ply (limit ${options.at(-1)} mm) - add a bearing, a header/hanger or an engineered member`);
   requirements.bearingLength_mm=provided;
   // 3 uplift: size the hold-down requirement
   const holdCap=Number(p.holdDownCapacity||0);let upl;
   if(uplift<=1e-6)upl={demand_kN:0,capacity_kN:holdCap||null,perBearing:0,requirement_kN:0,ratio:0,status:'PASS',basis:'no uplift'};
   else if(holdCap>0){const n=Math.ceil(uplift/holdCap-1e-9);upl={demand_kN:uplift,capacity_kN:holdCap,perBearing:n,requirement_kN:uplift,ratio:uplift/holdCap,status:n<=2?'PASS':'FAIL',basis:'entered hold-down capacity'};
     if(n>1&&n<=2)actions.push(`${n} hold-downs per bearing (${uplift.toFixed(1)} kN uplift)`);if(n>2)failures.push(`uplift ${uplift.toFixed(1)} kN needs ${n} hold-downs per bearing at ${holdCap} kN each`);}
   else{upl={demand_kN:uplift,capacity_kN:null,perBearing:1,requirement_kN:Math.ceil(uplift*10)/10,ratio:null,status:'PASS',basis:'requirement set - no hold-down capacity entered'};actions.push(`hold-down / uplift tie >= ${upl.requirement_kN.toFixed(1)} kN at each bearing`);}
   requirements.upliftConnector_kN=upl.requirement_kN;
   // 4 joints / plates
   const plateCap=Number(p.plateCapacity||0),joints=uniqueJoints(t),jointDemand=Math.max(0,...(a.members||[]).map(m=>Math.abs(m.force||0)));let conn;
   if(plateCap>0){const r=jointDemand/plateCap;conn={jointCount:joints.length,demand_kN:jointDemand,userCapacity_kN:plateCap,requirement_kN:jointDemand,ratio:r,status:r<=1?'PASS':'FAIL',basis:'entered plate capacity'};if(r>1)failures.push(`joints: ${jointDemand.toFixed(1)} kN exceeds the entered ${plateCap} kN plate capacity`);}
   else{conn={jointCount:joints.length,demand_kN:jointDemand,userCapacity_kN:0,requirement_kN:Math.ceil(jointDemand*10)/10,ratio:null,status:'PASS',basis:'requirement set - no plate capacity entered'};actions.push(`connector plates developing >= ${conn.requirement_kN.toFixed(1)} kN at every joint`);}
   requirements.jointCapacity_kN=conn.requirement_kN;
   // 5 long compression members: lateral restraint points
   const braceLimit=Number(p.braceLength||2400)/1000,braced=(a.members||[]).filter(m=>m.compression&&(m.length||0)>braceLimit).map(m=>{const n=Math.max(1,Math.ceil(m.length/braceLimit)-1);return {member:`M${m.index+1}`,role:m.role,length_m:m.length,braces:n,spacing_m:m.length/(n+1),action:`lateral restraint at ${n} point${n>1?'s':''}, <= ${(braceLimit).toFixed(2)} m unbraced`};});
   const bracing={flagged:braced,status:'PASS',basis:braced.length?`${braced.length} compression member${braced.length>1?'s':''} braced`:'no compression member exceeds the brace trigger'};
   if(braced.length)actions.push(`lateral restraint on ${braced.length} long compression member${braced.length>1?'s':''}`);
   requirements.bracing=braced;
   // 6 transferred jack reactions are applied as nodal loads (autodesign.js re-analyses the girder)
   const tin=t.engineering.transfersIn,applied=tin.map(it=>({...it,applied:(a.pointLoads||[]).some(l=>l.from===it.from&&loadsMatch(l.cases,it.cases))}));
   const tr={count:tin.length,items:applied,status:applied.every(x=>x.applied)?'PASS':'FAIL'};
   tin.forEach((it,i)=>{it.applied=applied[i].applied;it.status=it.applied?'APPLIED AS NODAL LOAD':'NOT YET APPLIED';});
   if(tin.length){if(tr.status==='PASS')actions.push(`nodal loads from ${tin.map(x=>x.from).join(', ')} applied (${Math.max(...tin.map(x=>x.designReaction_kN)).toFixed(1)} kN max)`);else failures.push('transferred loads not applied - re-run Analyze');}
   // design changes made automatically
   const base='2x4',changes=[];for(const k of ['top','bottom','web']){const n=a.sections?.[k]?.name;if(n&&n!==base)changes.push(`${k} ${base}->${n}`);}
   if(ply>1)actions.unshift(`${ply}-ply`);if(changes.length)actions.unshift('sections: '+changes.join(', '));
   if(a.style&&a.style!=='Fink')actions.push(`web pattern ${a.style}`);if(a.extra?.length)actions.push(`${a.extra.length} interior bearing${a.extra.length>1?'s':''} added`);
   // cost (unchanged)
   const timberCost=(a.members||[]).reduce((s,m)=>s+(m.length||0)*sectionCost(m.size)*ply,0),plateCost=joints.length*Number(p.plateUnitCost||1.5),labor=(t.members?.length||0)*Number(p.memberLaborCost||.5),score=timberCost+plateCost+labor;
   const checks={strength:{ratio:a.ratio??null,displacement_mm:a.displacement??null,status:solverPass?'PASS':'FAIL'},bearing,uplift:upl,connections:conn,bracing,transfers:tr};
   const result=failures.length?'FAIL':'PASS';
   t.design={result,failures,actions,requirements};
   t.engineering={...t.engineering,codeProfile:p.codeProfile||'CUSTOM',woodGrade:p.woodGrade||'CUSTOM',checks,cost:{timber:timberCost,plates:plateCost,labor,total:score,currency:p.currency||'USD'},splices:chordSplices(t),revision:p.revision||'A'};
   a.status=result;a.failReasons=failures;
  }
  return assembly;
}
function uniqueJoints(t){const out=[];for(const m of t.members||[])for(const p of [m.a,m.b])if(!out.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])<.006))out.push(p);return out;}
function chordSplices(t){const roles=['top','bottom'],out=[];for(const role of roles){const ms=(t.members||[]).filter(m=>m.role===role);for(let i=0;i<ms.length-1;i++){const a=ms[i],b=ms[i+1],shared=[a.a,a.b].find(p=>[b.a,b.b].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])<.006));if(shared)out.push({role,point:shared,status:'SPLICE / JOINT CONNECTION CHECK REQUIRED'});}}return out;}
function sectionCost(s){return ({'2x4':1,'2x6':1.35,'2x8':1.75,'2x10':2.25,'2x12':2.8}[s]||1);}
export function fabricationSchedule(assembly){const rows=[];for(const t of assembly?.trusses||[])for(let i=0;i<(t.members||[]).length;i++){const m=t.members[i],r=t.analysis?.members?.find(x=>x.index===i);rows.push({truss:t.id,member:`M${i+1}`,role:m.role,size:r?.size||m.sectionName||'2x4',ply:t.analysis?.ply||t.ply||1,length_m:m.length,leftCut:'FIELD/SHOP DETAIL',rightCut:'FIELD/SHOP DETAIL'});}return rows;}
export function revisionSnapshot(assembly,label='A'){return {revision:label,created:new Date().toISOString(),trusses:(assembly?.trusses||[]).map(t=>({id:t.id,type:t.type,span:t.span,memberCount:t.members?.length||0,status:t.analysis?.status||'NOT ANALYZED',ratio:t.analysis?.ratio??null}))};}
