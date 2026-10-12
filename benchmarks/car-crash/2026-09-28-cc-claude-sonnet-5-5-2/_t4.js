const fs=require('fs');const m={exports:{}};new Function('module',fs.readFileSync(__dirname+'/_script.js','utf8'))(m);
const {createScene,DEFAULTS,STEP}=m.exports;
const sc=createScene(DEFAULTS),w=sc.world,c=sc.car;
for(let i=0;i<78;i++){w.step(); if(i>=68){const cc=w.contacts.filter(k=>k.carBrick).map(k=>k.n+':'+k.pts[0].nImp.toFixed(1)).join(' ');console.log(i,'vx',c.vx.toFixed(4),'x',c.x.toFixed(4),'nCar-brick contacts',cc, 'tow',c.tow);}}
