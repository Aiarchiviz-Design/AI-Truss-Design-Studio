// CadTech truss-to-truss solid geometry helpers.
// IMPORTANT: analytical truss centre-lines may intersect a receiving truss centre plane,
// but physical timber from the incoming/secondary truss must stop at the NEAR FACE of
// the receiving/primary truss.  Clipping is therefore applied to the whole member segment,
// not only to endpoints that happen to coincide with the analytical connection point.
const EPS=1e-7;
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mul=(a,s)=>a.map(x=>x*s);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const unit=v=>{const L=Math.hypot(...v);return L>EPS?v.map(x=>x/L):[0,0,0]};
const lerp=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);

export function receiverHalfWidth(receiver){
  // Physical breadth across the receiver truss plane. Multiple plies use 55 mm centres.
  const breadth=Math.max(.01,...(receiver?.members||[]).map(m=>Number(m.section?.[0])||.045));
  const ply=Math.max(1,Number(receiver?.ply)||1);
  return (breadth+(ply-1)*.055)/2;
}

function trussReferencePoint(t){
  const pts=(t?.members||[]).flatMap(m=>[m.a,m.b]).filter(Boolean);
  if(!pts.length)return [0,0,0];
  return [0,1,2].map(i=>pts.reduce((s,p)=>s+(Number(p[i])||0),0)/pts.length);
}

function connectionPlane(truss,receiver,c,member){
  const n=unit([Number(receiver?.normal?.[0])||0,Number(receiver?.normal?.[1])||0,0]);
  if(Math.hypot(...n)<.5)return null;
  const origin=(c?.point&&c.point.length>=3)?c.point:trussReferencePoint(receiver);
  // Determine which side of the receiver contains the incoming truss.  Use the incoming
  // truss centroid rather than an individual member, so EVERY member clips to one plane.
  let tc=(c?.keepPoint&&c.keepPoint.length>=3)?c.keepPoint:trussReferencePoint(truss);
  if(!c?.keepPoint && !(truss?.members||[]).some(m=>m?.a&&m?.b) && member?.a&&member?.b) tc=lerp(member.a,member.b,.5);
  let side=Math.sign(dot(sub(tc,origin),n));
  if(!side){
    const p=truss?.profile?.[0]||truss?.members?.[0]?.a;
    side=Math.sign(dot(sub(p||tc,origin),n))||1;
  }
  return {origin,n,side,half:receiverHalfWidth(receiver),receiver:receiver.id};
}

function clipSegmentToNearFace(a,b,plane){
  // q >= 0 is the legal (incoming-truss) side of the receiver near face.
  const q=p=>plane.side*dot(sub(p,plane.origin),plane.n)-plane.half;
  let qa=q(a),qb=q(b);
  if(qa>=-EPS&&qb>=-EPS)return {a,b,changed:false};
  if(qa<-EPS&&qb<-EPS)return {a,b,changed:true,hidden:true};
  const den=qa-qb;
  if(Math.abs(den)<EPS)return {a,b,changed:true,hidden:true};
  const t=Math.max(0,Math.min(1,qa/den));
  const hit=lerp(a,b,t);
  if(qa<0)a=hit; else b=hit;
  return {a,b,changed:true,hidden:false};
}


function pointSegmentDistance(p,a,b){
  const ab=sub(b,a),den=dot(ab,ab);
  if(den<EPS)return Math.hypot(...sub(p,a));
  const t=Math.max(0,Math.min(1,dot(sub(p,a),ab)/den));
  return Math.hypot(...sub(p,add(a,mul(ab,t))));
}
function trimEndpointToChordFace(p,other,truss,member){
  // Webs/verticals analytically terminate on chord centre-lines. Their physical solids
  // must terminate on the chord FACE, otherwise the rectangular prisms hang through it.
  if(member?.role!=='web')return p;
  const inward=unit(sub(other,p));
  let best=null;
  for(const r of (truss?.members||[])){
    if(r===member||!(r?.role==='top'||r?.role==='bottom')||!r.a||!r.b)continue;
    const dist=pointSegmentDistance(p,r.a,r.b);
    if(dist>.035)continue;
    const ru=unit(sub(r.b,r.a)),sin=Math.sqrt(Math.max(0,1-dot(inward,ru)**2));
    if(sin<.12)continue;
    const depth=Math.max(.01,Number(r.section?.[1])||.09);
    const setback=depth/(2*sin);
    if(!best||dist<best.dist)best={dist,setback};
  }
  return best?add(p,mul(inward,best.setback)):p;
}
function internalJointFaceTrim(truss,member,a,b){
  // Only shorten endpoints that were intended to meet a chord. Chord free ends,
  // ridges and eave overhangs are preserved; they must never receive a generic extension.
  return {
    a:trimEndpointToChordFace(a,b,truss,member),
    b:trimEndpointToChordFace(b,a,truss,member)
  };
}

export function connectionTrimForMember(truss,member,assembly,plyOffset=0){
  let a=[...member.a],b=[...member.b],trimmed=false,receiverIds=[],setback=0;
  // A secondary truss can have more than one receiver. Clip against every declared
  // receiver plane. This also acts as a post-generation penetration audit.
  for(const c of (truss?.connections||[])){
    if(!c?.to||!assembly?.trusses)continue;
    const receiver=assembly.trusses.find(x=>x.id===c.to);
    if(!receiver||receiver===truss)continue;
    const plane=connectionPlane(truss,receiver,c,member);
    if(!plane)continue;
    const r=clipSegmentToNearFace(a,b,plane);
    a=r.a;b=r.b;
    if(r.changed){trimmed=true;receiverIds.push(receiver.id);setback=Math.max(setback,Math.min(Math.hypot(...sub(r.a,member.a)),Math.hypot(...sub(r.b,member.b))));}
    if(r.hidden)return {a,b,trimmed:true,hidden:true,receivers:receiverIds,receiver:receiver.id};
  }
  const jt=internalJointFaceTrim(truss,member,a,b); if(Math.hypot(...sub(jt.a,a))>EPS||Math.hypot(...sub(jt.b,b))>EPS)trimmed=true; a=jt.a;b=jt.b;
  return {a,b,trimmed,hidden:false,receivers:receiverIds,receiver:receiverIds.at(-1)||null,setback};
}

export function solidMemberEnds(truss,member,assembly,plyOffset=0){
  // plyOffset moves the incoming solid within its own truss plane. It must NOT enlarge
  // the receiver setback; receiverHalfWidth already includes receiver ply thickness.
  return connectionTrimForMember(truss,member,assembly,plyOffset);
}

export function penetrationAudit(assembly){
  const issues=[];
  for(const t of (assembly?.trusses||[]))for(const [i,m] of (t.members||[]).entries()){
    const r=connectionTrimForMember(t,m,assembly,0);
    if(r.hidden)issues.push({truss:t.id,member:i,status:'FULLY BEYOND RECEIVER',receivers:r.receivers});
    else if(r.trimmed)issues.push({truss:t.id,member:i,status:'CLIPPED TO RECEIVER FACE',receivers:r.receivers});
  }
  return issues;
}
