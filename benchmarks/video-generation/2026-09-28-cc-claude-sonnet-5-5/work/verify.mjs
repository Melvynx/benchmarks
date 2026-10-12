import puppeteer from 'puppeteer-core';
import {pathToFileURL} from 'url';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
for(const [w,h] of [[1920,1080],[1000,900],[1400,500]]){
  const p=await b.newPage();await p.setViewport({width:w,height:h});
  await p.goto(pathToFileURL(process.cwd()+'/../index.html').href);
  await p.waitForFunction(()=>document.querySelector('video').readyState>=3);
  await p.evaluate(()=>document.querySelector('video').play());
  await new Promise(r=>setTimeout(r,2500));
  const r=await p.evaluate(()=>{const v=document.querySelector('video'),q=v.getBoundingClientRect();return {title:document.title,dur:v.duration,vw:v.videoWidth,vh:v.videoHeight,t:v.currentTime,paused:v.paused,err:!!v.error,box:[q.x,q.y,q.width,q.height].map(Math.round),ratio:(q.width/q.height).toFixed(4)}});
  console.log(w,h,JSON.stringify(r));
  if(w===1000)await p.screenshot({path:'player.png'});
}
await b.close();
