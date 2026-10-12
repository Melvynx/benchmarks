import puppeteer from 'puppeteer-core';
import {mkdirSync} from 'fs';
import {pathToFileURL} from 'url';
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const url=pathToFileURL(process.cwd()+'/anim.html').href;
const [,, mode, ...rest]=process.argv;
const browser=await puppeteer.launch({executablePath:CH,headless:true,args:['--allow-file-access-from-files','--hide-scrollbars','--force-device-scale-factor=1']});
async function mk(){const p=await browser.newPage();await p.setViewport({width:1920,height:1080,deviceScaleFactor:1});await p.goto(url);await p.evaluate(()=>window.ready);return p}
if(mode==='shots'){
  mkdirSync('shots',{recursive:true});const p=await mk();
  for(const t of rest){await p.evaluate(t=>render(t),+t);await p.screenshot({path:`shots/t${t}.png`})}
}else{
  const FPS=30,N=45*FPS,W=6;mkdirSync('frames',{recursive:true});
  let next=0;
  await Promise.all(Array.from({length:W},async()=>{const p=await mk();
    while(true){const f=next++;if(f>=N)break;await p.evaluate(t=>render(t),f/FPS);
      await p.screenshot({path:`frames/f${String(f).padStart(5,'0')}.png`})}}));
}
await browser.close();
