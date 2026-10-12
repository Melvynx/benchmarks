const iconPaths = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', tune: '<path d="M4 7h9M17 7h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>', compose: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>', inbox: '<path d="M4 4h16v16H4z"/><path d="M4 13h4l2 3h4l2-3h4"/>', star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>', send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', drafts: '<path d="M4 4h16v16H4z"/><path d="m4 7 8 6 8-6"/>', archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9m-9 4h4"/>', trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', label: '<path d="M20 13 13 20 3 10V3h7z"/><circle cx="7.5" cy="7.5" r=".7"/>', more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>', back: '<path d="m15 18-6-6 6-6"/>', reply: '<path d="m10 17-5-5 5-5"/><path d="M5 12h8a6 6 0 0 1 6 6"/>', forward: '<path d="m14 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/>', print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>', attach: '<path d="m21.4 11.1-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.2a1.5 1.5 0 0 1-2.1-2.1l8.5-8.5"/>', moreVertical: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>', close: '<path d="m18 6-12 12M6 6l12 12"/>', check: '<path d="m5 12 4 4L19 6"/>', chevron: '<path d="m6 9 6 6 6-6"/>', refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.6-2.6L20 12M4 12l2.9 5.6A7 7 0 0 0 18.5 15"/>', snooze: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>', settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z"/>', chevronRight: '<path d="m9 18 6-6-6-6"/>', people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>', tag: '<path d="M20 13 13 20 3 10V3h7z"/><circle cx="7.5" cy="7.5" r=".7"/>', checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.6 1.3c-.9 1.2-2.2 1.4-2.2 3m0 3h.01"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.more}</svg>`;
const now = Date.now();
const ago = (days, hours = 10) => new Date(now - (days * 86400000) - hours * 3600000).toISOString();
const seed = [
  { id:'m101', folder:'inbox', category:'primary', from:'maya@linear.app', fromName:'Maya Chen', avatar:'MC', color:'coral', subject:'A few thoughts on the new onboarding flow', snippet:'I pulled together the feedback from this week. The simpler first-run is already making a difference…', date:ago(0,1), unread:true, starred:true, labels:['Product'], attachments:[], body:'Hey Alex,\n\nI pulled together the feedback from this week. The simpler first-run is already making a difference: activation is up 12% since we shipped the new checklist.\n\nI added three small ideas to the doc for next week. The biggest one is moving the sample project before the account setup step — it gives people something useful to explore right away.\n\nWould love your take when you have a moment.\n\nMaya', messages:[{fromName:'Maya Chen',email:'maya@linear.app',date:ago(0,1),body:'Hey Alex,\n\nI pulled together the feedback from this week. The simpler first-run is already making a difference: activation is up 12% since we shipped the new checklist.\n\nI added three small ideas to the doc for next week. The biggest one is moving the sample project before the account setup step — it gives people something useful to explore right away.\n\nWould love your take when you have a moment.\n\nMaya'}] },
  { id:'m102', folder:'inbox', category:'primary', from:'jules@figma.com', fromName:'Jules Park', avatar:'JP', color:'purple', subject:'Re: Brand explorations — round two', snippet:'Love where you landed with the warmer palette. One last thought on the wordmark spacing…', date:ago(0,3), unread:true, starred:false, labels:['Design'], attachments:[{name:'brand-explorations-v2.fig',size:'4.8 MB',type:'figma'}], body:'The warmer palette is it. I added a second page with two wordmark directions that work a little better at small sizes.\n\nThe compact version feels right for the app header, but I still like the wider one for the launch page. Let me know which way you’re leaning.', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(1,1),body:'Thanks for the first pass. Could we try something a little warmer and less geometric? The product is feeling more human.'},{fromName:'Jules Park',email:'jules@figma.com',date:ago(0,3),body:'The warmer palette is it. I added a second page with two wordmark directions that work a little better at small sizes.\n\nThe compact version feels right for the app header, but I still like the wider one for the launch page. Let me know which way you’re leaning.'}] },
  { id:'m103', folder:'inbox', category:'primary', from:'sam@northstar.studio', fromName:'Sam Rivera', avatar:'SR', color:'teal', subject:'Re: Thursday dinner?', snippet:'Booked Bar Part Time for 7:30. There’s a little patio if it’s nice out — see you there!', date:ago(0,5), unread:false, starred:false, labels:['Personal'], attachments:[], body:'Booked Bar Part Time for 7:30. There’s a little patio if it’s nice out — see you there!\n\nSam', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(1,5),body:'Hey! Still up for dinner Thursday? Somewhere in Hayes maybe?'},{fromName:'Sam Rivera',email:'sam@northstar.studio',date:ago(0,5),body:'Booked Bar Part Time for 7:30. There’s a little patio if it’s nice out — see you there!'}] },
  { id:'m104', folder:'inbox', category:'updates', from:'receipt@linear.app', fromName:'Linear', avatar:'L', color:'ink', subject:'Your Linear receipt for September', snippet:'Your monthly subscription payment of $16.00 was successful. Thanks for using Linear.', date:ago(0,8), unread:false, starred:false, labels:['Receipts'], attachments:[{name:'linear-september-receipt.pdf',size:'84 KB',type:'pdf'}], body:'Your monthly subscription payment of $16.00 was successful.\n\nWorkspace: Studio North\nPlan: Basic\nNext billing date: October 23, 2026\n\nThanks for using Linear.', messages:[{fromName:'Linear',email:'receipt@linear.app',date:ago(0,8),body:'Your monthly subscription payment of $16.00 was successful.\n\nWorkspace: Studio North\nPlan: Basic\nNext billing date: October 23, 2026\n\nThanks for using Linear.'}] },
  { id:'m105', folder:'inbox', category:'primary', from:'oliver@read.cv', fromName:'Oliver Grant', avatar:'OG', color:'gold', subject:'A little inspiration for your Friday', snippet:'This essay about building calm software has been on my mind. Especially the bit about how interfaces should get out of the way…', date:ago(1,2), unread:false, starred:true, labels:['Reading'], attachments:[], body:'This essay about building calm software has been on my mind. Especially the bit about how interfaces should get out of the way once you know what you’re doing.\n\nThought you might like it: https://read.cv/explore/calm-software\n\nHave a good weekend!\nOliver', messages:[{fromName:'Oliver Grant',email:'oliver@read.cv',date:ago(1,2),body:'This essay about building calm software has been on my mind. Especially the bit about how interfaces should get out of the way once you know what you’re doing.\n\nThought you might like it: https://read.cv/explore/calm-software\n\nHave a good weekend!\nOliver'}] },
  { id:'m106', folder:'inbox', category:'promotions', from:'newsletter@are.na', fromName:'Are.na Digest', avatar:'A', color:'green', subject:'Your weekly channel roundup', snippet:'New blocks in Minimal interfaces, Creative coding references, and Small studios we love this week.', date:ago(1,4), unread:false, starred:false, labels:['Inspiration'], attachments:[], body:'Your weekly channel roundup\n\nA few things you saved this week:\n\n• Minimal interfaces — 4 new blocks\n• Creative coding references — 2 new blocks\n• Small studios we love — 8 new blocks\n\nOpen your channels →', messages:[{fromName:'Are.na Digest',email:'newsletter@are.na',date:ago(1,4),body:'Your weekly channel roundup\n\nA few things you saved this week:\n\n• Minimal interfaces — 4 new blocks\n• Creative coding references — 2 new blocks\n• Small studios we love — 8 new blocks\n\nOpen your channels →'}] },
  { id:'m107', folder:'inbox', category:'primary', from:'nina@commonpaper.co', fromName:'Nina Kapoor', avatar:'NK', color:'blue', subject:'September numbers + the Q4 forecast', snippet:'Attached the updated runway model. We’re in a good spot to bring the contractor work forward if you want to…', date:ago(1,7), unread:true, starred:false, labels:['Finance','Work'], attachments:[{name:'q4-runway-forecast.xlsx',size:'218 KB',type:'xlsx'}], body:'Hi Alex,\n\nAttached the updated runway model. We’re in a good spot to bring the contractor work forward if you want to, with roughly 14 months of runway after the adjustment.\n\nThe conservative case is in the second tab. Let’s walk through it on Monday?\n\nNina', messages:[{fromName:'Nina Kapoor',email:'nina@commonpaper.co',date:ago(1,7),body:'Hi Alex,\n\nAttached the updated runway model. We’re in a good spot to bring the contractor work forward if you want to, with roughly 14 months of runway after the adjustment.\n\nThe conservative case is in the second tab. Let’s walk through it on Monday?\n\nNina'}] },
  { id:'m108', folder:'inbox', category:'social', from:'notifications@linkedin.com', fromName:'LinkedIn', avatar:'in', color:'linkedin', subject:'You have 4 new connection requests', snippet:'Taylor Reed, Priya Nair, and 2 others want to connect with you.', date:ago(2,2), unread:false, starred:false, labels:[], attachments:[], body:'You have 4 new connection requests waiting for you.\n\nTaylor Reed, Priya Nair, and 2 others want to connect with you.\n\nSee your invitations →', messages:[{fromName:'LinkedIn',email:'notifications@linkedin.com',date:ago(2,2),body:'You have 4 new connection requests waiting for you.\n\nTaylor Reed, Priya Nair, and 2 others want to connect with you.\n\nSee your invitations →'}] },
  { id:'m109', folder:'inbox', category:'primary', from:'hello@pocketcasts.com', fromName:'Pocket Casts', avatar:'P', color:'orange', subject:'Your saved episode is ready for the commute', snippet:'How to make things people love, with John Cutler — 38 min. Pick up where you left off.', date:ago(2,4), unread:false, starred:false, labels:['Personal'], attachments:[], body:'How to make things people love, with John Cutler — 38 min.\n\nPick up where you left off on your next commute.\n\nListen now →', messages:[{fromName:'Pocket Casts',email:'hello@pocketcasts.com',date:ago(2,4),body:'How to make things people love, with John Cutler — 38 min.\n\nPick up where you left off on your next commute.\n\nListen now →'}] },
  { id:'m110', folder:'inbox', category:'primary', from:'devon@fieldnotes.design', fromName:'Devon Lee', avatar:'DL', color:'pink', subject:'The studio is booked for Tuesday', snippet:'10am–1pm, the good light is facing east. I added it to the shared calendar too.', date:ago(2,8), unread:false, starred:false, labels:['Work'], attachments:[], body:'Tuesday, 10am–1pm. The good light is facing east, and I added it to the shared calendar too.\n\nBring the printed boards if you can — the wall is clear.\n\nDevon', messages:[{fromName:'Devon Lee',email:'devon@fieldnotes.design',date:ago(2,8),body:'Tuesday, 10am–1pm. The good light is facing east, and I added it to the shared calendar too.\n\nBring the printed boards if you can — the wall is clear.\n\nDevon'}] },
  { id:'m111', folder:'inbox', category:'updates', from:'no-reply@figma.com', fromName:'Figma', avatar:'F', color:'figma', subject:'Jules Park mentioned you in “Brand explorations”', snippet:'“Alex, does this feel closer to what you had in mind? Added the compact lockup on page 02.”', date:ago(3,1), unread:false, starred:false, labels:['Design'], attachments:[], body:'Jules Park mentioned you in Brand explorations:\n\n“Alex, does this feel closer to what you had in mind? Added the compact lockup on page 02.”\n\nOpen file →', messages:[{fromName:'Figma',email:'no-reply@figma.com',date:ago(3,1),body:'Jules Park mentioned you in Brand explorations:\n\n“Alex, does this feel closer to what you had in mind? Added the compact lockup on page 02.”\n\nOpen file →'}] },
  { id:'m112', folder:'inbox', category:'primary', from:'leila@studio-north.com', fromName:'Leila Mansour', avatar:'LM', color:'plum', subject:'Thank you for the introduction', snippet:'I finally got to talk with Mateo yesterday. We’re already finding some really interesting overlap…', date:ago(3,5), unread:true, starred:false, labels:['Personal'], attachments:[], body:'I finally got to talk with Mateo yesterday. We’re already finding some really interesting overlap between the residency and your fall workshop.\n\nThank you for making the intro. I owe you one!\n\nLeila', messages:[{fromName:'Leila Mansour',email:'leila@studio-north.com',date:ago(3,5),body:'I finally got to talk with Mateo yesterday. We’re already finding some really interesting overlap between the residency and your fall workshop.\n\nThank you for making the intro. I owe you one!\n\nLeila'}] },
  { id:'m113', folder:'inbox', category:'primary', from:'billing@notion.so', fromName:'Notion', avatar:'N', color:'ink', subject:'Your Notion invoice is ready', snippet:'Invoice #NT-280341 · $24.00 USD · Due October 1, 2026.', date:ago(4,2), unread:false, starred:false, labels:['Receipts'], attachments:[{name:'notion-invoice-280341.pdf',size:'112 KB',type:'pdf'}], body:'Your invoice is ready.\n\nInvoice #NT-280341\nAmount: $24.00 USD\nDue: October 1, 2026\n\nThanks,\nThe Notion team', messages:[{fromName:'Notion',email:'billing@notion.so',date:ago(4,2),body:'Your invoice is ready.\n\nInvoice #NT-280341\nAmount: $24.00 USD\nDue: October 1, 2026\n\nThanks,\nThe Notion team'}] },
  { id:'m114', folder:'inbox', category:'promotions', from:'dispatch@themodernhouse.com', fromName:'The Modern House', avatar:'M', color:'gold', subject:'A home shaped by light and timber', snippet:'This week: a quiet renovation in the hills above Berkeley, plus a new city guide to Copenhagen.', date:ago(5,1), unread:false, starred:false, labels:['Reading'], attachments:[], body:'This week: a quiet renovation in the hills above Berkeley, plus a new city guide to Copenhagen.\n\nInside the journal: homes with good bones, makers worth knowing, and places to slow down.', messages:[{fromName:'The Modern House',email:'dispatch@themodernhouse.com',date:ago(5,1),body:'This week: a quiet renovation in the hills above Berkeley, plus a new city guide to Copenhagen.\n\nInside the journal: homes with good bones, makers worth knowing, and places to slow down.'}] },
  { id:'m115', folder:'inbox', category:'updates', from:'updates@vercel.com', fromName:'Vercel', avatar:'V', color:'ink', subject:'Weekly deployment summary', snippet:'Your team shipped 8 deployments this week. Production is healthy across all projects.', date:ago(6,3), unread:false, starred:false, labels:['Work'], attachments:[], body:'Your team shipped 8 deployments this week. Production is healthy across all projects.\n\nView your deployment summary →', messages:[{fromName:'Vercel',email:'updates@vercel.com',date:ago(6,3),body:'Your team shipped 8 deployments this week. Production is healthy across all projects.\n\nView your deployment summary →'}] },
  { id:'m116', folder:'inbox', category:'primary', from:'marco@slowroads.travel', fromName:'Marco Ellis', avatar:'ME', color:'green', subject:'Mendocino weekend — itinerary inside', snippet:'Found a cabin with a ridiculous view. Sharing a loose plan and the reservation details below…', date:ago(7,1), unread:false, starred:true, labels:['Travel','Personal'], attachments:[{name:'mendocino-itinerary.pdf',size:'1.2 MB',type:'pdf'}], body:'Found a cabin with a ridiculous view. Sharing a loose plan and the reservation details below.\n\nFriday: drive up after lunch, stop in Point Arena\nSaturday: bluff trail, late lunch at Trillium\nSunday: coffee and the long way home\n\nReservation is under Ellis, Oct 9–11. Can’t wait.', messages:[{fromName:'Marco Ellis',email:'marco@slowroads.travel',date:ago(7,1),body:'Found a cabin with a ridiculous view. Sharing a loose plan and the reservation details below.\n\nFriday: drive up after lunch, stop in Point Arena\nSaturday: bluff trail, late lunch at Trillium\nSunday: coffee and the long way home\n\nReservation is under Ellis, Oct 9–11. Can’t wait.'}] },
  { id:'m117', folder:'inbox', category:'primary', from:'sasha@oakandember.com', fromName:'Sasha Kim', avatar:'SK', color:'orange', subject:'Re: Workshop materials', snippet:'Perfect — I’ll bring the paper samples. Can you send the latest deck when you get a chance?', date:ago(8,5), unread:false, starred:false, labels:['Work'], attachments:[], body:'Perfect — I’ll bring the paper samples. Can you send the latest deck when you get a chance?\n\nSasha', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(9,4),body:'I’ll bring the new exercises and a few examples of the old packaging system.'},{fromName:'Sasha Kim',email:'sasha@oakandember.com',date:ago(8,5),body:'Perfect — I’ll bring the paper samples. Can you send the latest deck when you get a chance?'}] },
  { id:'m118', folder:'inbox', category:'social', from:'team@behance.net', fromName:'Behance', avatar:'B', color:'purple', subject:'Your work is getting noticed', snippet:'Your project “Soft Systems” got 28 new appreciations this week.', date:ago(9,3), unread:false, starred:false, labels:[], attachments:[], body:'Your project Soft Systems got 28 new appreciations this week.\n\nKeep making things people love.', messages:[{fromName:'Behance',email:'team@behance.net',date:ago(9,3),body:'Your project Soft Systems got 28 new appreciations this week.\n\nKeep making things people love.'}] },
  { id:'m119', folder:'sent', category:'primary', from:'alex@studio.dev', fromName:'Alex Morgan', to:'maya@linear.app', toName:'Maya Chen', avatar:'AM', color:'blue', subject:'Re: A few thoughts on the new onboarding flow', snippet:'The sample project idea is excellent. Let’s get that into the next sprint and measure first-session depth.', date:ago(0,0), unread:false, starred:false, labels:['Product'], attachments:[], body:'The sample project idea is excellent. Let’s get that into the next sprint and measure first-session depth.\n\nAlso, really nice work on the checklist. The whole thing feels much lighter now.\n\nAlex', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(0,0),body:'The sample project idea is excellent. Let’s get that into the next sprint and measure first-session depth.\n\nAlso, really nice work on the checklist. The whole thing feels much lighter now.\n\nAlex'}] },
  { id:'m120', folder:'sent', category:'primary', from:'alex@studio.dev', fromName:'Alex Morgan', to:'jules@figma.com', toName:'Jules Park', avatar:'AM', color:'blue', subject:'Re: Brand explorations — round two', snippet:'The compact one feels right for the app. Let’s use the wider lockup on the landing page.', date:ago(1,1), unread:false, starred:false, labels:['Design'], attachments:[], body:'The compact one feels right for the app. Let’s use the wider lockup on the landing page.\n\nThank you for iterating on this so quickly.', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(1,1),body:'The compact one feels right for the app. Let’s use the wider lockup on the landing page.\n\nThank you for iterating on this so quickly.'}] },
  { id:'m121', folder:'sent', category:'primary', from:'alex@studio.dev', fromName:'Alex Morgan', to:'devon@fieldnotes.design', toName:'Devon Lee', avatar:'AM', color:'blue', subject:'Can we move our studio day to Tuesday?', snippet:'Monday is getting a little packed — Tuesday morning would be perfect if the studio is free.', date:ago(3,6), unread:false, starred:false, labels:['Work'], attachments:[], body:'Monday is getting a little packed — Tuesday morning would be perfect if the studio is free.\n\nLet me know!', messages:[{fromName:'Alex Morgan',email:'alex@studio.dev',date:ago(3,6),body:'Monday is getting a little packed — Tuesday morning would be perfect if the studio is free.\n\nLet me know!'}] },
  { id:'m122', folder:'drafts', category:'primary', from:'alex@studio.dev', fromName:'Alex Morgan', to:'nina@commonpaper.co', toName:'Nina Kapoor', avatar:'AM', color:'blue', subject:'Re: September numbers + the Q4 forecast', snippet:'Thanks for putting this together. I had one question about the contractor timing…', date:ago(0,2), unread:false, starred:false, labels:['Finance'], attachments:[], body:'Thanks for putting this together. I had one question about the contractor timing — could we compare the August and September assumptions before Monday?', messages:[], isDraft:true },
  { id:'m123', folder:'drafts', category:'primary', from:'alex@studio.dev', fromName:'Alex Morgan', to:'', toName:'', avatar:'AM', color:'blue', subject:'', snippet:'', date:ago(2,2), unread:false, starred:false, labels:[], attachments:[], body:'', messages:[], isDraft:true },
  { id:'m124', folder:'trash', category:'primary', from:'offers@awaytravel.com', fromName:'Away', avatar:'AW', color:'teal', subject:'A better way to get away', snippet:'The carry-on that started it all is 15% off this weekend.', date:ago(13,4), unread:false, starred:false, labels:[], attachments:[], body:'The carry-on that started it all is 15% off this weekend.', messages:[{fromName:'Away',email:'offers@awaytravel.com',date:ago(13,4),body:'The carry-on that started it all is 15% off this weekend.'}] },
  { id:'m125', folder:'trash', category:'primary', from:'hello@daily-design.co', fromName:'Daily Design', avatar:'D', color:'pink', subject:'Monday inspiration: issue 184', snippet:'A tiny collection of good things to start your week.', date:ago(16,3), unread:false, starred:false, labels:[], attachments:[], body:'A tiny collection of good things to start your week.', messages:[{fromName:'Daily Design',email:'hello@daily-design.co',date:ago(16,3),body:'A tiny collection of good things to start your week.'}] }
];

const STORAGE = 'gpt6-mail-v1';
const defaults = { threads: seed, labels: ['Work','Personal','Design','Receipts','Travel','Finance','Reading','Product','Inspiration'], theme:'light', density:'comfortable', account:0 };
let state;
try { state = { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE) || '{}') }; } catch { state = { ...defaults }; }
if (!Array.isArray(state.threads)) state.threads = seed;
if (!Array.isArray(state.labels)) state.labels = defaults.labels;
if (!['light','dark'].includes(state.theme)) state.theme = defaults.theme;
if (!['comfortable','compact'].includes(state.density)) state.density = defaults.density;
let currentView = 'inbox';
let category = 'primary';
let searchText = '';
let selected = new Set();
let openThreadId = null;
let composeState = null;
let menuOpen = '';
let attachmentPreview = null;
let expandedMessages = new Set();
let mobileNav = false;
let toastTimer;
let undoAction = null;
const root = document.querySelector('#app');
const save = () => localStorage.setItem(STORAGE, JSON.stringify({ threads:state.threads, labels:state.labels, theme:state.theme, density:state.density, account:state.account }));
function restoreExpiredSnoozes() {
  let changed=false;
  state.threads.forEach(t=>{const due=new Date(t.snoozedUntil).getTime();if(t.folder==='snoozed'&&(!Number.isFinite(due)||due<=Date.now())){t.folder=t.snoozeReturnFolder||(t.sent?'sent':'inbox');delete t.snoozedUntil;delete t.snoozeReturnFolder;changed=true;}});
  if(changed)save();
}
function scheduleSnoozes() {
  const due=state.threads.filter(t=>t.folder==='snoozed').map(t=>new Date(t.snoozedUntil).getTime()).filter(Number.isFinite);
  if(!due.length)return;
  const wait=Math.max(0,Math.min(...due)-Date.now());
  setTimeout(()=>{restoreExpiredSnoozes();render();scheduleSnoozes();},Math.min(wait+20,2147483000));
}
restoreExpiredSnoozes();
const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmtDate = date => { const d = new Date(date), today = new Date(); return d.toDateString() === today.toDateString() ? d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : d.getFullYear() === today.getFullYear() ? d.toLocaleDateString([], {month:'short',day:'numeric'}) : d.toLocaleDateString([], {month:'short',day:'numeric',year:'numeric'}); };
const shortDate = date => new Date(date).toLocaleDateString([], {month:'short',day:'numeric'});
const currentThread = () => state.threads.find(t => t.id === openThreadId);
const getAccount = () => state.account ? {name:'Studio North',email:'team@studio.dev',initials:'SN'} : {name:'Alex Morgan',email:'alex@studio.dev',initials:'AM'};
const unreadCount = folder => state.threads.filter(t => t.folder === folder && t.unread).length;
const visibleThreads = () => {
  let list = state.threads.filter(t => {
    if (searchText.trim()) return !['trash','drafts'].includes(t.folder);
    if (currentView === 'starred') return t.starred && t.folder !== 'trash' && t.folder !== 'drafts';
    if (currentView === 'snoozed') return t.folder === 'snoozed';
    if (currentView === 'sent') return t.folder !== 'trash' && (t.folder === 'sent' || t.sent);
    if (currentView === 'all') return !['trash','drafts'].includes(t.folder);
    if (currentView.startsWith('label:')) return t.folder !== 'trash' && t.labels.includes(currentView.slice(6));
    return t.folder === currentView;
  });
  if (currentView === 'inbox' && category !== 'all' && !searchText.trim()) list = category === 'primary' ? list.filter(t => ['primary','updates'].includes(t.category)) : list.filter(t => t.category === category);
  if (searchText.trim()) {
    const q = searchText.toLowerCase().trim();
    const from = q.match(/from:([^\s]+)/)?.[1];
    const subject = q.match(/subject:([^\s]+)/)?.[1];
    const label = q.match(/label:([^\s]+)/)?.[1];
    const unreadOnly = /\bis:unread\b/.test(q);
    const starredOnly = /\bis:starred\b/.test(q);
    const attachmentOnly = /\bhas:attachment\b/.test(q);
    const terms = q.replace(/(?:from|subject|label):[^\s]+|\b(?:is:unread|is:starred|has:attachment)\b/g,'').trim().split(/\s+/).filter(Boolean);
    list = list.filter(t => {
      const participants = (t.messages || []).flatMap(message=>[message.fromName,message.email]);
      const full = [t.fromName,t.from,t.toName,t.to,t.subject,t.snippet,t.body,...participants,...(t.messages||[]).map(message=>message.body),...t.labels].join(' ').toLowerCase();
      return (!from || [t.fromName,t.from,...participants].join(' ').toLowerCase().includes(from)) && (!subject || t.subject.toLowerCase().includes(subject)) && (!label || t.labels.some(x=>x.toLowerCase().includes(label))) && (!unreadOnly || t.unread) && (!starredOnly || t.starred) && (!attachmentOnly || t.attachments.length>0) && terms.every(term=>full.includes(term));
    });
  }
  return list.sort((a,b) => new Date(b.date) - new Date(a.date));
};
const labelColor = label => ({Work:'blue',Personal:'green',Design:'purple',Receipts:'gold',Travel:'teal',Finance:'orange',Reading:'pink',Product:'violet',Inspiration:'mint'}[label] || 'gray');
const avatar = (thread, size='') => `<span class="avatar ${esc(thread.color || 'blue')} ${size}">${esc(thread.avatar || thread.fromName?.slice(0,1) || '?')}</span>`;
const senderLabel = t => currentView === 'drafts' ? 'Draft' : currentView === 'sent' || (currentView === 'all' && (t.sent || t.folder === 'sent' || t.from === 'alex@studio.dev' || t.from === 'team@studio.dev')) ? `To ${t.toName || t.to || 'recipient'}` : t.fromName;
const titleForView = () => currentView.startsWith('label:') ? currentView.slice(6) : ({inbox:'Inbox',starred:'Starred',snoozed:'Snoozed',sent:'Sent',drafts:'Drafts',all:'All mail',trash:'Trash'}[currentView] || 'Inbox');

function render() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.density = state.density;
  const account = getAccount();
  const otherAccount = state.account ? {name:'Alex Morgan',email:'alex@studio.dev',initials:'AM'} : {name:'Studio North',email:'team@studio.dev',initials:'SN'};
  const threads = visibleThreads();
  const unreadInbox = unreadCount('inbox');
  const selectedAll = threads.length > 0 && threads.every(t => selected.has(t.id));
  root.innerHTML = `
    <div class="app-shell ${mobileNav ? 'nav-open':''}">
      <header class="topbar">
        <button class="icon-button menu-trigger" data-action="toggle-nav" aria-label="Open navigation">${icon('menu')}</button>
        <a class="brand" href="#" data-action="go-inbox" aria-label="GPT-6 home"><span class="brand-mark"><svg viewBox="0 0 28 28"><path d="M3.5 7.3 14 15l10.5-7.7M5.8 6h16.4A2.8 2.8 0 0 1 25 8.8v11.4a2.8 2.8 0 0 1-2.8 2.8H5.8A2.8 2.8 0 0 1 3 20.2V8.8A2.8 2.8 0 0 1 5.8 6Z"/></svg></span><span class="brand-name">GPT-6</span></a>
        <div class="search-wrap ${searchText ? 'searching':''}">${icon('search')}<input id="search" type="search" placeholder="Search mail" value="${esc(searchText)}" autocomplete="off"/><button class="search-filter" data-action="search-help" title="Search tips">${icon('tune')}</button>${searchText ? `<button class="search-clear" data-action="clear-search" aria-label="Clear search">${icon('close')}</button>`:''}</div>
        <div class="top-actions"><button class="icon-button help-button" data-action="help" title="Help">${icon('help')}</button><button class="icon-button settings-button" data-action="settings" title="Settings">${icon('settings')}</button><button class="account-button" data-action="account"><span class="account-ring"><span class="account-avatar">${account.initials}</span></span></button></div>
        ${menuOpen === 'account' ? `<div class="floating-menu account-menu"><div class="account-card"><span class="account-avatar large">${account.initials}</span><div><strong>${account.name}</strong><span>${account.email}</span></div></div><div class="account-separator"></div><button data-action="switch-account"><span class="mini-avatar">${otherAccount.initials}</span><span><strong>Switch to ${otherAccount.name}</strong><small>${otherAccount.email}</small></span><span class="check-mark">${icon('chevronRight')}</span></button><div class="account-separator"></div><button data-action="settings">${icon('settings')} Settings</button><button data-action="theme">${icon(state.theme === 'dark' ? 'checkCircle' : 'star')} ${state.theme === 'dark' ? 'Use light theme' : 'Use dark theme'}</button></div>`:''}
      </header>
      <div class="workspace">
        <aside class="sidebar">
          <button class="compose-button" data-action="compose">${icon('compose')}<span>Compose</span></button>
          <nav class="main-nav" aria-label="Mail folders">
            ${navItem('inbox','Inbox',unreadInbox)}${navItem('starred','Starred')}${navItem('snoozed','Snoozed',state.threads.filter(t=>t.folder==='snoozed').length)}${navItem('sent','Sent')}${navItem('drafts','Drafts',state.threads.filter(t=>t.folder==='drafts').length)}${navItem('all','All mail')}${navItem('trash','Trash')}
          </nav>
          <section class="labels-section"><div class="section-head"><span>Labels</span><button class="icon-button small" data-action="add-label" aria-label="Create new label">${icon('compose')}</button></div><div class="label-nav">${state.labels.slice(0,8).map(label => `<button class="nav-item ${currentView===`label:${label}`?'active':''}" data-view="label:${esc(label)}"><span class="label-dot ${labelColor(label)}"></span><span class="nav-label">${esc(label)}</span><span class="nav-count">${state.threads.filter(t=>t.labels.includes(label)&&t.folder!=='trash').length || ''}</span></button>`).join('')}</div></section>
          <div class="sidebar-bottom"><div class="storage-card"><div class="storage-row"><span>Storage</span><span>12% used</span></div><div class="storage-track"><span></span></div><small>1.8 GB of 15 GB used</small></div><button class="sidebar-profile" data-action="account"><span class="mini-avatar">${account.initials}</span><span><strong>${account.name}</strong><small>${account.email}</small></span>${icon('chevron')}</button></div>
        </aside>
        <main class="main-area">
          <section class="mail-panel ${openThreadId ? 'reading':''}">
            ${openThreadId ? renderReader(currentThread()) : renderInbox(threads, selectedAll)}
          </section>
        </main>
      </div>
      ${mobileNav ? `<button class="nav-scrim" data-action="toggle-nav" aria-label="Close navigation"></button>`:''}
      ${composeState ? renderCompose() : ''}
      ${menuOpen === 'settings' ? renderSettings() : ''}
      ${menuOpen === 'labels' ? renderLabelMenu() : ''}
      ${menuOpen === 'search-help' ? renderSearchHelp() : ''}
      ${menuOpen === 'bulk-more' ? `<div class="action-popover bulk-action-popover"><strong>More actions</strong>${selected.size?`<button data-action="bulk-snooze">Snooze selected</button><button data-action="bulk-read">Mark read / unread</button><button data-action="label-menu">Add a label</button>`:`<button data-action="mark-folder-read">Mark all as read</button><button data-action="mark-folder-unread">Mark all as unread</button><button data-action="select-all">Select all messages</button>`}</div>` : ''}
      ${menuOpen === 'reader-more' ? `<div class="action-popover reader-action-popover"><strong>Conversation actions</strong><button data-action="mark-unread">Mark as unread</button><button data-action="snooze-one">Snooze until tomorrow</button><button data-action="print">Print conversation</button></div>` : ''}
      ${menuOpen === 'details' && currentThread() ? renderMessageDetails(currentThread()) : ''}
      ${attachmentPreview ? renderAttachmentPreview(attachmentPreview) : ''}
      <div class="toast ${undoAction ? 'visible':''}" role="status">${undoAction?.message || ''}${undoAction ? `${undoAction.rows?'<button data-action="undo">Undo</button>':''}<button class="toast-close" data-action="dismiss-toast" aria-label="Dismiss">×</button>`:''}</div>
    </div>`;
}
function navItem(view,label,count='') { const active=currentView===view&&!openThreadId; return `<button class="nav-item ${active?'active':''}" data-view="${view}" ${active?'aria-current="page"':''}>${icon(view === 'all' ? 'archive' : view === 'trash' ? 'trash' : view === 'starred' ? 'star' : view === 'snoozed' ? 'clock' : view === 'sent' ? 'send' : view === 'drafts' ? 'drafts' : 'inbox')}<span class="nav-label">${label}</span><span class="nav-count">${count || ''}</span></button>`; }
function renderInbox(threads, selectedAll) {
  const folderName = titleForView();
  const unreadInbox = unreadCount('inbox');
  const categoryTabs = currentView === 'inbox' ? `<div class="category-tabs"><button class="category-tab ${category==='primary'?'active':''}" data-category="primary"><span class="category-icon primary-icon">${icon('inbox')}</span><span><strong>Primary</strong><small>People and conversations</small></span></button><button class="category-tab ${category==='social'?'active':''}" data-category="social"><span class="category-icon social-icon">${icon('people')}</span><span><strong>Social</strong><small>Networks and communities</small></span>${unreadInCategory('social')?`<b class="tab-count">${unreadInCategory('social')}</b>`:''}</button><button class="category-tab ${category==='promotions'?'active':''}" data-category="promotions"><span class="category-icon promo-icon">${icon('tag')}</span><span><strong>Promotions</strong><small>Offers and newsletters</small></span></button></div>` : '';
  return `<div class="toolbar"><div class="toolbar-leading"><button class="checkbox-button ${selectedAll?'checked':''}" data-action="select-all" aria-label="Select all">${selectedAll?icon('check'):''}</button>${selected.size ? `<button class="icon-button" data-action="bulk-archive" title="Archive">${icon('archive')}</button><button class="icon-button" data-action="bulk-delete" title="Delete">${icon('trash')}</button><button class="icon-button" data-action="bulk-read" title="Mark as read or unread">${icon('drafts')}</button><div class="toolbar-divider"></div><button class="icon-button" data-action="label-menu" title="Labels">${icon('label')}</button><button class="icon-button" data-action="bulk-more" title="More">${icon('more')}</button>` : `<button class="icon-button" data-action="refresh" title="Refresh">${icon('refresh')}</button><button class="icon-button" data-action="bulk-more" title="More">${icon('more')}</button>`}</div><div class="toolbar-trailing">${threads.length ? `1–${threads.length} of ${threads.length}` : '0 of 0'}</div></div>
    <div class="list-heading"><div><h1>${esc(folderName)}</h1>${searchText?`<span class="search-result-label">Search results for “${esc(searchText)}” <button data-action="clear-search">Clear</button></span>`:''}</div>${currentView==='inbox' ? `<span class="inbox-note">${unreadInbox ? `${unreadInbox} unread` : 'You’re all caught up'}</span>`:''}</div>
    ${categoryTabs}
    <div class="message-list" role="list">${threads.length ? threads.map(threadRow).join('') : `<div class="empty-state">${emptyIllustration()}<h2>${searchText?'No messages found':emptyTitle()}</h2><p>${searchText?'Try a different name, subject, or keyword.':emptyCopy()}</p>${searchText?`<button class="text-button" data-action="clear-search">Clear search</button>`:''}</div>`}</div>
    <div class="list-footer"><span>${threads.length ? 'That’s everything in this view' : ''}</span>${threads.length?`<span>Page 1 of 1</span>`:''}</div>`;
}
function unreadInCategory(cat) { return state.threads.filter(t=>t.folder==='inbox'&&t.category===cat&&t.unread).length; }
function emptyTitle() { return ({inbox:'Your inbox is clear',starred:'No starred messages',snoozed:'Nothing snoozed',sent:'Nothing sent yet',drafts:'No drafts',trash:'Trash is empty',all:'No mail here'}[currentView] || 'No labeled messages'); }
function emptyCopy() { return ({inbox:'New mail will show up here.',starred:'Star a message to keep it close.',snoozed:'Conversations you snooze will be here until they return.',sent:'Messages you send will appear here.',drafts:'Your unfinished messages will be saved here.',trash:'Deleted messages will show up here.'}[currentView] || 'Messages with this label will show up here.'); }
function emptyIllustration() { return `<div class="empty-art"><span class="empty-sun"></span><span class="empty-envelope">${icon('inbox')}</span><span class="empty-spark spark-one">✦</span><span class="empty-spark spark-two">✦</span></div>`; }
function threadRow(t) {
  const checked = selected.has(t.id);
  const sender = esc(senderLabel(t));
  const labels = [...(t.folder==='drafts'?['Draft']:[]),...t.labels].slice(0,2).map(label => `<span class="message-label ${label==='Draft'?'draft-label':labelColor(label)}">${esc(label)}</span>`).join('');
  return `<article class="message-row ${t.unread?'unread':''} ${checked?'selected':''}" role="listitem" tabindex="0" aria-label="${esc(t.subject||'(no subject)')} from ${esc(t.fromName)}" data-open="${t.id}">
    <button class="checkbox-button row-check ${checked?'checked':''}" data-select="${t.id}" role="checkbox" aria-checked="${checked}" aria-label="Select message from ${esc(t.fromName)}">${checked?icon('check'):''}</button>
    <button class="star-button ${t.starred?'starred':''}" data-star="${t.id}" aria-pressed="${t.starred}" aria-label="${t.starred?'Unstar':'Star'} message">${icon('star')}</button>
    <div class="sender-cell"><span class="sender-name">${sender}</span>${t.messages.length>1?`<span class="thread-count">${t.messages.length}</span>`:''}</div>
    <div class="message-summary"><div class="subject-line"><span class="subject-text">${esc(t.subject || '(no subject)')}</span>${labels}<span class="snippet-text"> — ${esc(t.snippet || '(no message)')}</span></div><div class="mobile-snippet">${esc(t.snippet || '(no message)')}</div></div>
    <div class="row-meta">${t.attachments.length?`<span class="attachment-indicator" title="${t.attachments.length} attachment${t.attachments.length>1?'s':''}">${icon('attach')}</span>`:''}<time>${fmtDate(t.date)}</time><div class="row-hover-actions"><button data-row-action="archive" data-id="${t.id}" title="Archive">${icon('archive')}</button><button data-row-action="delete" data-id="${t.id}" title="Delete">${icon('trash')}</button><button data-row-action="snooze" data-id="${t.id}" title="Snooze">${icon('snooze')}</button></div></div>
  </article>`;
}
function renderMessageCard(t,m,isLast=false) {
  const initials=(m.fromName||'?').split(' ').map(x=>x[0]).join('').slice(0,2);
  return `<div class="expanded-message" ${isLast?'':'data-expanded-message'}>${avatar({avatar:initials,color:t.color})}<div class="message-body-wrap"><div class="message-person"><div><strong>${esc(m.fromName || t.fromName)}</strong><span class="email-address">&lt;${esc(m.email || t.from)}&gt;</span><div class="to-line">to ${esc(t.toName || (t.to || 'me'))} <button data-action="details" title="Show details">${icon('chevron')}</button></div></div><time>${new Date(m.date || t.date).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</time><button class="icon-button small" data-action="reply" title="Reply">${icon('reply')}</button><button class="icon-button small" data-action="more-reader" title="More">${icon('moreVertical')}</button></div><div class="message-body">${formatMessageBody(m.body || t.body)}</div>${isLast&&t.attachments.length?`<div class="attachment-block"><div class="attachment-caption">${t.attachments.length} attachment${t.attachments.length>1?'s':''}</div><div class="attachment-list">${t.attachments.map(file=>attachmentCard(file)).join('')}</div></div>`:''}</div></div>`;
}
function formatMessageBody(body='') {
  return esc(body)
    .replace(/\*\*(.+?)\*\*/gs,'<strong>$1</strong>')
    .replace(/https?:\/\/[^\s<]+/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
    .replace(/\n/g,'<br>');
}
function renderReader(t) {
  if (!t) { openThreadId = null; return renderInbox(visibleThreads(), false); }
  const messages = t.messages?.length ? t.messages : [{fromName:t.fromName,email:t.from,date:t.date,body:t.body}];
  return `<div class="reader-toolbar"><div class="reader-toolbar-left"><button class="icon-button" data-action="back" title="Back to inbox">${icon('back')}</button><span class="toolbar-divider"></span><button class="icon-button" data-action="archive-one" title="Archive">${icon('archive')}</button><button class="icon-button" data-action="delete-one" title="Delete">${icon('trash')}</button><button class="icon-button" data-action="snooze-one" title="Snooze">${icon('snooze')}</button><span class="toolbar-divider"></span><button class="icon-button" data-action="mark-unread" title="Mark unread">${icon('drafts')}</button><button class="icon-button" data-action="label-menu" title="Labels">${icon('label')}</button><button class="icon-button" data-action="more-reader" title="More">${icon('more')}</button></div><div class="reader-toolbar-right"><span>${esc(titleForView())}</span><button class="icon-button" data-action="previous-message" title="Newer">${icon('back')}</button><button class="icon-button" data-action="next-message" title="Older">${icon('chevronRight')}</button></div></div>
    <div class="reader-scroll"><div class="reader-header"><div class="reader-title-row"><h1>${esc(t.subject || '(no subject)')}</h1><button class="star-button reader-star ${t.starred?'starred':''}" data-star="${t.id}" aria-label="${t.starred?'Unstar':'Star'} message">${icon('star')}</button></div><div class="reader-labels">${t.labels.map(label=>`<span class="message-label ${labelColor(label)}">${esc(label)}</span>`).join('')}<button class="add-reader-label" data-action="label-menu" aria-label="Add label">+</button></div>
    ${messages.map((message,index)=>index<messages.length-1&&!expandedMessages.has(index)?`<button class="collapsed-message" data-expand-message="${index}">${avatar({avatar:(message.fromName||'?').split(' ').map(x=>x[0]).join('').slice(0,2),color:'gray'})}<span><strong>${esc(message.fromName)}</strong><small>${esc(message.body.split('\n')[0].slice(0,90))}…</small></span><time>${fmtDate(message.date)}</time></button>`:renderMessageCard(t,message,index===messages.length-1)).join('')}
    <div class="reader-actions"><button class="outline-action" data-action="reply">${icon('reply')} Reply</button><button class="outline-action" data-action="forward">${icon('forward')} Forward</button><button class="icon-button reader-more" data-action="more-reader" aria-label="More">${icon('more')}</button></div>
    </div><aside class="reader-aside"><div class="aside-card"><span class="aside-icon">${icon('checkCircle')}</span><strong>Nothing else to do</strong><small>This conversation is up to date.</small></div><div class="aside-tip"><span>✦</span><p>Keep your inbox calm. Archive conversations you’re done with.</p></div></aside></div>`;
}
function attachmentCard(file) { const ext = (file.name.split('.').pop()||'FILE').toUpperCase(); return `<button class="attachment-card" data-attachment="${esc(file.name)}"><span class="file-art ${esc(file.type||'file')}">${ext==='PDF'?'PDF':ext==='XLSX'?'XLS':'FIG'}</span><span><strong>${esc(file.name)}</strong><small>${esc(file.size || 'File')}</small></span><span class="download-icon">${icon('more')}</span></button>`; }
function renderAttachmentPreview(file) { return `<div class="preview-scrim" data-action="close-preview"><section class="attachment-preview" data-action="ignore-preview" role="dialog" aria-modal="true" aria-label="Attachment details"><div class="preview-header"><strong>Attachment details</strong><button class="icon-button" data-action="close-preview" aria-label="Close">${icon('close')}</button></div><div class="preview-content"><span class="file-art ${esc(file.type||'file')}">${esc((file.name.split('.').pop()||'FILE').slice(0,4).toUpperCase())}</span><h2>${esc(file.name)}</h2><p>${esc(file.size||'File')} · ${esc((file.type||'file').toUpperCase())}</p><div class="preview-note">This message includes this attachment.</div></div></section></div>`; }
function renderCompose() {
  const c = composeState;
  const fields = `
    <div class="compose-fields">
      <div class="compose-field"><label for="compose-to">To</label><input id="compose-to" value="${esc(c.to)}" placeholder="Recipients" autocomplete="off"/><button data-action="show-cc">Cc</button><button data-action="show-bcc">Bcc</button></div>
      ${c.showCc ? `<div class="compose-field"><label for="compose-cc">Cc</label><input id="compose-cc" value="${esc(c.cc||'')}" placeholder="Add Cc recipients"/></div>` : ''}
      ${c.showBcc ? `<div class="compose-field"><label for="compose-bcc">Bcc</label><input id="compose-bcc" value="${esc(c.bcc||'')}" placeholder="Add Bcc recipients"/></div>` : ''}
      <div class="compose-field"><label for="compose-subject">Subject</label><input id="compose-subject" value="${esc(c.subject)}" placeholder="Subject"/></div>
    </div>`;
  const attachments = c.attachments.length ? `<div class="compose-attachments">${c.attachments.map((file,index)=>`<span>${icon('attach')} ${esc(file.name)} <button data-remove-attachment="${index}" aria-label="Remove ${esc(file.name)}">×</button></span>`).join('')}</div>` : '';
  const topActions = c.minimized
    ? `<button data-action="restore-compose" title="Restore">□</button><button data-action="close-compose" title="Save and close">${icon('close')}</button>`
    : `<button data-action="minimize-compose" title="Minimize">−</button><button data-action="maximize-compose" title="Full screen">□</button><button data-action="close-compose" title="Save and close">${icon('close')}</button>`;
  return `<div class="compose-window ${c.maximized?'maximized':''} ${c.minimized?'minimized':''}" role="dialog" aria-label="${c.id?'Edit draft':'New message'}">
    <div class="compose-topline"><strong>${c.id?'Draft':'New message'}</strong><div>${topActions}</div></div>
    ${c.minimized ? '' : `${fields}<textarea id="compose-body" placeholder="Write your message…">${esc(c.body)}</textarea>${attachments}
      <div class="compose-footer"><div class="compose-tools">
        <button class="send-button" data-action="send">Send</button>
        <button class="icon-button" data-action="format" title="Bold selection" aria-label="Bold selected text">A</button>
        <label class="icon-button attach-control" title="Attach files">${icon('attach')}<input type="file" id="file-attach" multiple hidden/></label>
        <button class="icon-button" data-action="insert-link" title="Insert link">↗</button>
        <button class="icon-button" data-action="emoji" title="Insert emoji">☺</button>
      </div><button class="icon-button delete-draft" data-action="discard-compose" title="Discard draft">${icon('trash')}</button></div>`}
  </div>`;
}
function renderSettings() { return `<div class="settings-scrim" data-action="close-settings"></div><aside class="settings-panel"><div class="settings-header"><h2>Quick settings</h2><button class="icon-button" data-action="close-settings" aria-label="Close">${icon('close')}</button></div><p class="settings-caption">Make GPT-6 feel like yours.</p><section class="setting-group"><span class="setting-label">Theme</span><div class="theme-options"><button class="theme-option ${state.theme==='light'?'chosen':''}" data-set-theme="light"><span class="theme-preview light-preview"></span><strong>Light</strong></button><button class="theme-option ${state.theme==='dark'?'chosen':''}" data-set-theme="dark"><span class="theme-preview dark-preview"></span><strong>Dark</strong></button></div></section><section class="setting-group"><span class="setting-label">Inbox density</span><button class="density-option ${state.density==='comfortable'?'chosen':''}" data-density="comfortable"><span class="density-sample comfy"></span><span><strong>Comfortable</strong><small>More breathing room</small></span>${state.density==='comfortable'?icon('check'):''}</button><button class="density-option ${state.density==='compact'?'chosen':''}" data-density="compact"><span class="density-sample compact"></span><span><strong>Compact</strong><small>More messages on screen</small></span>${state.density==='compact'?icon('check'):''}</button></section><section class="settings-footer"><span class="setting-label">Inbox shortcuts</span><div><kbd>c</kbd> Compose <kbd>/</kbd> Search</div><div><kbd>e</kbd> Archive <kbd>#</kbd> Delete</div></section></aside>`; }
function renderLabelMenu() { const targets=selected.size?[...selected]:selectedTargets(); return `<div class="popover label-popover"><strong>Label as</strong>${state.labels.map(label=>`<label><input type="checkbox" data-label-check="${esc(label)}" ${targets.length&&targets.every(id=>state.threads.find(t=>t.id===id)?.labels.includes(label))?'checked':''}/> <span class="label-dot ${labelColor(label)}"></span>${esc(label)}</label>`).join('')}<div class="popover-actions"><button data-action="add-label">Create new</button><button class="primary-small" data-action="apply-labels">Apply</button></div></div>`; }
function renderSearchHelp() { return `<div class="popover search-help"><strong>Search mail</strong><p>Try any name, subject, word, or label.</p><div><kbd>from:maya</kbd></div><div><kbd>has:attachment</kbd></div><div><kbd>is:unread</kbd></div></div>`; }
function renderMessageDetails(thread) {
  const rows=[['From',`${thread.fromName} <${thread.from}>`],['To',thread.toName?`${thread.toName} <${thread.to}>`:thread.to||'Alex Morgan']];
  if(thread.cc)rows.push(['Cc',thread.cc]);
  if(thread.bcc)rows.push(['Bcc',thread.bcc]);
  rows.push(['Date',new Date(thread.date).toLocaleString()]);
  return `<div class="details-popover"><div class="details-heading"><strong>Message details</strong><button class="icon-button small" data-action="close-details" aria-label="Close">${icon('close')}</button></div>${rows.map(([label,value])=>`<div class="details-row"><span>${label}</span><span>${esc(value)}</span></div>`).join('')}</div>`;
}

function updateComposeFromInputs() {
  if (!composeState) return;
  const to = document.querySelector('#compose-to'); if (to) composeState.to = to.value;
  const cc = document.querySelector('#compose-cc'); if (cc) composeState.cc = cc.value;
  const bcc = document.querySelector('#compose-bcc'); if (bcc) composeState.bcc = bcc.value;
  const subject = document.querySelector('#compose-subject'); if (subject) composeState.subject = subject.value;
  const body = document.querySelector('#compose-body'); if (body) composeState.body = body.value;
}
function saveDraft(silent = false) {
  if (!composeState) return;
  updateComposeFromInputs();
  const c = composeState;
  const hasContent = c.to || c.cc || c.bcc || c.subject || c.body || c.attachments.length;
  if (!hasContent) return;
  const existing = state.threads.find(t=>t.id===c.id);
  const account=getAccount();
  const draft = { ...(existing||{}), id:c.id || `d${Date.now()}`, folder:'drafts', category:'primary', from:account.email, fromName:account.name, avatar:account.initials, color:'blue', to:c.to, cc:c.cc||'', bcc:c.bcc||'', toName:c.to.split(',')[0].trim().split('@')[0] || '', subject:c.subject, snippet:c.body.replace(/\s+/g,' ').slice(0,120), date:new Date().toISOString(), unread:false, starred:false, labels:existing?.labels||[], attachments:c.attachments, body:c.body, messages:[], isDraft:true };
  if (existing) Object.assign(existing,draft); else { state.threads.unshift(draft); c.id = draft.id; }
  save();
  if (!silent) toast('Draft saved');
}
function openCompose(thread = null, mode = 'reply') {
  if (composeState) { saveDraft(true); }
  if (thread && thread.folder === 'drafts') composeState = { id:thread.id,to:thread.to||'',cc:thread.cc||'',bcc:thread.bcc||'',showCc:Boolean(thread.cc),showBcc:Boolean(thread.bcc),subject:thread.subject,body:thread.body,attachments:[...(thread.attachments||[])],maximized:false,minimized:false };
  else if (thread && mode === 'reply') composeState = { id:null, to:thread.from, cc:'', bcc:'', subject:thread.subject.startsWith('Re:')?thread.subject:`Re: ${thread.subject}`, body:`\n\nOn ${shortDate(thread.date)}, ${thread.fromName} wrote:\n> ${thread.snippet}`, attachments:[],maximized:false,minimized:false };
  else if (thread && mode === 'forward') composeState = { id:null,to:'',cc:'',bcc:'',subject:`Fwd: ${thread.subject}`,body:`\n\n---------- Forwarded message ----------\nFrom: ${thread.fromName} <${thread.from}>\nDate: ${shortDate(thread.date)}\nSubject: ${thread.subject}\n\n${thread.body}`,attachments:[...thread.attachments],maximized:false,minimized:false };
  else if (thread) composeState = { id:thread.id,to:thread.to||'',cc:'',bcc:'',subject:thread.subject,body:thread.body,attachments:[...(thread.attachments||[])],maximized:false,minimized:false };
  else composeState = { id:null,to:'',cc:'',bcc:'',subject:'',body:'',attachments:[],maximized:false,minimized:false };
  menuOpen = '';
  render();
  setTimeout(()=>document.querySelector('#compose-to')?.focus(),30);
}
function closeCompose(saveIt=true) { if (saveIt) saveDraft(true); composeState=null; render(); }
function sendCompose() {
  updateComposeFromInputs();
  const c = composeState;
  if (!c.to.trim()) { toast('Add at least one recipient'); document.querySelector('#compose-to')?.focus(); return; }
  const recipients = c.to.split(',').map(x=>x.trim()).filter(Boolean);
  if (!recipients.length) { toast('Add at least one recipient'); return; }
  if (c.id) state.threads = state.threads.filter(t=>t.id!==c.id);
  const account=getAccount();
  const sent = { id:`s${Date.now()}`, folder:'sent', sent:true, category:'primary', from:account.email, fromName:account.name, to:c.to, cc:c.cc||'', bcc:c.bcc||'', toName:recipients[0].split('@')[0], avatar:account.initials, color:'blue', subject:c.subject||'(no subject)', snippet:c.body.replace(/\s+/g,' ').slice(0,150), date:new Date().toISOString(), unread:false, starred:false, labels:[], attachments:c.attachments, body:c.body, messages:[{fromName:account.name,email:account.email,date:new Date().toISOString(),body:c.body}] };
  state.threads.unshift(sent); save(); composeState=null; currentView='sent'; openThreadId=null; toast('Message sent'); render();
}
function mutateThread(id, action) {
  const thread = state.threads.find(t=>t.id===id); if (!thread) return;
  if (action === 'archive') { const old=thread.folder; if(old==='sent')thread.sent=true; thread.folder='archived'; toastUndo('Conversation archived', [{id,folder:old}]); }
  if (action === 'delete') { const old=thread.folder; if (old==='trash') { state.threads=state.threads.filter(t=>t.id!==id); undoAction={message:'Conversation permanently deleted'}; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{undoAction=null;render();},3200); } else { thread.folder='trash'; toastUndo('Moved to Trash', [{id,folder:old}]); } }
  if (action === 'star') thread.starred=!thread.starred;
  if (action === 'read') thread.unread=!thread.unread;
  if (action === 'snooze') { const old=thread.folder; thread.snoozedUntil=new Date(Date.now()+86400000).toISOString(); thread.snoozeReturnFolder=old; thread.folder='snoozed'; toastUndo('Snoozed until tomorrow', [{id,folder:old}]); }
  save(); render();
}
function bulk(action) {
  if (!selected.size) return;
  const ids=[...selected], undo=[];
  const markRead = ids.some(id=>state.threads.find(x=>x.id===id)?.unread);
  let permanentlyDeleted=false;
  ids.forEach(id=>{ const t=state.threads.find(x=>x.id===id); if(!t)return;
    if(action==='archive'){undo.push({id,folder:t.folder});if(t.folder==='sent')t.sent=true;t.folder='archived';}
    if(action==='delete'){if(t.folder==='trash'){state.threads=state.threads.filter(x=>x.id!==id);permanentlyDeleted=true;}else{undo.push({id,folder:t.folder});t.folder='trash';}}
    if(action==='read')t.unread=!markRead;
    if(action==='snooze'){undo.push({id,folder:t.folder});t.snoozeReturnFolder=t.folder;t.snoozedUntil=new Date(Date.now()+86400000).toISOString();t.folder='snoozed';}
  });
  selected.clear(); save();
  if(action==='archive'||action==='delete'||action==='snooze') { const message=action==='archive'?'Conversations archived':action==='delete'?(permanentlyDeleted?'Deleted from Trash':'Moved to Trash'):'Snoozed until tomorrow'; if(undo.length)toastUndo(message,undo);else toast(message); } else toast('Updated message state');
  render();
}
function toast(message) { undoAction={message}; clearTimeout(toastTimer); render(); toastTimer=setTimeout(()=>{undoAction=null;render();},3200); }
function toastUndo(message, rows) { undoAction={message,rows}; clearTimeout(toastTimer); render(); toastTimer=setTimeout(()=>{undoAction=null;render();},5000); }
function undo() { if (!undoAction?.rows) { undoAction=null;render();return; } for(const item of undoAction.rows){const t=state.threads.find(x=>x.id===item.id);if(t){t.folder=item.folder;delete t.snoozedUntil;delete t.snoozeReturnFolder;}} undoAction=null;save();render(); }
function openThread(id) { const t=state.threads.find(x=>x.id===id); if(!t)return; if(t.folder==='drafts'){openCompose(t);return;} openThreadId=id; t.unread=false; expandedMessages.clear(); save(); selected.delete(id); menuOpen=''; render(); }
function stepThread(direction) { const items=visibleThreads();const index=items.findIndex(t=>t.id===openThreadId);const next=items[index+direction];if(next)openThread(next.id);else toast(direction<0?'You’re at the newest conversation':'You’re at the oldest conversation'); }
function selectedTargets() { if(openThreadId) return [openThreadId]; return [...selected]; }
function applyLabel(label, checked) { const ids=selectedTargets(); for(const id of ids){const t=state.threads.find(x=>x.id===id); if(!t)continue; if(checked&&!t.labels.includes(label))t.labels.push(label); if(!checked)t.labels=t.labels.filter(x=>x!==label);} save(); }
function createLabel() { const label=prompt('Name your label'); if(!label?.trim())return; const name=label.trim(); if(!state.labels.includes(name))state.labels.unshift(name); menuOpen='';save();render(); }

