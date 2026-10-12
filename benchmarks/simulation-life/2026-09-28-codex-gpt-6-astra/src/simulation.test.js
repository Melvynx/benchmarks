import assert from 'node:assert/strict';
import {Garden,presets} from './simulation.js';
const a=new Garden(),b=new Garden();
for(let i=0;i<100;i++){a.tick(.05);b.tick(.05);}
assert.deepEqual(a.blobs,b.blobs,'The same seed and timestep must reproduce the same garden');
const eater=new Garden({trees:1,blue:1,red:0});
eater.blobs[0].x=eater.plants[0].x;eater.blobs[0].y=eater.plants[0].y;
const fruit=eater.plants[0].fruit;eater.tick(.05);
assert.equal(eater.plants[0].fruit,fruit-1,'Eating visibly consumes one fruit');
const energy=eater.blobs[0].energy;eater.tick(.1);
assert.equal(eater.plants[0].fruit,fruit-1,'Eating pause prevents instant repeat feeding');
assert(eater.blobs[0].energy<energy,'Waiting still costs energy');
const balanced=new Garden();for(let i=0;i<18000;i++)balanced.tick(.05);
assert(balanced.counts().blue>0&&balanced.counts().red>0,'Balanced default supports both groups for 900 simulated seconds');
assert(balanced.history.every(p=>Number.isFinite(p.blue)&&p.blue+p.red<=250),'Populations remain finite and bounded');
const low=new Garden(presets['Low-fruit garden']),rich=new Garden(presets['Fruit-rich garden']);
for(let i=0;i<600;i++){low.tick(.05);rich.tick(.05);}
assert(rich.counts().blue>low.counts().blue,'A richer harvest supports more early blue growth');
console.log('Passed: deterministic seed, fruit consumption, action cooldown, waiting cost, 900-second coexistence, bounded populations, rich vs low fruit.');
console.log('Balanced after 900 seconds:',balanced.counts());
