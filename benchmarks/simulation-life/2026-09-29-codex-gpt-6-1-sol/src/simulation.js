export const defaults = {growth: 0.65, fruitLimit: 5, delay: 6, blueUse: 0.5, blueSpeed: 8, blueVision: 65, blueCopy: 100, eating: 1.2, redUse: 0.6, redSpeed: 9, redVision: 85, strength: 12, redCopy: 130, pause: 4, trees: 14, blues: 24, reds: 8, size: 170, seed: 42};
export const presets = {
  'Balanced garden': {},
  'Fruit-rich garden': {growth: 1.3, fruitLimit: 8, trees: 20, reds: 5},
  'Red-heavy garden': {reds: 22, strength: 44},
  'Fragile balance': {trees: 10, blues: 18, reds: 7, growth: 0.4},
  'Low-fruit garden': {trees: 6, fruitLimit: 3, growth: 0.2, blues: 12, reds: 3}
};
export class Garden {
  constructor(config = {}) { this.config = {...defaults, ...config}; this.state = this.config.seed >>> 0; this.time = 0; this.nextId = 1; this.births = 0; this.fades = 0; this.contacts = 0; this.meals = 0; this.history = []; this.blobs = []; this.trees = []; for(let index=0;index<this.config.trees;index++){const point=this.point();this.trees.push({...point,fruit:this.config.fruitLimit,delay:0,id:index});} for(let index=0;index<this.config.blues;index++)this.spawn('blue');for(let index=0;index<this.config.reds;index++)this.spawn('red');this.record(); }
  random(){this.state += 0x6D2B79F5;let value=this.state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return ((value^value>>>14)>>>0)/4294967296;}
  point(){const angle=this.random()*Math.PI*2;const radius=Math.sqrt(this.random())*this.config.size*0.87;return {x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};}
  spawn(kind,parent){const point=parent?{x:parent.x+this.random()*8-4,y:parent.y+this.random()*8-4}:this.point();this.blobs.push({...point,id:this.nextId++,kind,energy:parent?42:50+this.random()*30,age:0,pause:0,action:'Wandering',angle:this.random()*Math.PI*2,trait:parent?parent.trait*(0.96+this.random()*0.08):0.9+this.random()*0.2,generation:parent?parent.generation+1:1,parent:parent?.id??null});}
  counts(){return {fruit:Math.floor(this.trees.reduce((sum,tree)=>sum+tree.fruit,0)),blue:this.blobs.filter(blob=>blob.kind==='blue').length,red:this.blobs.filter(blob=>blob.kind==='red').length};}
  record(){const counts=this.counts();this.initialCounts??={...counts};this.history.push({time:this.time,...counts});if(this.history.length>1200)this.history.shift();}
  tick(delta=0.1){const config=this.config;this.time+=delta;for(const tree of this.trees){tree.delay=Math.max(0,tree.delay-delta);if(!tree.delay)tree.fruit=Math.min(config.fruitLimit,tree.fruit+config.growth*delta);}
    const newborns=[];
    for(const blob of this.blobs){blob.age+=delta;blob.pause=Math.max(0,blob.pause-delta);const blue=blob.kind==='blue';blob.energy-=(blue?config.blueUse:config.redUse)*delta*(blob.pause>0?0.4:1);if(blob.pause>0)continue;
      let target=null;let distance=blue?config.blueVision:config.redVision;let flee=false;
      if(blue){for(const tree of this.trees){const separation=Math.hypot(tree.x-blob.x,tree.y-blob.y);if(tree.fruit>=1&&separation<distance){distance=separation;target=tree;}}
        for(const other of this.blobs){if(other.kind==='red'){const separation=Math.hypot(other.x-blob.x,other.y-blob.y);if(separation<19&&separation>7){target={x:blob.x*2-other.x,y:blob.y*2-other.y};flee=true;break;}}}
      }else{for(const other of this.blobs){if(other.kind!=='blue'||other.energy<18)continue;const separation=Math.hypot(other.x-blob.x,other.y-blob.y);if(separation<distance){distance=separation;target=other;}}}
      if(target){blob.angle=Math.atan2(target.y-blob.y,target.x-blob.x);blob.action=flee?'Keeping a little distance':blue?'Looking for fruit':'Following a blue';if(!flee&&distance<9){if(blue){if(target.fruit>=1){target.fruit-=1;target.delay=config.delay;blob.energy=Math.min(160,blob.energy+24);blob.pause=config.eating;blob.action='Nibbling fruit';this.meals++;}}else if(!target.contactUntil||target.contactUntil<this.time){const taken=Math.min(target.energy,config.strength);target.energy-=taken;target.contactUntil=this.time+config.pause;blob.energy=Math.min(170,blob.energy+taken*0.85);blob.pause=config.pause;blob.action='Happy little pause';this.contacts++;}continue;}}
      else{blob.angle+=(this.random()-0.5)*1.1;blob.action='Wandering';}
      const speed=(blue?config.blueSpeed:config.redSpeed)*blob.trait;blob.x+=Math.cos(blob.angle)*speed*delta;blob.y+=Math.sin(blob.angle)*speed*delta;blob.energy-=speed*0.022*delta;
      const radius=Math.hypot(blob.x,blob.y);if(radius>config.size-8){blob.x*= (config.size-9)/radius;blob.y*=(config.size-9)/radius;blob.angle+=Math.PI*0.8;}
      if(blob.energy>(blue?config.blueCopy:config.redCopy)&&blob.age>7&&this.blobs.length+newborns.length<350){blob.energy-=52;blob.pause=1.5;blob.action='Making a little copy';newborns.push(blob);this.births++;}
    }
    const previous=this.blobs.length;this.blobs=this.blobs.filter(blob=>blob.energy>0);this.fades+=previous-this.blobs.length;for(const parent of newborns)this.spawn(parent.kind,parent);if(Math.floor(this.time+1e-7)!==Math.floor(this.time-delta+1e-7))this.record();
  }
  summary(){const count=this.counts();if(this.time<20)return 'A little world, full of possibilities. Let it grow and see what happens.';if(!count.blue&&!count.red)return 'Both groups faded. Try more fruit or lower energy use to bring the garden back to life.';if(!count.red)return 'The reds faded, leaving a quieter garden for blue blobs to explore.';if(!count.blue)return 'Blue blobs became rare first. Without them, the reds are running low on energy.';if(this.config.growth<0.3)return 'Less fruit, a smaller world. Limited food keeps the garden population gentle.';return 'Fruit feeds the blues. Blues feed the reds. Every little change ripples through the garden.';}
}
