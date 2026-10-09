// CadTech auto-design (V9.9.8): keeps changing the design until every truss PASSES its checks, or reports FAIL with the reason.
// Changes made automatically, in this order of preference:
//   member sizes (2x4 -> 2x12, per chord / web group), plies (1 -> 5), web pattern, interior bearings (unless "end bearings only"),
//   nodal loads from jacks / hip carriers applied to the girder that carries them (re-analysed until the loads stop changing),
//   bearing length, plies again when the bearing still is not enough, hold-down requirement, joint-capacity requirement and
//   lateral-restraint points for long compression members.
import {analyzeAssemblyTruss,WEB_STYLES} from './advanced.js?v=5';
import {engineeringPostProcess,computeTransfers} from './engineering.js?v=2';

export const MAX_PLY=5;

// one truss: search sizes / plies / web patterns / bearings, then put the chosen sections on the members
export function designTruss(t,p,o={},{loads=[],minPly=1,maxPly=MAX_PLY,styles=WEB_STYLES}={}){
  let r;
  try{r=analyzeAssemblyTruss(t,p,{...o,styles:t.edited?[t.webStyle||o.style||'Fink']:styles,edited:!!t.edited,loads,minPly,maxPly});}
  catch(e){r={...t,analysis:{pass:false,status:'FAIL',error:e.message,members:[],extra:[],pointLoads:[]}};}
  if(r.analysis?.sections)r.members.forEach(m=>{const sec=r.analysis.sections[m.role==='overhang'?'top':m.role];if(sec){m.section=[sec.b/1000,sec.d/1000];m.sectionName=sec.name;m.material='timber';m.thickness=(sec.t||1.6)/1000;}});
  r.shape=t.shape;r.webStyle=r.analysis?.style||t.webStyle;
  return r;
}

const sameLoads=(a=[],b=[])=>a.length===b.length&&a.every(x=>b.some(y=>y.from===x.from&&Math.abs(y.x-x.x)<.02&&Object.keys({...x.cases,...y.cases}).every(k=>Math.abs((x.cases?.[k]||0)-(y.cases?.[k]||0))<=Math.max(.05,.02*Math.abs(x.cases?.[k]||0)))));

// Designs `ids` (all trusses when omitted) and everything that has to be re-analysed because of them.
export function autoDesignAssembly(assembly,p,{optionsFor=()=>({}),ids=null,styles=WEB_STYLES,maxRounds=8,maxPly=MAX_PLY,progress=()=>{},skipInitial=false}={}){
  const index=id=>assembly.trusses.findIndex(t=>t.id===id),state=new Map(),log=[];
  const scope=new Set(ids||assembly.trusses.map(t=>t.id));
  const st=id=>{if(!state.has(id))state.set(id,{minPly:1,loads:[]});return state.get(id);};
  const redesign=id=>{const i=index(id),t=assembly.trusses[i],s=st(id);assembly.trusses[i]=designTruss(t,p,optionsFor(t),{loads:s.loads,minPly:s.minPly,maxPly,styles});};
  if(!skipInitial){let n=0;for(const id of [...scope]){redesign(id);progress(++n,scope.size,id);}}
  let rounds=0;
  for(;rounds<maxRounds;rounds++){
    engineeringPostProcess(assembly,p);
    const T=computeTransfers(assembly);let changed=false;
    // receivers of a transfer from an analysed truss in scope join the scope
    for(const [to,list] of T)if(list.some(x=>scope.has(x.from)))scope.add(to);
    for(const id of scope){
      const t=assembly.trusses[index(id)];if(!t?.analysis)continue;const s=st(id);let need=false;
      const wanted=(T.get(id)||[]).map(x=>({from:x.from,x:x.x,cases:x.cases}));
      if(!sameLoads(s.loads,wanted)){s.loads=wanted;need=true;}
      const bearingFail=t.engineering?.checks?.bearing?.needMorePly&&(t.analysis.ply||1)<maxPly;
      if(bearingFail){s.minPly=(t.analysis.ply||1)+1;need=true;}
      if(need){redesign(id);changed=true;}
    }
    if(!changed)break;
  }
  engineeringPostProcess(assembly,p);
  const results=assembly.trusses.filter(t=>t.analysis);
  return {rounds,analyzed:results.length,pass:results.filter(t=>t.design?.result==='PASS').length,fail:results.filter(t=>t.design?.result==='FAIL').length,
    failures:results.filter(t=>t.design?.result==='FAIL').map(t=>({id:t.id,type:t.type,reasons:t.design.failures}))};
}
