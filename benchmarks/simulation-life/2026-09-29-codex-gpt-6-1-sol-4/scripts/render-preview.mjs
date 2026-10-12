import { writeFile } from 'node:fs/promises';
import { WorldRenderer } from '../renderer.js';
import { Garden, BASE } from '../simulation.js';
// A small SVG adapter records the real canvas renderer for a local visual preview.
class SVGContext {
  constructor() { this.elements = []; this.gradients = []; this.stack = []; this.state = { matrix: [1,0,0,1,0,0], fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, lineCap: 'butt', lineJoin: 'round', dash: [] }; }
  setTransform(a,b,c,d,e,f) { this.state.matrix = [a,b,c,d,e,f]; }
  clearRect() { this.elements = []; this.gradients = []; }
  save() { this.stack.push({ ...this.state, matrix: [...this.state.matrix] }); }
  restore() { this.state = this.stack.pop(); }
  translate(x,y) { const m=this.state.matrix; m[4]+=m[0]*x+m[2]*y;m[5]+=m[1]*x+m[3]*y; }
  rotate(a) { const [A,B,C,D,E,F]=this.state.matrix,s=Math.sin(a),c=Math.cos(a);this.state.matrix=[A*c+C*s,B*c+D*s,-A*s+C*c,-B*s+D*c,E,F]; }
  createLinearGradient(x1,y1,x2,y2) { return this.gradient('linear',{x1,y1,x2,y2}); }
  createRadialGradient(fx,fy,r0,cx,cy,r) { return this.gradient('radial',{fx,fy,cx,cy,r}); }
  gradient(type,attrs) { const stops=[]; const id='g'+this.gradients.length;this.gradients.push({id,type,attrs,stops});return {id,addColorStop:(offset,color)=>stops.push({offset,color})}; }
  beginPath() { this.path=''; }
  moveTo(x,y) { this.path+=`M${x},${y} `; }
  lineTo(x,y) { this.path+=`L${x},${y} `; }
  bezierCurveTo(a,b,c,d,e,f) { this.path+=`C${a},${b} ${c},${d} ${e},${f} `; }
  quadraticCurveTo(a,b,c,d) { this.path+=`Q${a},${b} ${c},${d} `; }
  closePath() { this.path+='Z '; }
  ellipse(x,y,rx,ry,rot,start,end) {
    const pt=a=>[x+rx*Math.cos(a)*Math.cos(rot)-ry*Math.sin(a)*Math.sin(rot),y+rx*Math.cos(a)*Math.sin(rot)+ry*Math.sin(a)*Math.cos(rot)];
    const A=pt(start),B=pt(end),mid=pt((start+end)/2),whole=Math.abs(end-start)>=Math.PI*2-.001;
    this.path+=`${this.path?'L':'M'}${A[0]},${A[1]} `;
    if(whole)this.path+=`A${rx},${ry} ${rot*180/Math.PI} 0 1 ${mid[0]},${mid[1]} A${rx},${ry} ${rot*180/Math.PI} 0 1 ${A[0]},${A[1]} `;
    else this.path+=`A${rx},${ry} ${rot*180/Math.PI} ${end-start>Math.PI?1:0} 1 ${B[0]},${B[1]} `;
  }
  fill() { const s=this.state;this.elements.push(`<path d="${this.path}" fill="${typeof s.fillStyle==='object'?'url(#'+s.fillStyle.id+')':s.fillStyle}" opacity="${s.globalAlpha}" transform="matrix(${s.matrix.join(' ')})"/>`); }
  stroke() { const s=this.state;this.elements.push(`<path d="${this.path}" fill="none" stroke="${s.strokeStyle}" stroke-width="${s.lineWidth}" stroke-linecap="${s.lineCap}" stroke-linejoin="${s.lineJoin}" stroke-dasharray="${s.dash.join(' ')}" opacity="${s.globalAlpha}" transform="matrix(${s.matrix.join(' ')})"/>`); }
  setLineDash(dash) { this.state.dash=dash; }
  clip() {}
  svg(w,h) { const defs=this.gradients.map(g=>`<${g.type}Gradient id="${g.id}" gradientUnits="userSpaceOnUse" ${Object.entries(g.attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${g.stops.map(s=>`<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</${g.type}Gradient>`).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs><rect width="100%" height="100%" fill="#faf9f0"/>${this.elements.join('')}</svg>`; }
}
for(const prop of ['fillStyle','strokeStyle','lineWidth','globalAlpha','lineCap','lineJoin','filter'])Object.defineProperty(SVGContext.prototype,prop,{get(){return this.state[prop]},set(v){this.state[prop]=v}});
globalThis.window = { devicePixelRatio: 1 };
globalThis.ResizeObserver = class { observe() {} };
const ctx = new SVGContext();const canvas = {getContext:()=>ctx,getBoundingClientRect:()=>({width:938,height:440})};
const garden=new Garden(BASE);garden.advance(75);const renderer=new WorldRenderer(canvas);renderer.draw(garden,6);
await writeFile('garden-preview.svg',ctx.svg(938,440));
console.log('Rendered the actual garden scene to garden-preview.svg',garden.counts());
