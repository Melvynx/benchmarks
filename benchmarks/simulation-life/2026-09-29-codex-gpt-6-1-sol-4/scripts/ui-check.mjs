import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
// Browser-independent DOM harness. This exercises the real app module and controls;
// it does not claim to replace visual or browser verification.
const voidTags = new Set(['meta','link','input','br','img','hr']);
class Element {
  constructor(tag, attrs = {}, parent = null) { this.tagName = tag.toUpperCase(); this.attrs = attrs; this.parentNode = parent; this.children = []; this.listeners = {}; this.style = { setProperty: (k,v) => this.style[k]=v }; this.text = ''; }
  get dataset() { return Object.fromEntries(Object.entries(this.attrs).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v])); }
  get id(){return this.attrs.id} get className(){return this.attrs.class||''} set className(v){this.attrs.class=v}
  get classList(){return {toggle:(name, force)=>{const set=new Set(this.className.split(' ').filter(Boolean));const add=force===undefined?!set.has(name):force;add?set.add(name):set.delete(name);this.className=[...set].join(' ');return add},contains:name=>this.className.split(' ').includes(name)}}
  get hidden(){return 'hidden' in this.attrs} set hidden(v){v?this.attrs.hidden='':delete this.attrs.hidden}
  get open(){return 'open' in this.attrs} set open(v){v?this.attrs.open='':delete this.attrs.open}
  get value(){return this._value??this.attrs.value??''} set value(v){this._value=String(v)}
  get firstElementChild(){return this.children[0]}
  get textContent(){return this.text+this.children.map(c=>c.textContent).join('')} set textContent(v){this.text=String(v);this.children=[]}
  set innerHTML(v){this.text='';this.children=[];parse(String(v),this)} get innerHTML(){return this._inner||''}
  setAttribute(k,v){this.attrs[k]=String(v)} getAttribute(k){return this.attrs[k]??null}
  matches(selector){ if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));if(selector.startsWith('#'))return this.id===selector.slice(1);const m=selector.match(/^\[([^=\]]+)(?:="?([^"\]]+)"?)?\]$/);if(m)return m[2]===undefined?m[1]in this.attrs:this.attrs[m[1]]===m[2];return this.tagName.toLowerCase()===selector.toLowerCase() }
  querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)])}querySelector(s){return this.querySelectorAll(s)[0]??null}
  closest(s){for(let c=this;c;c=c.parentNode)if(c.matches(s))return c;return null}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  dispatch(type, extra={}){const event={target:this,preventDefault(){},...extra};for(let c=this;c;c=c.parentNode){c['on'+type]?.(event);for(const fn of c.listeners[type]||[])fn(event)}}
  click(){this.dispatch('click')}focus(){doc.activeElement=this}scrollIntoView(){}setPointerCapture(){}showModal(){this.open=true}close(){this.open=false}
  getBoundingClientRect(){return {x:0,y:0,left:0,top:0,right:938,bottom:440,width:this.id==='history-chart'?600:938,height:this.id==='history-chart'?140:440}}
}
function parse(html, root){const stack=[root];for(const token of html.match(/<[^>]+>|[^<]+/g)||[]){if(token.startsWith('</')){const tag=token.slice(2,-1).trim().toUpperCase();while(stack.length>1){const last=stack.pop();if(last.tagName===tag)break}}else if(token.startsWith('<!'))continue;else if(token.startsWith('<')){const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;const attrs={};for(const m of token.slice(tag.length+1).matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){if(m[1]!== '/')attrs[m[1]]=m[2]??m[3]??m[4]??''}const parent=stack.at(-1),el=new Element(tag,attrs,parent);parent.children.push(el);if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(el)}else stack.at(-1).text+=token}}
const doc = new Element('document');parse(await readFile('index.html','utf8'),doc);
doc.getElementById=id=>doc.querySelector('#'+id);doc.createElement=tag=>new Element(tag);doc.hidden=false;doc.activeElement=null;
globalThis.document=doc;globalThis.window={devicePixelRatio:1,matchMedia:()=>({matches:false})};globalThis.ResizeObserver=class{observe(){}};
let frame, drawingCalls=0;
globalThis.requestAnimationFrame=fn=>frame=fn;
const ctx=new Proxy({}, {get(target,key){if(['createLinearGradient','createRadialGradient'].includes(key))return ()=>({addColorStop(){}});if(key in target)return target[key];return (...args)=>{drawingCalls++;assert(args.every(a=>typeof a!=='number'||Number.isFinite(a)),`Finite drawing coordinates: ${key}`)}},set(target,key,value){target[key]=value;return true}});
doc.getElementById('garden-canvas').getContext=()=>ctx;
await import('../app.js');
const $=id=>doc.getElementById(id);
assert(Number($('blue-count').textContent)>0);assert(Number($('red-count').textContent)>0);
let clock=performance.now()+500;frame(clock);assert(drawingCalls>300,'Scene draws trees, attached fruit, and blobs');
$('play-button').click();assert.equal($('play-label').textContent,'Play');
const paused=$('elapsed').textContent;clock+=500;frame(clock);assert.equal($('elapsed').textContent,paused,'Pause freezes simulation time');
$('reset-button').click();assert.equal($('day-count').textContent,'01');assert.equal($('blue-count').textContent,'28');assert.equal($('red-count').textContent,'7');
$('step-button').click();assert.equal($('elapsed').textContent,'00:01');assert.equal($('play-label').textContent,'Play');
doc.querySelector('[data-tab="blue"]').click();assert($('rule-blueSpeed'),'Blue rules are displayed');
$('rule-blueSpeed').value='15';$('rule-blueSpeed').dispatch('input');assert.match($('value-blueSpeed').textContent,/15/);assert.equal($('preset-name').textContent,'Your own little garden');
$('preset-button').click();assert(!$('preset-menu').hidden);doc.querySelector('[data-preset="abundant"]').click();assert.equal($('preset-name').textContent,'Fruit-rich garden');assert.equal($('blue-count').textContent,'28');assert.equal($('day-count').textContent,'01');
$('guide-nav').click();assert($('guide-dialog').open);$('close-guide').click();assert(!$('guide-dialog').open);
$('garden-canvas').dispatch('keydown',{key:'Enter'});assert(!$('blob-inspector').hidden,'Keyboard can inspect a blob');assert.match($('blob-inspector').textContent,/Generation 1/);$('close-inspector').click();assert($('blob-inspector').hidden);
doc.querySelector('[data-tab="red"]').click();assert($('rule-contactStrength'),'Red contact controls are displayed');
$('randomize-button').click();assert.equal($('preset-name').textContent,'Your own little garden');assert.equal($('day-count').textContent,'01');assert(Number($('seed-label').textContent)!==4268);
doc.querySelector('[data-speed="4"]').click();assert.equal(doc.querySelector('[data-speed="4"]').getAttribute('aria-pressed'),'true');
$('play-button').click();clock+=500;frame(clock);assert.equal($('play-label').textContent,'Pause');
assert($('history-chart').children.length>0&&$('phase-chart').children.length>0,'Both charts contain real recorded data');
console.log('PASS: app startup and rendering, play/pause, reset, stepping, rule tabs, live sliders, presets, field guide, keyboard inspection, randomize, speed, and chart output (DOM harness).');
