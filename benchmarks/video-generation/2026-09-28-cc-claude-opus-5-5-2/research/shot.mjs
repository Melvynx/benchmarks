import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('https://lumail.io',{waitUntil:'networkidle'}); await p.waitForTimeout(1500);
await p.screenshot({path:'research/s1.png'});
for (let i=1;i<6;i++){ await p.mouse.wheel(0,900); await p.waitForTimeout(900); await p.screenshot({path:`research/s${i+1}.png`}); }
await b.close();
