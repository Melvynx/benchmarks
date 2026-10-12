export const defaults = {growth:0.32,fruitLimit:6,returnDelay:6,blueUse:1.2,blueSpeed:13,blueVision:130,blueCopy:100,blueEat:1.4,redUse:0.9,redSpeed:14,redVision:165,redStrength:28,redCopy:140,redPause:3.5,trees:16,blues:28,reds:7,worldSize:290,seed:2481,speed:1};
export const presets = {
 'Balanced garden':{},
 'Fruit-rich garden':{growth:0.65,trees:22,fruitLimit:8,reds:5},
 'Red-heavy garden':{reds:22,blues:32,redUse:1.5,redStrength:48,redCopy:115,redPause:2.5,redSpeed:15},
 'Fragile balance':{trees:12,growth:0.23,blues:22,reds:8},
 'Low-fruit garden':{trees:6,growth:0.12,fruitLimit:3,blues:14,reds:2,redUse:1.5,redStrength:20}
};
export class Garden {
 constructor(config={}) { this.config={...defaults,...config}; this.reset(); }
 random(){let t=this.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
 point(){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*(this.config.worldSize-32);return {x:Math.cos(a)*r,z:Math.sin(a)*r};}
 reset(){this.rng=Number(this.config.seed);this.time=0;this.nextId=1;this.births=0;this.contacts=0;this.eaten=0;this.history=[];this.blobs=[];this.trees=Array.from({length:this.config.trees},()=>({...this.point(),fruit:this.config.fruitLimit,delay:0,scale:.8+this.random()*.4}));for(const [kind,n] of [['blue',this.config.blues],['red',this.config.reds]])for(let i=0;i<n;i++)this.spawn(kind);this.record();}
 spawn(kind,parent){this.blobs.push({id:this.nextId++,kind,...(parent?{x:parent.x+8,z:parent.z+8}:this.point()),energy:parent?38:55+this.random()*25,age:0,action:'Wandering',pause:0,immune:0,heading:this.random()*6.28,wander:0,speed:parent?parent.speed:1,vision:1,parent:parent?.id??null,generation:parent?parent.generation+1:0});}
 counts(){return {blue:this.blobs.filter(b=>b.kind==='blue').length,red:this.blobs.filter(b=>b.kind==='red').length,fruit:Math.floor(this.trees.reduce((s,t)=>s+t.fruit,0))};}
 record(){this.history.push({time:this.time,...this.counts()});if(this.history.length>1600)this.history.splice(0,1);}
 tick(dt=.1){const c=this.config;this.time+=dt;for(const t of this.trees){t.delay=Math.max(0,t.delay-dt);if(!t.delay)t.fruit=Math.min(c.fruitLimit,t.fruit+c.growth*dt);t.fruit=Math.min(t.fruit,c.fruitLimit);}
 const blues=this.blobs.filter(b=>b.kind==='blue');const reds=this.blobs.filter(b=>b.kind==='red');const babies=[];
 for(const b of this.blobs){b.age+=dt;b.immune=Math.max(0,b.immune-dt);b.pause=Math.max(0,b.pause-dt);const blue=b.kind==='blue';b.energy-=(blue?c.blueUse:c.redUse)*dt*(b.pause?.42:1);if(b.energy<=0)continue;if(b.pause)continue;
 let target=null,best=Infinity;const range=(blue?c.blueVision:c.redVision)*b.vision;const candidates=blue?this.trees.filter(t=>t.fruit>=1):blues.filter(p=>p.energy>0&&!p.immune);
 for(const p of candidates){const d=Math.hypot(b.x-p.x,b.z-p.z);if(d<best&&d<range){target=p;best=d;}}
 let dx=0,dz=0;b.action=target?(blue?'Finding fruit':'Following blue'):'Wandering';
 if(target){dx=(target.x-b.x)/(best||1);dz=(target.z-b.z)/(best||1);if(best<(blue?19:14)){if(blue){target.fruit-=1;target.delay=c.returnDelay;b.energy=Math.min(150,b.energy+25);b.pause=c.blueEat;b.action='Nibbling fruit';this.eaten++;}else{target.energy-=c.redStrength;target.immune=5;b.energy=Math.min(160,b.energy+c.redStrength*.8);b.pause=c.redPause;b.action='Happy little pause';this.contacts++;}continue;}}
 else {b.wander-=dt;if(b.wander<=0){b.heading+=(this.random()-.5)*2.5;b.wander=1+this.random()*3;}dx=Math.cos(b.heading);dz=Math.sin(b.heading);}
 if(blue){for(const r of reds){const d=Math.hypot(b.x-r.x,b.z-r.z);if(d<45&&d>0){dx+=(b.x-r.x)/d*1.4;dz+=(b.z-r.z)/d*1.4;b.action='Scooting away';}}for(const p of blues){if(p===b)continue;const d=Math.hypot(b.x-p.x,b.z-p.z);if(d<17&&d>0){dx+=(b.x-p.x)/d*.55;dz+=(b.z-p.z)/d*.55;}}}
 const length=Math.hypot(dx,dz)||1;const speed=(blue?c.blueSpeed:c.redSpeed)*b.speed;b.x+=dx/length*speed*dt;b.z+=dz/length*speed*dt;b.heading=Math.atan2(dz,dx);const radius=Math.hypot(b.x,b.z);if(radius>c.worldSize-20){b.x*= (c.worldSize-21)/radius;b.z*=(c.worldSize-21)/radius;b.heading+=Math.PI;}
 const threshold=blue?c.blueCopy:c.redCopy;if(b.energy>=threshold&&this.blobs.length+babies.length<350){b.energy-=threshold*.58;b.pause=1;b.action='A new little life';babies.push(b);this.births++;}}
 this.blobs=this.blobs.filter(b=>b.energy>0);for(const p of babies)this.spawn(p.kind,p);if(Math.floor(this.time)!==Math.floor(this.time-dt))this.record(); }
 summary(){const {blue,red}=this.counts();if(this.time<15)return 'Every little life is connected. Let the garden grow and see what unfolds.';if(!blue&&!red)return 'Both groups faded. Try more fruit or lower energy use to bring your garden back to life.';if(!red)return 'The red blobs faded. With less company, blue blobs and fruit are finding a quieter balance.';if(!blue)return 'Blue blobs faded first. Without their energy source, red blobs will slowly follow.';if(this.config.trees<9)return 'A little fruit goes a long way. Limited food keeps this garden small.';return 'Fruit feeds blue blobs; blue blobs feed red. Watch how each group follows the one before it.';}
}
