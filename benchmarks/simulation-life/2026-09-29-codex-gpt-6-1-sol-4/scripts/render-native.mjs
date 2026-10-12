import {writeFile} from 'node:fs/promises';
import {WorldRenderer} from '../renderer.js';
import {Garden,BASE} from '../simulation.js';
const commands=[];let next=0;
const ctx = new Proxy({}, {get(_,key){
 if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{const id=next++;commands.push({op:key,args,id});return {gradient:id,addColorStop:(offset,color)=>commands.push({op:'stop',id,args:[offset,color]})}};
 return (...args)=>commands.push({op:key,args});
},set(_,key,value){commands.push({op:'set',key,value});return true}});
globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}};
const canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width:938,height:440})};
const garden=new Garden(BASE);garden.advance(75);new WorldRenderer(canvas).draw(garden,6);
await writeFile('.verification/draw-commands.json',JSON.stringify(commands));
console.log(`Recorded ${commands.length} draw commands from the actual scene renderer.`);
