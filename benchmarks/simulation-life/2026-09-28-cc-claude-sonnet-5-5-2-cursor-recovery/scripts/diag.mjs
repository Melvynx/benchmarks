import { Sim, DEFAULTS, K } from '../src/sim.js';
Object.assign(K, {RED_EFF:0.75,WORTH:18,REDIDLE:0.2});
const s = new Sim({ ...DEFAULTS, worldSize:60,trees:16,blues:40,reds:8,redSpeed:6.5, seed: 1 });
let n=0;
while (s.t < 200) { s.step(); s.events.length=0; if (s.t>=n) { n+=20;
 const r=s.blobs.filter(b=>b.kind==='red'); const acts={}; r.forEach(b=>acts[b.action]=(acts[b.action]||0)+1);
 const bl=s.blobs.filter(b=>b.kind==='blue'); const ba={}; bl.forEach(b=>ba[b.action]=(ba[b.action]||0)+1);
 console.log(s.t.toFixed(0),'contacts',s.contacts,'redE',(r.reduce((a,b)=>a+b.energy,0)/(r.length||1)).toFixed(0),JSON.stringify(acts),'blueE',(bl.reduce((a,b)=>a+b.energy,0)/bl.length).toFixed(0),JSON.stringify(ba));}}
