import * as THREE from './mini3d.js';

export function createWorld(container, onPet) {
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);camera.position.set(7,5.3,10);camera.lookAt(0,.7,0);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xffffff,0);renderer.outputColorSpace=THREE.SRGBColorSpace;container.prepend(renderer.domElement);
  const ambient=new THREE.HemisphereLight('#fff9e9','#829874',2.6);scene.add(ambient);const sun=new THREE.DirectionalLight('#fff4d5',3.2);sun.position.set(-3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.bias=-.001;scene.add(sun);
  const materials={};
  function material(color,roughness=.85){const key=color+roughness;return materials[key]??(materials[key]=new THREE.MeshStandardMaterial({color,roughness}));}
  function ball(parent,color,position,scale){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),material(color));mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,color,position,top,bottom,height,segments=64){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,segments),material(color));mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const island=new THREE.Group();scene.add(island);
  cylinder(island,'#c7b99a',[0,-.35,0],3.65,3.32,.55);cylinder(island,'#a8c987',[0,-.06,0],3.7,3.65,.17);cylinder(island,'#bdd69c',[0,.025,0],3.65,3.65,.03);
  const path=new THREE.Mesh(new THREE.CircleGeometry(1,64),material('#ded7ae'));path.rotation.x=-Math.PI/2;path.position.set(0,.045,.15);path.scale.set(1.6,1.2,1);path.receiveShadow=true;island.add(path);
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,48),material('#c4bd93'));shadow.rotation.x=-Math.PI/2;shadow.position.set(.1,.052,.45);shadow.scale.set(.85,.58,1);island.add(shadow);
  const cow=new THREE.Group();cow.position.set(.1,.08,.45);cow.rotation.y=.34;scene.add(cow);
  const body=ball(cow,'#fff9eb',[0,1.04,0],[.83,.91,.7]);
  ball(cow,'#414741',[-.48,1.12,-.36],[.43,.48,.35]);ball(cow,'#414741',[.47,.85,-.19],[.4,.42,.4]);
  const head=new THREE.Group();head.position.set(0,1.9,.29);cow.add(head);
  ball(head,'#fffbee',[0,0,0],[.81,.72,.7]);ball(head,'#414741',[-.38,.24,.4],[.31,.38,.26]);
  const muzzle=ball(head,'#f0b5ae',[0,-.28,.61],[.61,.36,.29]);
  [-1,1].forEach(side=>{
    const ear=ball(head,'#fff6e6',[side*.88,.17,-.01],[.4,.19,.22]);ear.rotation.z=side*.25;
    const inner=ball(head,'#e9b1a5',[side*.92,.19,.12],[.24,.105,.09]);inner.rotation.z=side*.25;
    const horn=cylinder(head,'#d7bd87',[side*.48,.68,-.09],.035,.105,.29,24);horn.rotation.z=-side*.24;
    ball(head,'#363b34',[side*.29,.03,.627],[.076,.112,.045]);ball(head,'#ffffff',[side*.275,.07,.67],[.024,.031,.016]);
    ball(head,'#d89391',[side*.2,-.23,.874],[.064,.043,.015]);ball(head,'#edb8ad',[side*.54,-.16,.51],[.125,.065,.038]);
    [-1,1].forEach(depth=>{ball(cow,'#fff9eb',[side*.47,.39,depth*.34],[.21,.4,.21]);ball(cow,'#464940',[side*.47,.14,depth*.34],[.22,.14,.23]);});
  });
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.105,.014,8,32,Math.PI),material('#9c6360'));mouth.rotation.z=Math.PI;mouth.position.set(0,-.405,.88);head.add(mouth);
  const hair=ball(head,'#fff8e8',[.07,.62,.28],[.23,.14,.2]);hair.rotation.z=-.2;
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.37,.065,12,40),material('#a2ac71'));collar.rotation.x=Math.PI/2;collar.position.set(0,1.63,.1);cow.add(collar);ball(cow,'#e1ad50',[0,1.54,.62],[.11,.12,.09]);
  const tail=new THREE.Group();tail.position.set(.59,1.04,-.5);tail.rotation.z=-.65;cow.add(tail);cylinder(tail,'#fff4dc',[0,.25,0],.038,.045,.5,16);ball(tail,'#454b40',[0,.52,0],[.085,.13,.08]);
  function tree(x,z,scale){const group=new THREE.Group();group.position.set(x,0,z);group.scale.setScalar(scale);island.add(group);cylinder(group,'#ae8864',[0,.75,0],.13,.17,1.5,16);ball(group,'#86ae69',[0,1.83,0],[.77,.95,.7]);ball(group,'#91b775',[-.42,1.64,.02],[.53,.61,.56]);ball(group,'#9bbd80',[.4,1.97,.03],[.54,.65,.56]);}
  tree(-2.5,-1.1,1.1);tree(2.4,-1.75,.78);
  function fence(x,z,rotation){const group=new THREE.Group();group.position.set(x,.05,z);group.rotation.y=rotation;island.add(group);[-.7,0,.7].forEach(offset=>{const post=new THREE.Mesh(new THREE.BoxGeometry(.11,.66,.11),material('#f7ebcf'));post.position.set(offset,.33,0);post.castShadow=true;group.add(post);ball(group,'#fff1d3',[offset,.66,0],[.07,.05,.07]);});[.23,.48].forEach(y=>{const rail=new THREE.Mesh(new THREE.BoxGeometry(1.6,.09,.065),material('#f3e8cd'));rail.position.y=y;rail.castShadow=true;group.add(rail);});}
  fence(-.8,-2.5,-.12);fence(.8,-2.5,.15);
  function flower(x,z,color,scale=1){const group=new THREE.Group();group.position.set(x,.06,z);group.scale.setScalar(scale);island.add(group);cylinder(group,'#759659',[0,.14,0],.016,.016,.28,8);for(let petal=0;petal<5;petal++){const angle=petal/5*Math.PI*2;ball(group,color,[Math.cos(angle)*.08,.32+Math.sin(angle)*.08,0],[.075,.075,.032]);}ball(group,'#eac36b',[0,.32,.025],[.045,.045,.025]);}
  [[-2,1.5,'#fff4dc'],[-2.2,1.2,'#fff4dc'],[2.3,.7,'#edb2a9'],[2.5,.9,'#edb2a9'],[1.9,1.85,'#fff4dc'],[-1.8,-.65,'#e8b0ba'],[.7,-1.8,'#fff4dc']].forEach(args=>flower(...args));
  for(let index=0;index<32;index++){const angle=index*2.399;const radius=2.3+(index%5)*.2;const x=Math.sin(angle)*radius,z=Math.cos(angle)*radius;const blade=ball(island,index%2?'#8eaf70':'#9cbb7c',[x,.13,z],[.07,.18,.035]);blade.rotation.z=.3;}
  [[-2.6,.65],[2.85,-.3],[-1.45,2.25]].forEach(([x,z])=>ball(island,'#d4d4ba',[x,.1,z],[.22,.13,.17]));
  const mushroom=new THREE.Group();mushroom.position.set(-2.5,.08,1.6);island.add(mushroom);cylinder(mushroom,'#fff3d8',[0,.12,0],.065,.07,.24,16);ball(mushroom,'#d7957f',[0,.25,0],[.18,.1,.17]);ball(mushroom,'#fff1de',[-.06,.31,.07],[.035,.01,.032]);
  const clouds=[];[[-3.5,3.4,-3,.65],[2.9,3.8,-3.5,.55]].forEach(([x,y,z,scale])=>{const cloud=new THREE.Group();cloud.position.set(x,y,z);cloud.scale.setScalar(scale);scene.add(cloud);ball(cloud,'#ffffff',[0,0,0],[.8,.3,.35]);ball(cloud,'#ffffff',[-.27,.22,0],[.38,.38,.32]);ball(cloud,'#ffffff',[.22,.16,0],[.43,.38,.34]);clouds.push(cloud);});
  const food=new THREE.Group();scene.add(food);food.visible=false;
  const apple=ball(food,'#dd6551',[0,0,0],[.2,.19,.19]);const stem=cylinder(food,'#7a6950',[0,.2,0],.015,.02,.1,12);const leaf=ball(food,'#7b9f55',[.08,.23,0],[.1,.025,.045]);leaf.rotation.z=.3;
  const particles=[];for(let index=0;index<14;index++){const particle=ball(scene,'#e8b5bb',[0,0,0],[.07,.07,.07]);particle.visible=false;particles.push(particle);}
  let action='idle',actionStart=0,frame=0,angle=.58,pointerStart=null,dragged=false;
  const clock=new THREE.Clock();
  function resize(){const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(container);resize();
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','button');renderer.domElement.setAttribute('aria-label','Pet Cowdie. Press Enter to give a little love.');renderer.domElement.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onPet();}});
  renderer.domElement.addEventListener('pointerdown',event=>{pointerStart={x:event.clientX,y:event.clientY};dragged=false;renderer.domElement.setPointerCapture(event.pointerId);});
  renderer.domElement.addEventListener('pointermove',event=>{if(!pointerStart)return;const delta=event.clientX-pointerStart.x;if(Math.abs(delta)>2)dragged=true;angle-=delta*.006;pointerStart.x=event.clientX;camera.position.set(Math.sin(angle)*12.2,5.3,Math.cos(angle)*12.2);camera.lookAt(0,.7,0);});
  renderer.domElement.addEventListener('pointerup',event=>{if(!dragged){const rect=renderer.domElement.getBoundingClientRect();const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);if(ray.intersectObjects(cow.children,true).length)onPet();}pointerStart=null;});
  function render(){frame=requestAnimationFrame(render);const time=clock.getElapsedTime(),elapsed=time-actionStart;
    cow.position.y=.08+Math.sin(time*2)*.025;cow.rotation.z=Math.sin(time*1.3)*.015;body.scale.y=.91+Math.sin(time*2)*.015;head.rotation.z=Math.sin(time*.8)*.035;head.rotation.x=0;tail.rotation.x=Math.sin(time*3)*.2;mouth.scale.setScalar(1);food.visible=false;particles.forEach(p=>p.visible=false);
    if(action!=='idle'&&elapsed>4.2)action='idle';
    if(action==='feed'){food.visible=elapsed<2.4;food.position.set(.1,1.05+Math.min(1,elapsed)*.9,2-Math.min(1,elapsed)*.65);food.scale.setScalar(elapsed>1.3?Math.max(.05,1-(elapsed-1.3)/1.1):1);food.rotation.y=time*2;head.rotation.x=Math.sin(elapsed*13)*.07;mouth.scale.y=.8+Math.sin(elapsed*14)*.5;cow.rotation.z=Math.sin(elapsed*8)*.04;}
    if(action==='play'){cow.position.y=.08+Math.abs(Math.sin(elapsed*4))*.65;cow.rotation.y=.34+Math.sin(elapsed*3)*.4;head.rotation.z=Math.sin(elapsed*4)*.1;}
    if(action==='sleep'){cow.scale.y=1-Math.sin(Math.min(elapsed,1)*Math.PI/2)*.25;head.rotation.x=.18;head.rotation.z=.15;}else{cow.scale.y+=(1-cow.scale.y)*.08;}
    if(action==='pet'||action==='wash'||(action==='feed'&&elapsed>2)){particles.forEach((particle,index)=>{particle.visible=true;particle.material=material(action==='wash'?'#ceeaf0':'#e7b4b9',action==='wash'?.15:.8);const phase=(elapsed*.6+index/14)%1;particle.position.set(Math.sin(index*2.4)*(.7+phase*.5),1.3+phase*2.2,.5+Math.cos(index*2.4)*.6);particle.scale.setScalar((1-phase)*.085);});head.rotation.z=Math.sin(time*5)*.06;}
    clouds.forEach((cloud,index)=>cloud.position.y+=(Math.sin(time*.6+index)*.001));renderer.render(scene,camera);
  }render();
  return {animate(type,foodType){action=type;actionStart=clock.getElapsedTime();apple.material=material(foodType==='carrot'?'#e99a48':foodType==='berry'?'#d9676c':'#dd6551');apple.scale.set(...(foodType==='carrot'?[.1,.3,.1]:[.2,.19,.19]));},setNight(value){ambient.intensity=value?1.2:2.6;sun.intensity=value?1:3.2;sun.color.set(value?'#b7c7ff':'#fff4d5');},reset(){angle=.58;camera.position.set(7,5.3,10);camera.lookAt(0,.7,0);},photo(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},dispose(){cancelAnimationFrame(frame);renderer.dispose();}};
}