root.addEventListener('click', e => {
  const target=e.target;
  const select=target.closest('[data-select]'); if(select){e.stopPropagation();const id=select.dataset.select;selected.has(id)?selected.delete(id):selected.add(id);render();return;}
  const star=target.closest('[data-star]'); if(star){e.stopPropagation();mutateThread(star.dataset.star,'star');return;}
  const rowAction=target.closest('[data-row-action]'); if(rowAction){e.stopPropagation();mutateThread(rowAction.dataset.id,rowAction.dataset.rowAction);return;}
  const expand=target.closest('[data-expand-message]'); if(expand){const index=Number(expand.dataset.expandMessage);expandedMessages.add(index);const t=currentThread();const m=t.messages[index];expand.outerHTML=renderMessageCard(t,m,false);return;}
  const attachment=target.closest('[data-attachment]'); if(attachment){const thread=currentThread();attachmentPreview=thread?.attachments.find(file=>file.name===attachment.dataset.attachment)||null;render();return;}
  const view=target.closest('[data-view]'); if(view){currentView=view.dataset.view;openThreadId=null;selected.clear();category='primary';mobileNav=false;menuOpen='';render();return;}
  const cat=target.closest('[data-category]');if(cat){category=cat.dataset.category;selected.clear();render();return;}
  const action=target.closest('[data-action]')?.dataset.action;
  if(action==='toggle-nav'){mobileNav=!mobileNav;render();}
  else if(action==='go-inbox'){e.preventDefault();currentView='inbox';openThreadId=null;category='primary';render();}
  else if(action==='compose')openCompose();
  else if(action==='back'){openThreadId=null;selected.clear();render();}
  else if(action==='select-all'){const ts=visibleThreads();if(ts.every(t=>selected.has(t.id)))ts.forEach(t=>selected.delete(t.id));else ts.forEach(t=>selected.add(t.id));render();}
  else if(action==='bulk-archive')bulk('archive');
  else if(action==='bulk-delete')bulk('delete');
  else if(action==='bulk-read')bulk('read');
  else if(action==='bulk-snooze')bulk('snooze');
  else if(action==='mark-folder-read'||action==='mark-folder-unread'){const unread=action==='mark-folder-read';visibleThreads().forEach(t=>{t.unread=!unread;});menuOpen='';save();render();toast(unread?'All messages marked as read':'All messages marked as unread');}
  else if(action==='archive-one'){mutateThread(openThreadId,'archive');openThreadId=null;render();}
  else if(action==='delete-one'){mutateThread(openThreadId,'delete');openThreadId=null;render();}
  else if(action==='snooze-one'){mutateThread(openThreadId,'snooze');openThreadId=null;render();}
  else if(action==='mark-unread'){const t=currentThread();if(t)t.unread=true;openThreadId=null;save();render();toast('Marked as unread');}
  else if(action==='label-menu'){menuOpen=menuOpen==='labels'?'':'labels';render();}
  else if(action==='apply-labels'){document.querySelectorAll('[data-label-check]').forEach(box=>applyLabel(box.dataset.labelCheck,box.checked));menuOpen='';render();}
  else if(action==='add-label')createLabel();
  else if(action==='settings'){menuOpen='settings';render();}
  else if(action==='close-settings'){menuOpen='';render();}
  else if(action==='theme'){state.theme=state.theme==='dark'?'light':'dark';menuOpen='';save();render();}
  else if(action==='account'){menuOpen=menuOpen==='account'?'':'account';render();}
  else if(action==='switch-account'){state.account=1-state.account;save();menuOpen='';render();toast('Account switched');}
  else if(action==='search-help'){menuOpen=menuOpen==='search-help'?'':'search-help';render();}
  else if(action==='clear-search'){searchText='';const input=document.querySelector('#search');if(input)input.value='';render();}
  else if(action==='refresh'){toast('Inbox is up to date');}
  else if(action==='help'){toast('Tip: press / to search or c to compose');}
  else if(action==='close-compose'){closeCompose(true);}
  else if(action==='discard-compose'){if(composeState?.id)state.threads=state.threads.filter(t=>t.id!==composeState.id);composeState=null;save();render();toast('Draft discarded');}
  else if(action==='minimize-compose'){updateComposeFromInputs();composeState.maximized=false;composeState.minimized=true;render();}
  else if(action==='restore-compose'){composeState.minimized=false;render();setTimeout(()=>document.querySelector('#compose-to')?.focus(),20);}
  else if(action==='maximize-compose'){updateComposeFromInputs();composeState.maximized=!composeState.maximized;render();}
  else if(action==='send')sendCompose();
  else if(action==='show-cc'){updateComposeFromInputs();composeState.showCc=!composeState.showCc;render();}
  else if(action==='show-bcc'){updateComposeFromInputs();composeState.showBcc=!composeState.showBcc;render();}
  else if(action==='reply')openCompose(currentThread(),'reply');
  else if(action==='forward')openCompose(currentThread(),'forward');
  else if(action==='details'){menuOpen=menuOpen==='details'?'':'details';render();}
  else if(action==='close-details'){menuOpen='';render();}
  else if(action==='more-reader'){menuOpen=menuOpen==='reader-more'?'':'reader-more';render();}
  else if(action==='bulk-more'){menuOpen=menuOpen==='bulk-more'?'':'bulk-more';render();}
  else if(action==='format'){const body=document.querySelector('#compose-body');if(body){const start=body.selectionStart,end=body.selectionEnd;body.setRangeText(`**${body.value.slice(start,end)||'bold text'}**`,start,end,'select');body.focus();composeState.body=body.value;}}
  else if(action==='insert-link'){const body=document.querySelector('#compose-body');if(body){const start=body.selectionStart;body.setRangeText('https://',start,start,'end');body.focus();composeState.body=body.value;}}
  else if(action==='emoji'){const body=document.querySelector('#compose-body');if(body){body.setRangeText(' ✨',body.selectionStart,body.selectionEnd,'end');body.focus();composeState.body=body.value;}}
  else if(action==='undo')undo();
  else if(action==='dismiss-toast'){undoAction=null;render();}
  else if(action==='previous-message')stepThread(-1);
  else if(action==='next-message')stepThread(1);
  else if(action==='print')window.print();
  else if(action==='close-preview'){attachmentPreview=null;render();}
});
root.addEventListener('click',e=>{
  const row=e.target.closest('[data-open]');if(row&&!e.target.closest('button'))openThread(row.dataset.open);
  const option=e.target.closest('[data-menu-option]');if(option){const action=option.dataset.menuOption;menuOpen='';if(action==='archive')bulk('archive');else if(action==='delete')bulk('delete');else if(action==='read')bulk('read');else if(action==='snooze'){[...selected].forEach(id=>mutateThread(id,'snooze'));selected.clear();}render();}
});
root.addEventListener('click',e=>{const choice=e.target.closest('[data-set-theme]');if(choice){state.theme=choice.dataset.setTheme;save();render();}});
root.addEventListener('click',e=>{const choice=e.target.closest('[data-density]');if(choice){state.density=choice.dataset.density;save();render();}});
root.addEventListener('input',e=>{
  if(e.target.id==='search'){const pos=e.target.selectionStart;searchText=e.target.value;render();const next=document.querySelector('#search');next.focus();next.setSelectionRange(pos,pos);}
  if(e.target.matches('#compose-to,#compose-cc,#compose-bcc,#compose-subject,#compose-body')){updateComposeFromInputs();clearTimeout(window.draftTimer);window.draftTimer=setTimeout(()=>saveDraft(true),450);}
});
root.addEventListener('change',e=>{
  if(e.target.id==='file-attach'&&composeState){const files=[...e.target.files].map(f=>({name:f.name,size:f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(f.size/1024))} KB`,type:f.name.split('.').pop()}));composeState.attachments.push(...files);render();}
  if(e.target.matches('[data-label-check]'))applyLabel(e.target.dataset.labelCheck,e.target.checked);
});
root.addEventListener('click',e=>{const remove=e.target.closest('[data-remove-attachment]');if(remove&&composeState){composeState.attachments.splice(Number(remove.dataset.removeAttachment),1);render();}});
root.addEventListener('keydown',e=>{
  const row=e.target.closest('.message-row[data-open]');
  if(!row||e.target!==row||!['Enter',' '].includes(e.key))return;
  e.preventDefault();
  e.stopPropagation();
  openThread(row.dataset.open);
});
document.addEventListener('keydown',e=>{
  const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
  if(e.key==='Escape'){if(attachmentPreview){attachmentPreview=null;render();}else if(composeState){closeCompose(true);}else if(menuOpen){menuOpen='';render();}else if(openThreadId){openThreadId=null;render();}else if(mobileNav){mobileNav=false;render();}return;}
  if(typing||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.key==='/'){e.preventDefault();document.querySelector('#search')?.focus();}
  if(e.key==='c')openCompose();
  if(e.key==='e'&&openThreadId){mutateThread(openThreadId,'archive');openThreadId=null;render();}
  if(e.key==='#'&&openThreadId){mutateThread(openThreadId,'delete');openThreadId=null;render();}
  if(e.key==='Enter'&&selected.size===1)openThread([...selected][0]);
});
render();
scheduleSnoozes();
