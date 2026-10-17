import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',userDataDir:new URL('.',import.meta.url).pathname+'profile'});
const p = await b.newPage(); await p.setViewport({width:1440,height:900});
await p.goto('http://localhost:4317/',{waitUntil:'networkidle0'});
console.log(await p.evaluate(()=>{const t=document.querySelector('.doctrine__text');const cs=getComputedStyle(t);return {ta:cs.textAlign, ws:cs.wordSpacing, html:t.innerHTML.slice(0,400)}}));
await b.close();
