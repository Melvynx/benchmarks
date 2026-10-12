const fs=require('fs');const m={exports:{}};new Function('module',fs.readFileSync(__dirname+'/_script.js','utf8'))(m);
const {createScene,DEFAULTS,STEP}=m.exports;
const sc=createScene(DEFAULTS),w=sc.world,c=sc.car;
for(let i=0;i<90;i++){const vb=c.vx,xb=c.x;w.step(); if(w.hit){console.log('hit at step',i,'vx before',vb,'x before',xb,'nose before',xb+2.1*1 ,'wall face',sc.wallX0);
 for(const k of w.contacts) if(k.carBrick){console.log('contact', k.sa.type,k.sb.type,'n',k.n,'seps',k.pts.slice(0,k.n).map(p=>p.sep.toFixed(4)),'nx',k.nx.toFixed(2),k.ny.toFixed(2));}
 break;}}
