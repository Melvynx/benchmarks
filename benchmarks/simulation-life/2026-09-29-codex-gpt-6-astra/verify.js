import assert from 'node:assert/strict';
import {Garden,presets} from './simulation.js';
const run=(preset,seconds)=>{const g=new Garden({...preset});for(let i=0;i<seconds*20;i++)g.tick(.05);return g};
const a=run(presets.balanced,60),b=run(presets.balanced,60);
assert.deepEqual(a.history,b.history,'Seeds must reproduce identical histories');
assert.ok(a.births>0,'Fruit energy must support reproduction');
const balanced=run(presets.balanced,1200);
assert.ok(balanced.counts().blue>0&&balanced.counts().red>0,'Balanced garden must sustain both groups for 20 minutes');
const blue=balanced.history.map(p=>p.blue),red=balanced.history.map(p=>p.red);
assert.ok(Math.max(...blue)-Math.min(...blue)>15,'Blue population must fluctuate');
assert.ok(Math.max(...red)-Math.min(...red)>10,'Red population must fluctuate');
assert.ok(Math.max(...blue)<120,'Food must constrain population growth');
const rich=run(presets.rich,90),low=run(presets.low,90);
assert.ok(rich.counts().blue>low.counts().blue*2,'Fruit supply must affect population');
const heavy=run(presets.red,180);
assert.equal(heavy.counts().blue,0,'Red-heavy preset must deplete blue energy');
assert.ok(heavy.counts().red<presets.red.reds,'Red population must fade after blue depletion');
for(const g of[a,balanced,rich,low,heavy]){assert.ok(g.blobs.every(b=>Number.isFinite(b.energy)&&b.energy>0));assert.ok(g.trees.every(t=>t.fruit>=0&&t.fruit<=g.settings.fruitLimit));}
console.log('PASS: deterministic seeds, reproduction, sustained population waves, bounded growth, fruit-rich / low-fruit contrast, red-heavy cascade, finite energy and fruit.');
