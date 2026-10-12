import test from 'node:test';
import assert from 'node:assert/strict';
import {Garden,presets} from './simulation.js';

const advance=(garden,days)=>{for(let index=0;index<days*10;index++)garden.tick(.1);return garden;};

test('the same seed and settings reproduce the same world and history',()=>{
  const first=advance(new Garden({seed:123}),120);
  const second=advance(new Garden({seed:123}),120);
  assert.deepEqual(first.blobs,second.blobs);
  assert.deepEqual(first.history,second.history);
  assert.notDeepEqual(new Garden({seed:124}).trees,new Garden({seed:123}).trees);
});

test('a meal removes attached fruit and imposes an actual behavior pause',()=>{
  const garden=new Garden({trees:1,blues:1,reds:0});
  Object.assign(garden.blobs[0],{x:0,y:0,energy:40});
  Object.assign(garden.trees[0],{x:0,y:0});
  garden.tick();
  assert.equal(garden.trees[0].fruit,4);
  assert.ok(garden.blobs[0].energy>60);
  assert.equal(garden.blobs[0].action,'Nibbling fruit');
  assert.ok(garden.blobs[0].pause>0);
  garden.tick();
  assert.equal(garden.trees[0].fruit,4);
  assert.equal(garden.meals,1);
});

test('depleted fruit rests before slowly growing back',()=>{
  const garden=new Garden({trees:1,blues:0,reds:0,growth:.5});
  garden.trees[0].fruit=0;garden.trees[0].delay=2;
  advance(garden,1);
  assert.equal(garden.trees[0].fruit,0);
  advance(garden,3);
  assert.ok(garden.trees[0].fruit>.9&&garden.trees[0].fruit<1.2);
});

test('contact transfers energy and the red must pause',()=>{
  const garden=new Garden({trees:0,blues:1,reds:1,strength:12});
  const blue=garden.blobs.find(blob=>blob.kind==='blue');
  const red=garden.blobs.find(blob=>blob.kind==='red');
  Object.assign(blue,{x:0,y:0,energy:60,pause:2});
  Object.assign(red,{x:0,y:0,energy:40});
  garden.tick();
  assert.ok(blue.energy<49);
  assert.ok(red.energy>49);
  assert.equal(red.action,'Happy little pause');
  advance(garden,1);
  assert.equal(garden.contacts,1);
});

test('copying spends more parent energy than the child receives',()=>{
  const garden=new Garden({trees:0,blues:1,reds:0});
  Object.assign(garden.blobs[0],{energy:120,age:10});
  garden.tick();
  assert.equal(garden.blobs.length,2);
  assert.ok(garden.blobs[0].energy<69);
  assert.equal(garden.blobs[1].energy,42);
  assert.equal(garden.blobs[1].generation,2);
  assert.equal(garden.blobs[1].parent,garden.blobs[0].id);
});

test('without food, energy is exhausted and both groups fade',()=>{
  const garden=advance(new Garden({trees:0,blues:12,reds:4}),400);
  assert.equal(garden.blobs.length,0);
  assert.ok(garden.fades>=16);
});

test('fruit-rich grows more blues than low-fruit, from real interactions',()=>{
  const rich=advance(new Garden(presets['Fruit-rich garden']),100);
  const low=advance(new Garden(presets['Low-fruit garden']),100);
  assert.ok(rich.counts().blue>low.counts().blue*2);
  assert.ok(rich.births>low.births);
  assert.ok(rich.meals>low.meals);
});

test('balanced world sustains both groups and stays bounded for 2500 days',()=>{
  const garden=advance(new Garden(),2500);
  assert.ok(garden.counts().blue>0);
  assert.ok(garden.counts().red>0);
  assert.ok(Math.max(...garden.history.map(point=>point.blue))<150);
  assert.ok(new Set(garden.history.map(point=>point.blue)).size>15);
  assert.ok(new Set(garden.history.map(point=>point.red)).size>4);
});

test('ten steps record exactly one simulation day despite floating point drift',()=>{
  const garden=advance(new Garden(),1);
  assert.equal(garden.history.length,2);
  assert.ok(Math.abs(garden.history.at(-1).time-1)<1e-7);
});

test('red-heavy world loses blues before reds fade',()=>{
  const garden=advance(new Garden(presets['Red-heavy garden']),400);
  const blueFades=garden.history.find(point=>point.blue===0);
  const redFades=garden.history.find(point=>point.red===0);
  assert.ok(blueFades&&redFades);
  assert.ok(blueFades.time<redFades.time);
});

test('recorded samples match actual counts and never go negative',()=>{
  const garden=advance(new Garden(),200);
  for(const point of garden.history){assert.ok(point.fruit>=0&&point.blue>=0&&point.red>=0);}
  garden.record();
  assert.deepEqual(garden.history.at(-1),{time:garden.time,...garden.counts()});
  assert.ok(garden.blobs.every(blob=>Math.hypot(blob.x,blob.y)<=garden.config.size));
});
