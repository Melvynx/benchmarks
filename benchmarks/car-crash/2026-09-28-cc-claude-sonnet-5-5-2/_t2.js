const fs=require('fs');const m={exports:{}};new Function('module',fs.readFileSync(__dirname+'/_script.js','utf8'))(m);
const {createScene,DEFAULTS,STEP}=m.exports;
const sc=createScene(DEFAULTS),w=sc.world,c=sc.car;
for(let i=0;i<90;i++){w.step(); if(i%6==0||w.hit&&i<80) console.log(i,(w.time).toFixed(3),'vx',c.vx.toFixed(3),'x',c.x.toFixed(3),'vy',c.vy.toExponential(2),'y',c.y.toFixed(4),'ang',Math.atan2(c.s,c.c).toExponential(2),'hit',w.hit);}
