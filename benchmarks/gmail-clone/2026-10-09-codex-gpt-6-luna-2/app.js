const iconPaths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-.9 1-2.1 1.2-2.1 2.7M12 17h.01"/>',
  settings: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z"/>',
  apps: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  archive: '<path d="M4 5h16v4H4zM6 9v10h12V9M10 13h4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  mailOpen: '<path d="m3 9 9-6 9 6v10H3z"/><path d="m3 9 9 6 9-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  label: '<path d="M20 13 13 20 4 11V4h7z"/><circle cx="8" cy="8" r="1"/>',
  send: '<path d="m21 3-7.5 18-3.5-7-7-3.5L21 3Z"/><path d="M10 14 21 3"/>',
  paperclip: '<path d="m8 12.5 6.7-6.7a3 3 0 0 1 4.3 4.3l-8.5 8.5a5 5 0 0 1-7.1-7.1L12 3"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/>',
  expand: '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  moreVertical: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  pencil: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15l-1 5Z"/>',
  inbox: '<path d="M4 4h16l2 10v6H2v-6L4 4Z"/><path d="M2 14h6l2 3h4l2-3h6"/>',
  tag: '<path d="M20 13 13 20 4 11V4h7z"/><circle cx="8" cy="8" r="1"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  print: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/>',
};
const icon = (name, size = 20) => `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.mail}</svg>`;
const now = Date.now();
const ago = (minutes) => now - minutes * 60_000;
const seedData = [
  { id:'m1', from:'Maya Chen', email:'maya@linear.app', initials:'MC', color:'lilac', subject:'The new project space is ready ✨', snippet:'A little preview of what we’ve been building together. I added the three team views we talked about…', minutes:14, category:'Primary', labels:['Work'], starred:true, body:'Hey Alex,\n\nA little preview of what we’ve been building together. I added the three team views we talked about and set up the first round of automations.\n\nThe launch board is ready for a first look. If you have a few minutes this afternoon, I’d love your eyes on the onboarding flow before we share it with the team.\n\nThanks for being such a thoughtful partner on this.\n\nMaya', replies:[{from:'You',email:'alex@studio.co',body:'This looks fantastic. I’ll take a pass before our check-in and leave comments right in the board.',minutes:31}], attachment:'Launch board.fig' },
  { id:'m2', from:'Studio North', email:'hello@studionorth.co', initials:'SN', color:'peach', subject:'Friday’s moodboard — a few directions', snippet:'Hi Alex, sharing the first three visual directions for the Fieldnotes identity. The quiet one is my favorite so far…', minutes:48, category:'Primary', labels:['Design'], starred:false, attachment:'fieldnotes-directions.pdf', body:'Hi Alex,\n\nSharing the first three visual directions for the Fieldnotes identity. The quiet one is my favorite so far, but I’m curious what feels most like you.\n\nWe explored the warmer palette from our call alongside a more editorial direction. The little annotations in the deck explain where each idea could go next.\n\nNo rush — happy to walk through everything together on Friday.\n\nAll the best,\nStudio North' },
  { id:'m3', from:'Jon Bell', email:'jon@sideproject.fm', initials:'JB', color:'mint', subject:'Re: the tiny podcast idea', snippet:'One recording, no big production. Just us talking about the little things we are making…', minutes:86, category:'Primary', labels:['Personal'], starred:false, body:'This is the format I keep coming back to: one recording, no big production. Just us talking about the little things we are making and what we learned along the way.\n\nI made a rough outline so we have somewhere to start, but I think the best parts will happen when we wander off-script.', replies:[{from:'You',email:'alex@studio.co',body:'I’m in. Thursday mornings are usually quiet on my end — want to try a first recording next week?',minutes:121},{from:'Jon Bell',email:'jon@sideproject.fm',body:'Thursday is perfect. I’ll bring the terrible coffee and a very forgiving microphone.',minutes:190}] },
  { id:'m4', from:'Figma', email:'notifications@figma.com', initials:'F', color:'multicolor', subject:'Nora left a comment in “Fieldnotes / Brand”', snippet:'“I think we’ve found the right balance here. Could we see this lockup with the warmer green too?”', minutes:173, category:'Updates', labels:['Work'], starred:false, body:'Nora left a comment in Fieldnotes / Brand\n\n“I think we’ve found the right balance here. Could we see this lockup with the warmer green too?”\n\nOpen the file to reply, react, or resolve the comment.', threadCount:3 },
  { id:'m5', from:'Amara Okafor', email:'amara@hey.com', initials:'AO', color:'rose', subject:'Sunday, the coast, and absolutely no plans', snippet:'I found the little guesthouse I was telling you about. It’s quiet, right by the water, and has a kitchen…', minutes:286, category:'Primary', labels:['Personal'], starred:true, body:'I found the little guesthouse I was telling you about. It’s quiet, right by the water, and has a kitchen with an actual view.\n\nI’m thinking slow mornings, long walks, and absolutely no plans after 4pm. You in? I can take care of the booking if you tell me which weekend works.', attachment:'coast-weekend.jpg' },
  { id:'m6', from:'Morrow Coffee', email:'notes@morrow.coffee', initials:'M', color:'coffee', subject:'A small thing we learned about making a good cup', snippet:'The best coffee we make is rarely the fanciest. It’s the one we take the time to notice…', minutes:412, category:'Promotions', labels:[], starred:false, body:'The best coffee we make is rarely the fanciest. It’s the one we take the time to notice.\n\nThis week we’re spending time with a little lot from Huila, Colombia — soft citrus, panela, and a finish that reminds us of the last light on a long afternoon.\n\nIf you’re nearby, come say hi. There’s a fresh pot on.\n\n— The Morrow team' },
  { id:'m7', from:'Nora Patel', email:'nora@fieldnotes.design', initials:'NP', color:'blue', subject:'Can you take a look at this before lunch?', snippet:'Just the little landing page intro and the new signup confirmation. I kept both intentionally simple…', minutes:530, category:'Primary', labels:['Work'], starred:false, body:'Hey Alex,\n\nCan you take a look at this before lunch? Just the little landing page intro and the new signup confirmation. I kept both intentionally simple, but the second sentence might need a little more warmth.\n\nIf you get a chance to read it out loud, that’s usually the test that works for me.\n\nNora' },
  { id:'m8', from:'Notion', email:'team@makenotion.com', initials:'N', color:'notion', subject:'Your weekly workspace digest', snippet:'You have 4 updates across Product notes, Reading list, and the Team handbook…', minutes:810, category:'Updates', labels:[], starred:false, body:'Your week in Notion\n\nProduct notes — 2 new comments\nReading list — 1 new item added\nTeam handbook — “How we work” was updated\n\nYou’re all caught up. See everything in your workspace.' },
  { id:'m9', from:'Dad', email:'dad@family.mail', initials:'D', color:'sun', subject:'Photos from the garden', snippet:'The tomatoes finally decided to show up. Your mother says I need to stop sending pictures of them, but…', minutes:1190, category:'Primary', labels:['Personal'], starred:false, body:'The tomatoes finally decided to show up. Your mother says I need to stop sending pictures of them, but this one is especially impressive.\n\nThe basil is thriving too. I think the secret was the extra sunny spot near the fence.\n\nHope your week is going well. Call when you have a quiet minute.\n\nLove,\nDad', attachment:'garden-photos.zip' },
  { id:'m10', from:'Nadia at Read.cv', email:'hello@read.cv', initials:'R', color:'rose', subject:'Meet the people building thoughtful things', snippet:'A small gathering for designers and builders who care about the details. You are on the list…', minutes:1570, category:'Promotions', labels:[], starred:false, body:'You’re invited to a small gathering for designers and builders who care about the details.\n\nThursday, October 15 · 6:30 pm\nThe Reading Room, 24 Orchard Street\n\nThere’ll be a few short conversations, warm drinks, and plenty of time to meet other people making thoughtful things. You’re on the list — just let us know if you can make it.' },
  { id:'m11', from:'Sam Rivera', email:'sam@studio.co', initials:'SR', color:'amber', subject:'Notes from our little walk', snippet:'I keep thinking about the part you said on the bridge: “good work leaves a little room for surprise”…', minutes:2410, category:'Primary', labels:['Personal'], starred:false, body:'I keep thinking about the part you said on the bridge: “good work leaves a little room for surprise.” It sounds obvious written down, but it changed how I approached the whole afternoon.\n\nSending you the playlist I mentioned, too. Track five feels like the weather we had.\n\nLet’s do it again soon.' },
  { id:'m12', from:'GitHub', email:'noreply@github.com', initials:'GH', color:'slate', subject:'[fieldnotes/site] Pull request #84 needs your review', snippet:'Alex Chen requested your review on the homepage refresh. “Tightened the hero and improved the keyboard focus…”', minutes:3180, category:'Updates', labels:['Work'], starred:false, body:'Alex Chen requested your review on pull request #84.\n\nTightened the homepage hero and improved the keyboard focus treatment across the navigation.\n\nFiles changed: 8 · +124 −61\n\nReview pull request' },
  { id:'m13', from:'Harper Lee', email:'harper@slowmail.club', initials:'HL', color:'lavender', subject:'A book I think you’d love', snippet:'It’s about attention, but not in the productivity sense. More like the little rituals that help us…', minutes:3960, category:'Primary', labels:['Personal'], starred:false, body:'It’s about attention, but not in the productivity sense. More like the little rituals that help us notice our lives while they’re happening.\n\nThere’s a chapter about making things slowly that I underlined about seven times. It felt like something you’d appreciate.\n\nI’ll bring it next time we meet.' },
  { id:'m14', from:'Fieldnotes Studio', email:'billing@fieldnotes.design', initials:'FS', color:'olive', subject:'Your receipt for Fieldnotes Studio', snippet:'Your monthly plan renewed today. Thanks for making space for the good work…', minutes:4980, category:'Updates', labels:[], starred:false, body:'Thanks for making space for the good work. Your monthly plan renewed successfully.\n\nFieldnotes Studio · Pro plan\nOctober 9, 2026 · $18.00\n\nManage your plan or download your receipt from your account settings.', attachment:'receipt-oct.pdf' },
  { id:'m15', from:'Leo Martins', email:'leo@leo.works', initials:'LM', color:'orange', subject:'Re: Thursday’s supper', snippet:'I’ll bring the sourdough and that olive oil from the little shop on 8th. Six-ish still works?…', minutes:6370, category:'Primary', labels:['Personal'], starred:false, body:'I’ll bring the sourdough and that olive oil from the little shop on 8th. Six-ish still works? I can come a little earlier if you want a hand with anything.\n\nVery much looking forward to this.', replies:[{from:'You',email:'alex@studio.co',body:'Six is great. I’ll make the big pot of tomato beans you liked last time.',minutes:7250}] },
  { id:'m16', from:'Are.na', email:'dispatch@are.na', initials:'A', color:'teal', subject:'A collection for a slower internet', snippet:'A few channels that found their way into the same orbit this week. Small, generous, and made to be wandered…', minutes:7900, category:'Social', labels:[], starred:false, body:'A few channels that found their way into the same orbit this week. Small, generous, and made to be wandered through slowly.\n\nOn digital gardens, personal websites, and the joy of following a link without knowing where it leads.' },
  { id:'m17', from:'Luca Moretti', email:'luca@luca.design', initials:'LM', color:'sky', subject:'A couple references for the type study', snippet:'Found these in an old bookshop yesterday. The narrow grotesk is something else…', minutes:9980, category:'Primary', labels:['Design'], starred:true, body:'Found these in an old bookshop yesterday. The narrow grotesk is something else — the spacing feels almost impossibly generous.\n\nI scanned a couple of the pages for you. There’s something in the second specimen that could work beautifully for the display treatment.', attachment:'type-specimens.zip' },
  { id:'m18', from:'Mina Park', email:'mina@nearby.city', initials:'MP', color:'coral', subject:'I saved you a seat for the reading', snippet:'No pressure at all, but the little bookstore on Pine is hosting a reading next Wednesday…', minutes:13200, category:'Primary', labels:['Personal'], starred:false, body:'No pressure at all, but the little bookstore on Pine is hosting a reading next Wednesday and I saved you a seat.\n\nIt starts at 7. The author writes these beautiful short essays about ordinary rooms and the things we remember in them. Felt very much like your kind of evening.' },
  { id:'m19', from:'Stripe', email:'receipts@stripe.com', initials:'S', color:'violet', subject:'Your receipt from Little Current Books', snippet:'Thanks for your order. Your receipt is ready…', minutes:16900, category:'Updates', labels:[], starred:false, body:'Thanks for your order.\n\nLittle Current Books\nThe Creative Act — $28.00\nShipping — $4.50\nTotal — $32.50\n\nYour order will arrive in 3–5 business days.' },
  { id:'m20', from:'The Modern House', email:'letter@themodernhouse.com', initials:'MH', color:'peach', subject:'A home for things that matter', snippet:'This week: a house tucked into the trees, a ceramicist’s studio, and spaces shaped by the people who inhabit them…', minutes:22000, category:'Promotions', labels:[], starred:false, body:'This week: a house tucked into the trees, a ceramicist’s studio, and spaces shaped by the people who inhabit them.\n\nA quieter kind of architecture, where light and material do most of the talking. Take a slow look around.' },
  { id:'m21', from:'Kai Nakamura', email:'kai@common.place', initials:'KN', color:'forest', subject:'Little update from the move', snippet:'The plants survived the trip and the light in the new place is even better than I hoped…', minutes:31000, category:'Primary', labels:['Personal'], starred:false, body:'The plants survived the trip and the light in the new place is even better than I hoped. The little room facing east is already turning into a reading nook.\n\nI’ll send proper photos once I’ve unpacked the boxes. Come over whenever you’re in the neighborhood.' },
  { id:'m22', from:'Linear', email:'updates@linear.app', initials:'L', color:'indigo', subject:'Your team’s week in Linear', snippet:'14 issues completed, 6 projects updated, and one new cycle starts Monday…', minutes:39000, category:'Updates', labels:['Work'], starred:false, body:'Your team’s week in Linear\n\n14 issues completed\n6 projects updated\nOne new cycle starts Monday\n\nSee what moved forward this week.' },
  { id:'m23', from:'Jo Flores', email:'jo@jo.fyi', initials:'JF', color:'green', subject:'Re: little things worth keeping', snippet:'I made a shared list — old cinema tickets, notes in library books, that tiny ceramic bird…', minutes:49000, category:'Primary', labels:['Personal'], starred:false, body:'I made a shared list: old cinema tickets, notes in library books, that tiny ceramic bird from the market.\n\nThe stuff that has no practical use but somehow makes a place feel like ours. Add anything you think of!', replies:[{from:'You',email:'alex@studio.co',body:'A postcard from every place we’ve had a long breakfast. And the little paper map from Kyoto.',minutes:52200}] },
  { id:'m24', from:'Sofia Almeida', email:'sofia@wildflower.studio', initials:'SA', color:'magenta', subject:'Your print is on its way 🌿', snippet:'I wrapped it up this morning — there is a little handwritten note inside, too…', minutes:69000, category:'Primary', labels:[], starred:false, body:'I wrapped it up this morning — there is a little handwritten note inside, too.\n\nIt should be with you early next week. Thank you for choosing one of the originals; it means a lot when a piece finds a new home.', attachment:'shipping-details.pdf' },
  { id:'m25', from:'Cleo Williams', email:'cleo@everyday.press', initials:'CW', color:'yellow', subject:'The good kind of unfinished', snippet:'A short note about prototypes, second drafts, and remembering that making something is a way of thinking…', minutes:85000, category:'Forums', labels:['Reading'], starred:false, body:'A short note about prototypes, second drafts, and remembering that making something is a way of thinking.\n\nThe best ideas I’ve had started as half-sentences in the margin. They weren’t waiting to be polished; they were asking to be followed.\n\nThis week, leave one thing a little unfinished. See what it wants to become.' },
  { id:'m26', from:'You', email:'alex@studio.co', initials:'AC', color:'blue', subject:'Re: notes for the studio day', snippet:'I’ll bring the paper samples and the little speaker. See everyone at 10…', minutes:96000, category:'Primary', labels:['Work'], starred:false, sent:true, inInbox:false, body:'I’ll bring the paper samples and the little speaker. See everyone at 10 — looking forward to a day away from screens.' },
  { id:'m27', from:'The Sunday Letter', email:'hello@sundayletter.email', initials:'SL', color:'lavender', subject:'A note about taking the long way', snippet:'Sometimes the way home is the part we remember. This week’s letter is about wandering without a destination…', minutes:119000, category:'Promotions', labels:[], starred:false, body:'Sometimes the way home is the part we remember. This week’s letter is about wandering without a destination, noticing a new doorway, and letting the afternoon stay open.' },
  { id:'m28', from:'Rae Kim', email:'rae@raekim.studio', initials:'RK', color:'peach', subject:'The book you lent me', snippet:'I finished it on the train yesterday and had to reread the last page before I got off…', minutes:158000, category:'Primary', labels:['Personal'], starred:false, body:'I finished it on the train yesterday and had to reread the last page before I got off. You were right about the ending.\n\nI left a little note on the inside cover with my favorite line. I’ll bring it back next week.' },
];
const seedDrafts = [{ id:'d1', to:'', subject:'A few thoughts for Monday', body:'Hi team,\n\nI’ve been thinking about the rhythm for next week and wanted to share a couple of ideas…', updatedAt:ago(350) }];
function makeMail(seed) {
  const date = ago(seed.minutes);
  const replies = (seed.replies || []).map((r, i) => ({ sender:r.from, email:r.email, time:ago(r.minutes), body:r.body, initials:r.from.split(' ').map(p=>p[0]).slice(0,2).join(''), color:i?'mint':'blue' }));
  const conversation = [{ sender:seed.from, email:seed.email, time:date, body:seed.body, initials:seed.initials, color:seed.color }, ...replies];
  if (seed.threadCount && conversation.length === 1) {
    conversation.push({ sender:'Nora Patel', email:'nora@fieldnotes.design', time:date-4*3600_000, body:'Thanks for sharing this — I’m looking at it now and will leave a couple of notes in the file.', initials:'NP', color:'blue' });
    conversation.push({ sender:'You', email:'alex@studio.co', time:date-2*3600_000, body:'Perfect, thank you! The warmer green is a good call. I’ll add a version this afternoon.', initials:'AC', color:'blue' });
  }
  return { ...seed, date, read:seed.read ?? seed.sent ?? seed.minutes > 1800, inInbox:seed.inInbox ?? !seed.sent, sent:!!seed.sent, trash:false, spam:false, snoozeUntil:null, conversation, attachment:seed.attachment || null };
}
function initialState() { return { mail:seedData.map(makeMail), drafts:seedDrafts, folder:'inbox', category:'Primary', query:'', selected:[], openId:null, compose:null, modal:null, menu:null, mobileNav:false, dark:false, density:'comfortable', showAllThreads:false }; }
let state;
try { state = JSON.parse(localStorage.getItem('codex-mail-v1')) || initialState(); } catch { state = initialState(); }
if (!Array.isArray(state.mail)) state = initialState();
if (!Array.isArray(state.drafts)) state.drafts=[];
if (!Array.isArray(state.selected)) state.selected=[];
state.mail.forEach(mail=>{if(mail.snoozeUntil&&mail.snoozeUntil<=Date.now()){mail.snoozeUntil=null;mail.inInbox=mail.snoozeReturnToInbox??true;delete mail.snoozeReturnToInbox;}});
const app = document.getElementById('root');
let toastTimer;
let lastUndo = null;
let composeUndo = [];
let composeRedo = [];
function persist() { localStorage.setItem('codex-mail-v1', JSON.stringify(state)); }
const escapeHTML = (value='') => { const node=document.createElement('span'); node.textContent=value; return node.innerHTML; };
const initials = (name='') => name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase() || '?';
const folders = [
  ['inbox','Inbox','inbox'], ['starred','Starred','star'], ['snoozed','Snoozed','clock'], ['sent','Sent','send'], ['drafts','Drafts','pencil'], ['all','All mail','mailOpen'], ['spam','Spam','shield'], ['trash','Trash','trash']
];
const people = [
  ['Maya Chen','maya@linear.app'],['Nora Patel','nora@fieldnotes.design'],['Jon Bell','jon@sideproject.fm'],['Amara Okafor','amara@hey.com'],['Sam Rivera','sam@studio.co'],['Leo Martins','leo@leo.works'],['Mina Park','mina@nearby.city'],['Harper Lee','harper@slowmail.club'],['Kai Nakamura','kai@common.place']
];
function timeLabel(dateValue) {
  const date = new Date(dateValue), today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  const days = Math.floor((today-date)/86400000);
  if (days < 7) return date.toLocaleDateString([], {weekday:'short'});
  return date.toLocaleDateString([], {month:'short',day:'numeric'});
}
function countFor(folder) {
  if (folder === 'inbox') return state.mail.filter(m=>m.inInbox && !m.trash && !m.spam && !m.read).length;
  if (folder === 'starred') return state.mail.filter(m=>m.starred && !m.trash).length;
  if (folder === 'snoozed') return state.mail.filter(m=>m.snoozeUntil && !m.trash).length;
  if (folder === 'sent') return state.mail.filter(m=>m.sent && !m.trash).length;
  if (folder === 'drafts') return state.drafts.length;
  if (folder === 'spam') return state.mail.filter(m=>m.spam).length;
  if (folder === 'trash') return state.mail.filter(m=>m.trash).length;
  return state.mail.filter(m=>!m.trash && !m.spam && !m.inInbox).length;
}
function visibleMail() {
  let list = state.mail.filter(m=>!m.trash && !m.spam);
  if (state.query.trim()) {
    const query=state.query.toLowerCase().trim();
    list=list.filter(m=>[m.from,m.email,m.subject,m.snippet,m.body,m.labels.join(' '),m.attachment||''].join(' ').toLowerCase().includes(query));
  } else switch(state.folder) {
    case 'inbox': list=list.filter(m=>m.inInbox); break;
    case 'starred': list=list.filter(m=>m.starred); break;
    case 'snoozed': list=list.filter(m=>m.snoozeUntil); break;
    case 'sent': list=list.filter(m=>m.sent); break;
    case 'all': break;
    case 'spam': list=state.mail.filter(m=>m.spam); break;
    case 'trash': list=state.mail.filter(m=>m.trash); break;
    default: list=list.filter(m=>m.labels.includes(state.folder));
  }
  if (!state.query && state.folder==='inbox' && state.category!=='All mail') list=list.filter(m=>m.category===state.category);
  return list.sort((a,b)=>b.date-a.date);
}
function labelTone(name) { return ({Work:'violet',Personal:'green',Design:'rose',Reading:'amber'})[name] || 'neutral'; }
function labelPill(name) { return `<span class="label-pill ${labelTone(name)}">${escapeHTML(name)}</span>`; }
function avatar(name, color, size='') { return `<span class="avatar ${color||'blue'} ${size}" aria-hidden="true">${escapeHTML(initials(name))}</span>`; }
function formatBodyText(text='') { return escapeHTML(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>'); }
function toast(message, actionLabel='', action='') {
  let node=document.querySelector('.toast'); if(node) node.remove();
  const el=document.createElement('div'); el.className='toast'; el.innerHTML=`<span>${escapeHTML(message)}</span>${actionLabel?`<button data-action="${action}" class="toast-action">${escapeHTML(actionLabel)}</button>`:''}`;
  document.body.append(el); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.remove(),3400);
}
function button(action, label, iconName, extra='') { return `<button type="button" class="icon-button ${extra}" data-action="${action}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${icon(iconName)}</button>`; }
function navItem([id,label,iconName]) {
  const active=state.folder===id && !state.query, count=countFor(id);
  let n=''; if ((id==='inbox'||id==='drafts') && count) n=`<span class="nav-count">${count}</span>`;
  return `<button class="nav-item ${active?'active':''}" data-action="navigate" data-folder="${id}">${icon(iconName,18)}<span>${label}</span>${n}</button>`;
}
function sidebar() {
  return `<aside class="sidebar ${state.mobileNav?'mobile-open':''}">
    <button class="compose-button" data-action="compose">${icon('pencil',20)}<span>Compose</span></button>
    <nav aria-label="Mailboxes" class="folder-nav">${folders.slice(0,5).map(x=>navItem(x)).join('')}<div class="nav-divider"></div>${folders.slice(5).map(x=>navItem(x)).join('')}</nav>
    <div class="labels-heading"><span>Labels</span><button class="plain-icon" data-action="new-label" aria-label="Create new label">${icon('plus',17)}</button></div>
    <nav class="label-nav" aria-label="Labels">${[...new Set(['Work','Personal','Design','Reading',...(state.userLabels||[])])].map(label=>`<button class="nav-item label-nav-item ${state.folder===label?'active':''}" data-action="navigate" data-folder="${escapeHTML(label)}"><span class="label-dot ${labelTone(label)}"></span><span>${escapeHTML(label)}</span><span class="label-total">${state.mail.filter(m=>m.labels.includes(label)&&!m.trash).length}</span></button>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="storage-copy"><span>Storage</span><b>4.2 GB of 15 GB</b></div><div class="storage-track"><i></i></div><button class="manage-storage" data-action="storage">Manage storage</button></div>
  </aside>`;
}
function header() {
  return `<header class="topbar">
    <div class="brand-area"><button class="icon-button menu-trigger" data-action="mobile-nav" aria-label="Open navigation">${icon('menu')}</button><span class="brand-mark"><svg viewBox="0 0 40 32" aria-hidden="true"><path fill="#4285f4" d="M3 8.4 18.3 20a2.8 2.8 0 0 0 3.4 0L37 8.4v17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-17Z"/><path fill="#34a853" d="M3.1 8.3A3 3 0 0 1 6 5h1.2L20 15l12.8-10H34a3 3 0 0 1 2.9 3.3L22 19.6a3.3 3.3 0 0 1-4 0L3.1 8.3Z"/><path fill="#ea4335" d="m3 8.3 10.1 7.6L3 24V8.3Z"/><path fill="#fbbc04" d="m37 8.3-10.1 7.6L37 24V8.3Z"/></svg></span><span class="brand-name">Codex</span></div>
    <div class="search-wrap"><span class="search-icon">${icon('search',21)}</span><input id="search" type="search" autocomplete="off" value="${escapeHTML(state.query)}" placeholder="Search mail" aria-label="Search mail">${state.query?button('clear-search','Clear search','close','search-clear'):''}<button class="search-options" data-action="search-help" aria-label="Search operators">${icon('settings',18)}</button></div>
    <div class="header-actions">${button('help','Help','help','header-action')} ${button('settings','Settings','settings','header-action')} <button class="icon-button apps-trigger" data-action="apps" aria-label="Apps">${icon('apps')}</button><button class="account-avatar" data-action="account" aria-label="Account Alex Chen">AC<span class="online-dot"></span></button></div>
  </header>`;
}
function categoryTabs() {
  if (state.folder!=='inbox' || state.query) return '';
  const choices=[['Primary','mail'],['Social','apps'],['Promotions','tag'],['Updates','refresh']];
  return `<div class="category-tabs">${choices.map(([name,ico])=>{const count=state.mail.filter(m=>m.inInbox&&m.category===name&&!m.read).length;return `<button class="category-tab ${state.category===name?'selected':''}" data-action="category" data-category="${name}">${icon(ico,18)}<span>${name}</span>${count?`<b>${count}</b>`:''}</button>`}).join('')}</div>`;
}
function toolbar(list) {
  const selected=state.selected.length;
  if(selected) return `<div class="list-toolbar selected-toolbar"><button class="checkbox-control ${selected===list.length?'checked':''}" data-action="select-all" aria-label="Select all">${selected===list.length?icon('check',15):''}</button><span class="selection-count">${selected} selected</span><div class="toolbar-separator"></div>${button('bulk-archive','Archive','archive')}${button('bulk-trash','Delete','trash')}${button('bulk-read','Mark read or unread','mail')}${button('label-menu','Label as','label')}${button('snooze-menu','Snooze','clock')}${button('clear-selection','Clear selection','close','push-right')}</div>`;
  const allSelected=list.length>0 && list.every(m=>state.selected.includes(m.id));
  return `<div class="list-toolbar"><button class="checkbox-control ${allSelected?'checked':''}" data-action="select-all" aria-label="Select all">${allSelected?icon('check',15):''}</button><button class="toolbar-caret" data-action="select-menu" aria-label="Selection options">${icon('down',12)}</button>${button('refresh','Refresh','refresh')}${button('more-menu','More','more')}<div class="toolbar-separator"></div><span class="mail-range">${list.length?`${Math.max(1,Math.min(list.length,1+list.indexOf(list.find(x=>x.id===state.openId))))}–${list.length} of ${list.length}`:'0 of 0'}</span>${button('older','Newer','left','page-arrow')}${button('newer','Older','chevron','page-arrow')}</div>`;
}
function mailRow(mail) {
  const selected=state.selected.includes(mail.id);
  const labelHTML=(mail.labels||[]).slice(0,2).map(labelPill).join('');
  const thread=mail.conversation.length>1?`<span class="thread-count">${mail.conversation.length}</span>`:'';
  const attachment=mail.attachment?`<span class="row-attachment">${icon('paperclip',14)}<span>${escapeHTML(mail.attachment)}</span></span>`:'';
  return `<article class="mail-row ${mail.read?'read':'unread'} ${selected?'is-selected':''}" data-action="open-mail" data-id="${mail.id}" tabindex="0" role="button" aria-label="${escapeHTML(mail.from)}, ${escapeHTML(mail.subject)}">
    <button class="checkbox-control row-check ${selected?'checked':''}" data-action="select-mail" data-id="${mail.id}" aria-label="Select message">${selected?icon('check',15):''}</button>
    <button class="star-button ${mail.starred?'starred':''}" data-action="toggle-star" data-id="${mail.id}" aria-label="${mail.starred?'Unstar':'Star'} message">${icon('star',19)}</button>
    <span class="sender-name">${escapeHTML(mail.from)}${thread}</span>
    <span class="mail-copy"><span class="subject-text">${escapeHTML(mail.subject)}</span><span class="snippet-text"> — ${escapeHTML(mail.snippet)}</span></span>
    <span class="row-labels">${labelHTML}</span>${attachment}
    <span class="row-date">${timeLabel(mail.date)}</span><span class="row-hover-actions">${mail.trash?button('restore','Restore','inbox'):button('row-archive','Archive','archive')}${button('row-trash',mail.trash?'Delete forever':'Delete','trash')}</span>
  </article>`;
}
function emptyState() {
  const title=state.query?'No messages match your search':state.folder==='inbox'?'You’re all caught up':`No mail in ${state.folder}`;
  const copy=state.query?'Try a different name, subject, or keyword.':state.folder==='inbox'?'A little breathing room in your inbox. We love to see it.':'Messages you find here will appear in this space.';
  return `<div class="empty-state"><div class="empty-illustration"><div class="empty-sun"></div><div class="empty-paper"><span></span><span></span><span></span></div><div class="empty-star">✦</div></div><h2>${title}</h2><p>${copy}</p>${state.query?'<button data-action="clear-search" class="text-button">Clear search</button>':''}</div>`;
}
function listView() {
  const list=visibleMail();
  const title=state.query?'Search results':state.folder==='inbox'?'Your inbox':state.folder==='all'?'All mail':state.folder==='starred'?'Starred':state.folder==='snoozed'?'Snoozed':state.folder==='sent'?'Sent':state.folder==='drafts'?'Drafts':state.folder;
  if(state.folder==='drafts'&&!state.query) return `<section class="mail-panel"><div class="panel-heading"><div><span class="eyebrow">YOUR MAIL</span><h1>${escapeHTML(title)}</h1><p>${state.drafts.length?`${state.drafts.length} saved for later`:'Nothing waiting in your drafts'}</p></div>${button('new-draft','New draft','pencil','primary-small')}</div>${state.drafts.length?`<div class="draft-list">${state.drafts.map(d=>`<article class="draft-row" data-action="edit-draft" data-id="${d.id}">${avatar('You','blue')}<div class="draft-copy"><b>${escapeHTML(d.to||'(no recipients)')}</b><strong>${escapeHTML(d.subject||'(no subject)')}</strong><span>${escapeHTML(d.body||'')}</span></div><small>${timeLabel(d.updatedAt)}</small><button data-action="draft-trash" data-id="${d.id}" class="icon-button" aria-label="Delete draft">${icon('trash',17)}</button></article>`).join('')}</div>`:emptyState()}</section>`;
  return `<section class="mail-panel ${state.density==='compact'?'compact':''}">${toolbar(list)}${categoryTabs()}${list.length?`<div class="mail-list" aria-label="${escapeHTML(title)}">${list.map(mailRow).join('')}</div><div class="list-footer"><span>Showing ${list.length} ${list.length===1?'conversation':'conversations'}</span><span>Last synced just now</span></div>`:emptyState()}</section>`;
}
function readerView(mail) {
  if(!mail) return listView();
  const convo=mail.conversation||[];
  const total=convo.length;
  const expanded=(idx)=>state.showAllThreads || idx===total-1 || total===1;
  return `<section class="reader-panel"><div class="reader-toolbar">${button('back','Back to inbox','left')}${button('archive-one','Archive','archive')}${button('trash-one','Delete','trash')}${button(mail.read?'mark-unread-one':'mark-read-one',mail.read?'Mark unread':'Mark read',mail.read?'mail':'mailOpen')}${button('snooze-menu','Snooze','clock')}<div class="toolbar-separator"></div>${button('more-menu','More','more')}<span class="reader-toolbar-spacer"></span><span class="reader-position">${visibleMail().findIndex(m=>m.id===mail.id)+1} of ${visibleMail().length}</span>${button('previous-mail','Newer','left')}${button('next-mail','Older','chevron')}</div>
    <div class="reader-content"><div class="reader-subject"><h1>${escapeHTML(mail.subject)}</h1><span class="reader-labels">${(mail.labels||[]).map(labelPill).join('')}</span><button class="star-button ${mail.starred?'starred':''}" data-action="toggle-star" data-id="${mail.id}" aria-label="Toggle star">${icon('star',20)}</button></div>
      ${!state.showAllThreads&&total>2?`<button class="thread-expand" data-action="expand-thread"><span class="thread-stack">${convo.slice(0,total-1).map(x=>`<span class="mini-avatar ${x.color}">${escapeHTML(x.initials)}</span>`).join('')}</span><span>${total-1} earlier messages</span><span class="thread-date">${timeLabel(convo[0].time)}</span>${icon('down',16)}</button>`:''}
      <div class="conversation">${convo.map((message,index)=>expanded(index)?`<article class="message-card ${index===total-1?'latest':''}"><div class="message-head">${avatar(message.sender,message.color)}<div class="message-sender"><b>${escapeHTML(message.sender)}</b><span>${escapeHTML(message.email)}</span></div><span class="message-date">${timeLabel(message.time)}</span>${button('reply-menu','Reply','undo','message-reply-icon')}${button('more-message','More','moreVertical','message-more-icon')}</div><div class="message-body">${formatBodyText(message.body).split('\n\n').map(p=>`<p>${p.replaceAll('\n','<br>')}</p>`).join('')}${index===total-1&&mail.attachment?`<div class="attachment-card"><div class="attachment-preview ${mail.attachment.endsWith('.fig')?'fig':''}">${mail.attachment.endsWith('.fig')?'✦':icon('file',26)}</div><div class="attachment-details"><b>${escapeHTML(mail.attachment)}</b><span>${mail.attachment.endsWith('.pdf')?'PDF document':'File attachment'} · 2.4 MB</span></div><button data-action="download" data-id="${mail.id}" class="attachment-download" aria-label="Download attachment">${icon('arrow',17)}</button></div>`:''}</div></article>`:'').join('')}</div>
      <div class="reader-actions"><button class="reply-button" data-action="reply"><span>${icon('undo',17)}</span> Reply</button><button class="reply-button" data-action="forward"><span>${icon('redo',17)}</span> Forward</button><button class="reaction-button" data-action="react" aria-label="React">☺</button></div>
    </div></section>`;
}
function modal() {
  if(!state.modal) return '';
  const type=state.modal.type;
  if(type==='label') return `<div class="popover label-popover"><b>Label as</b>${['Work','Personal','Design','Reading'].map(label=>`<label><input type="checkbox" data-label-check="${label}" ${state.modal.ids.every(id=>state.mail.find(m=>m.id===id)?.labels.includes(label))?'checked':''}><span class="label-dot ${labelTone(label)}"></span>${label}</label>`).join('')}<button class="small-primary" data-action="apply-labels">Apply</button></div>`;
  if(type==='snooze') return `<div class="popover snooze-popover"><b>Snooze until</b>${[['Later today','6:00 PM',3],['Tomorrow','8:00 AM',18],['This weekend','Saturday, 9:00 AM',48],['Next week','Monday, 9:00 AM',120]].map(([name,desc,hours])=>`<button data-action="set-snooze" data-hours="${hours}"><span>${name}</span><small>${desc}</small></button>`).join('')}<button data-action="custom-snooze">Choose date & time…</button></div>`;
  if(type==='menu') {const hasTargets=state.selected.length>0||!!state.openId;return `<div class="popover more-popover">${hasTargets?`<button data-action="bulk-read">${icon('mail',16)} Mark as read</button><button data-action="bulk-archive">${icon('archive',16)} Archive</button><button data-action="label-menu">${icon('label',16)} Label as</button><button data-action="snooze-menu">${icon('clock',16)} Snooze</button>`:`<button data-action="bulk-read">${icon('mail',16)} Mark all as read</button><button data-action="select-menu">${icon('check',16)} Select all</button>`}</div>`;}
  if(type==='custom-snooze') return `<div class="modal-scrim"><div class="small-modal"><button class="modal-close" data-action="close-modal">${icon('close',18)}</button><h2>Choose when to return</h2><p>We’ll bring this conversation back to your inbox.</p><label>Date<input type="date" id="snooze-date"></label><label>Time<input type="time" id="snooze-time" value="09:00"></label><button class="primary-action" data-action="save-custom-snooze">Save</button></div></div>`;
  if(type==='settings') return `<div class="modal-scrim" data-action="close-modal"><div class="settings-modal" data-stop><header><h2>Quick settings</h2><button class="icon-button" data-action="close-modal">${icon('close')}</button></header><section><h3>Theme</h3><div class="theme-options"><button data-action="theme-light" class="theme-card ${!state.dark?'chosen':''}"><span class="theme-light-preview"></span><b>Light</b></button><button data-action="theme-dark" class="theme-card ${state.dark?'chosen':''}"><span class="theme-dark-preview"></span><b>Dark</b></button></div></section><section><h3>Inbox density</h3><div class="density-options"><button data-action="density-comfortable" class="${state.density==='comfortable'?'chosen':''}">${icon('mail',18)} Comfortable</button><button data-action="density-compact" class="${state.density==='compact'?'chosen':''}">${icon('mailOpen',18)} Compact</button></div></section><section class="settings-note"><span class="setting-glyph">✦</span><div><b>Your inbox, your pace.</b><p>Preferences are saved on this device.</p></div></section></div></div>`;
  if(type==='shortcuts') return `<div class="modal-scrim" data-action="close-modal"><div class="small-modal shortcuts-modal" data-stop><button class="modal-close" data-action="close-modal">${icon('close',18)}</button><h2>Keyboard shortcuts</h2><p>Move through your inbox without missing a beat.</p><div class="shortcut-line"><span>Compose</span><kbd>c</kbd></div><div class="shortcut-line"><span>Search mail</span><kbd>/</kbd></div><div class="shortcut-line"><span>Archive conversation</span><kbd>e</kbd></div><div class="shortcut-line"><span>Delete conversation</span><kbd>#</kbd></div><div class="shortcut-line"><span>Star conversation</span><kbd>s</kbd></div><div class="shortcut-line"><span>Next / previous</span><kbd>j</kbd><kbd>k</kbd></div></div></div>`;
  if(type==='account') return `<div class="popover account-popover"><div class="account-card">${avatar('Alex Chen','blue','large')}<div><b>Alex Chen</b><span>alex@studio.co</span></div></div><button data-action="manage-account">Manage your account</button><button data-action="signout">Local demo account</button></div>`;
  if(type==='new-label') return `<div class="modal-scrim" data-action="close-modal"><div class="small-modal" data-stop><button class="modal-close" data-action="close-modal">${icon('close',18)}</button><h2>Create a label</h2><p>Labels help you find the things that matter.</p><input id="new-label-name" class="form-input" placeholder="Label name" maxlength="24"><button class="primary-action" data-action="save-label">Create</button></div></div>`;
  if(type==='help' || type==='search-help' || type==='apps' || type==='storage') return `<div class="modal-scrim" data-action="close-modal"><div class="small-modal" data-stop><button class="modal-close" data-action="close-modal">${icon('close',18)}</button><span class="dialog-icon">${icon(type==='search-help'?'search':type==='storage'?'file':'help',22)}</span><h2>${type==='search-help'?'Search your mail':type==='storage'?'Storage overview':type==='apps'?'Your workspace':'A little help'}</h2><p>${type==='search-help'?'Search by a person, topic, phrase, or filename. Try “from:maya”, “is:starred”, or “has:attachment”.':type==='storage'?'You’re using 4.2 GB of the 15 GB available for this local demo account.':type==='apps'?'Your favorite tools are all in one place.':'Press “?” any time to see keyboard shortcuts. Your mail is saved locally on this device.'}</p><button class="primary-action" data-action="close-modal">Got it</button></div></div>`;
  return '';
}
function composeView() {
  if(!state.compose) return '';
  const c=state.compose;
  return `<div class="compose-window"><div class="compose-titlebar"><b>${c.id?'Draft':'New message'}</b><div>${button('compose-minimize','Minimize','down')}${button('compose-expand','Expand','expand')}${button('compose-close','Close','close')}</div></div><div class="compose-fields"><div class="compose-field"><label for="compose-to">To</label><input id="compose-to" autocomplete="off" value="${escapeHTML(c.to)}" placeholder="Recipients"></div><div class="compose-field"><label for="compose-cc">Cc</label><input id="compose-cc" value="${escapeHTML(c.cc||'')}" placeholder="Add Cc"></div><div class="compose-field"><label for="compose-subject">Subject</label><input id="compose-subject" value="${escapeHTML(c.subject)}" placeholder="Subject"></div><div class="suggestions" id="contact-suggestions"></div></div>${c.attachment?`<div class="compose-attachment">${icon('paperclip',15)}<span>${escapeHTML(c.attachment.name)}</span><small>${(c.attachment.size/1024/1024).toFixed(1)} MB</small><button data-action="remove-attachment" aria-label="Remove attachment">${icon('close',14)}</button></div>`:''}<input type="file" id="attachment-picker" hidden><textarea id="compose-body" aria-label="Message body" placeholder="Write something thoughtful…">${escapeHTML(c.body)}</textarea><div class="compose-footer"><button class="send-button" data-action="send">Send ${icon('send',16)}</button><div class="compose-tools">${button('format','Bold selected text','pencil')}${button('attach','Attach file','paperclip')}${button('insert-emoji','Insert emoji','smile')}${button('undo-compose','Undo','undo')}${button('redo-compose','Redo','redo')}</div><span class="draft-status">${c.saved?'Saved to Drafts':'Saving…'}</span><button class="icon-button compose-delete" data-action="discard-draft" aria-label="Discard draft">${icon('trash',18)}</button></div></div>`;
}
function shell() {
  const openMail=state.openId && !state.query ? state.mail.find(m=>m.id===state.openId) : null;
  const isSearch=!!state.query;
  const listViewContent=isSearch?listView():openMail?readerView(openMail):listView();
  document.body.classList.toggle('dark-theme',state.dark);
  document.body.classList.toggle('mobile-nav-active',state.mobileNav);
  app.innerHTML=`${header()}${state.mobileNav?'<button class="mobile-scrim" data-action="mobile-nav" aria-label="Close menu"></button>':''}<div class="app-layout">${sidebar()}<main class="main-area"><div class="main-topline"><div class="breadcrumb">${icon(isSearch?'search':(folders.find(f=>f[0]===state.folder)||['labels','', 'tag'])[2],17)}<span>${isSearch?'Search results':state.folder==='inbox'?'Inbox':state.folder==='all'?'All mail':state.folder==='starred'?'Starred':state.folder==='snoozed'?'Snoozed':state.folder==='sent'?'Sent':state.folder==='drafts'?'Drafts':state.folder}</span></div><span class="sync-status"><i></i> Up to date</span></div>${listViewContent}</main></div>${modal()}${composeView()}<div class="keyboard-hint">Press <kbd>?</kbd> for shortcuts</div>`;
  persist();
}
function setFolder(folder) { state.folder=folder; state.query=''; state.openId=null; state.selected=[]; state.category='Primary'; state.mobileNav=false; render(); }
function updateMail(ids, updater) { state.mail=state.mail.map(m=>ids.includes(m.id)?updater(m):m); persist(); }
function selectedIds(id) { return id?[id]:state.selected.slice(); }
function render() { shell(); }
function closeModal() { state.modal=null; render(); }
function saveDraft() {
  if(!state.compose) return;
  const { id,to,cc,subject,body }=state.compose;
  let draft=state.drafts.find(d=>d.id===id);
  if(!draft){draft={id:id||`d${Date.now()}`,to:'',subject:'',body:'',updatedAt:Date.now()};state.drafts.unshift(draft);state.compose.id=draft.id;}
  Object.assign(draft,{to,cc,subject,body,attachment:state.compose.attachment||null,updatedAt:Date.now()});
  state.compose.saved=true; persist();
  const status=document.querySelector('.draft-status'); if(status) status.textContent='Saved to Drafts';
}
function rememberUndo(ids) { lastUndo=ids.map(id=>{const mail=state.mail.find(m=>m.id===id);return mail?{id,values:{inInbox:mail.inInbox,trash:mail.trash,snoozeUntil:mail.snoozeUntil,snoozeReturnToInbox:mail.snoozeReturnToInbox}}:null;}).filter(Boolean); }
function undoLastAction() { if(!lastUndo?.length){toast('Nothing to undo');return;} const snapshot=lastUndo;lastUndo=null;state.mail=state.mail.map(mail=>{const item=snapshot.find(x=>x.id===mail.id);return item?{...mail,...item.values}:mail;});state.selected=[];persist();render();toast('Action undone'); }
function performArchive(ids) { if(!ids.length)return;rememberUndo(ids);updateMail(ids,m=>({...m,inInbox:false,snoozeUntil:null,snoozeReturnToInbox:null}));state.selected=[];state.openId=null;state.modal=null;render();toast(ids.length===1?'Conversation archived':`${ids.length} conversations archived`,'Undo','undo-action'); }
function performTrash(ids) { if(!ids.length)return;if(state.folder==='trash'){state.mail=state.mail.filter(m=>!ids.includes(m.id));state.selected=[];state.openId=null;state.modal=null;persist();render();toast(ids.length===1?'Deleted forever':`${ids.length} permanently deleted`);return;}rememberUndo(ids);updateMail(ids,m=>({...m,trash:true,inInbox:false,snoozeUntil:null,snoozeReturnToInbox:null}));state.selected=[];state.openId=null;state.modal=null;render();toast(ids.length===1?'Moved to Trash':`${ids.length} moved to Trash`,'Undo','undo-action'); }
function markRead(ids) { updateMail(ids,m=>({...m,read:true}));state.selected=[];state.modal=null;render();toast(ids.length===1?'Marked as read':'Marked as read'); }
function markUnread(ids) { updateMail(ids,m=>({...m,read:false}));state.selected=[];state.openId=null;state.modal=null;render();toast(ids.length===1?'Marked as unread':'Marked as unread'); }
function openMail(id) { const mail=state.mail.find(m=>m.id===id);if(!mail)return;mail.read=true;state.openId=id;state.selected=[];state.showAllThreads=false;render(); }
function snooze(ids,hours) { if(!ids.length)return;rememberUndo(ids);const until=Date.now()+hours*3600000;updateMail(ids,m=>({...m,snoozeReturnToInbox:m.inInbox,snoozeUntil:until,inInbox:false}));state.selected=[];state.modal=null;render();toast('Conversation snoozed','Undo','undo-action'); }
function beginCompose(seed={}) { state.compose={id:seed.id||null,to:seed.to||'',cc:seed.cc||'',subject:seed.subject||'',body:seed.body||'',attachment:seed.attachment||null,saved:false};composeUndo=[];composeRedo=[];state.modal=null;render();setTimeout(()=>document.getElementById('compose-to')?.focus(),40); }
function captureCompose() { return {to:state.compose.to,cc:state.compose.cc,subject:state.compose.subject,body:state.compose.body}; }
function pushComposeUndo() { if(state.compose){composeUndo.push(captureCompose());if(composeUndo.length>80)composeUndo.shift();composeRedo=[];} }
function restoreCompose(snapshot) { if(!state.compose)return;Object.assign(state.compose,snapshot);saveDraft();render();document.getElementById('compose-body')?.focus(); }
function sendMail() {
  const c=state.compose;if(!c)return;
  if(!c.to.trim()){document.getElementById('compose-to')?.focus();toast('Add at least one recipient');return;}
  if(!c.subject.trim()&&!c.body.trim()){toast('Add a subject or message before sending');return;}
  state.drafts=state.drafts.filter(d=>d.id!==c.id);
  const recipient=c.to.split(',')[0].trim();
  const m={id:`sent-${Date.now()}`,from:'You',email:'alex@studio.co',initials:'AC',color:'blue',subject:c.subject||'(no subject)',snippet:c.body.slice(0,105).replace(/\s+/g,' ').trim(),body:c.body,date:Date.now(),read:true,starred:false,inInbox:false,sent:true,trash:false,spam:false,snoozeUntil:null,labels:[],category:'Primary',attachment:c.attachment?.name||null,attachmentData:c.attachment?.data||null,conversation:[{sender:'You',email:'alex@studio.co',time:Date.now(),body:c.body,initials:'AC',color:'blue'}],to:recipient};
  state.mail.unshift(m);state.compose=null;state.folder='sent';state.openId=null;state.query='';render();toast('Message sent');
}
function beginReply(forward=false) {
  const mail=state.mail.find(m=>m.id===state.openId);if(!mail)return;
  const last=mail.conversation.at(-1);const to=forward?'':last.email;
  beginCompose({to,subject:`${forward?'Fwd':'Re'}: ${mail.subject}`,body:forward?`\n\n---------- Forwarded message ----------\nFrom: ${last.sender} <${last.email}>\nSubject: ${mail.subject}\n\n${last.body}`:`\n\nOn ${new Date(last.time).toLocaleString()}, ${last.sender} wrote:\n> ${last.body.split('\n').join('\n> ')}`});
}
function searchMatch(query, mail) {
  let q=query.toLowerCase().trim();
  if(q.startsWith('from:')) return mail.from.toLowerCase().includes(q.slice(5).trim()) || mail.email.toLowerCase().includes(q.slice(5).trim());
  if(q.startsWith('subject:')) return mail.subject.toLowerCase().includes(q.slice(8).trim());
  if(q==='is:unread')return !mail.read;if(q==='is:starred')return mail.starred;if(q==='has:attachment')return !!mail.attachment;
  return [mail.from,mail.email,mail.subject,mail.snippet,mail.body,mail.labels.join(' '),mail.attachment||''].join(' ').toLowerCase().includes(q);
}
function selectedSearch(query) { return state.mail.filter(m=>!m.trash&&!m.spam&&searchMatch(query,m)).sort((a,b)=>b.date-a.date); }
// Search supports familiar Gmail-style operators while keeping the inbox entirely local.
const originalVisibleMail=visibleMail;
visibleMail=function(){ const list=state.query?selectedSearch(state.query):originalVisibleMail(); if(state.query)return list; return list; };
function handleAction(action, el, event) {
  const id=el.dataset.id, mail=state.mail.find(m=>m.id===id);
  switch(action) {
    case 'navigate': setFolder(el.dataset.folder);break;
    case 'mobile-nav': state.mobileNav=!state.mobileNav;render();break;
    case 'compose': beginCompose();break;
    case 'new-draft': beginCompose();break;
    case 'open-mail': if(!el.closest('.row-hover-actions'))openMail(id);break;
    case 'select-mail': event.stopPropagation();state.selected=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];render();break;
    case 'select-all': {const list=visibleMail().map(m=>m.id);state.selected=state.selected.length===list.length?[]:list;render();break;}
    case 'select-menu': state.selected=visibleMail().map(m=>m.id);state.modal=null;render();break;
    case 'clear-selection': state.selected=[];render();break;
    case 'toggle-star': event.stopPropagation();if(mail){mail.starred=!mail.starred;persist();render();}break;
    case 'row-archive': event.stopPropagation();performArchive([id]);break;
    case 'row-trash': event.stopPropagation();performTrash([id]);break;
    case 'restore': if(mail){rememberUndo([id]);updateMail([id],m=>({...m,trash:false,spam:false,inInbox:true}));render();toast('Conversation restored','Undo','undo-action');}break;
    case 'bulk-archive': performArchive(selectedIds(state.openId));break;
    case 'archive-one': performArchive([state.openId]);break;
    case 'bulk-trash': performTrash(selectedIds(state.openId));break;
    case 'trash-one': performTrash([state.openId]);break;
    case 'bulk-read': {let ids=selectedIds(state.openId);if(!ids.length)ids=visibleMail().filter(m=>!m.read).map(m=>m.id);if(!ids.length){toast('Everything is already read');break;}const allRead=ids.every(x=>state.mail.find(m=>m.id===x)?.read);allRead?markUnread(ids):markRead(ids);break;}
    case 'mark-read-one':markRead([state.openId]);break;
    case 'mark-unread-one':markUnread([state.openId]);break;
    case 'label-menu':state.modal={type:'label',ids:selectedIds(state.openId)};render();break;
    case 'apply-labels': {const ids=state.modal?.ids||[];const checks=[...document.querySelectorAll('[data-label-check]')];const labels=checks.filter(x=>x.checked).map(x=>x.dataset.labelCheck);updateMail(ids,m=>({...m,labels:[...new Set([...m.labels.filter(x=>!['Work','Personal','Design','Reading'].includes(x)),...labels])]}));state.selected=[];state.modal=null;render();toast('Labels updated');break;}
    case 'snooze-menu':state.modal={type:'snooze',ids:selectedIds(state.openId)};render();break;
    case 'set-snooze':snooze(state.modal?.ids||selectedIds(state.openId),Number(el.dataset.hours));break;
    case 'custom-snooze':state.modal={type:'custom-snooze',ids:state.modal?.ids||selectedIds(state.openId)};render();break;
    case 'save-custom-snooze': {const dt=new Date(`${document.getElementById('snooze-date').value}T${document.getElementById('snooze-time').value}`);if(Number.isFinite(dt.getTime())){updateMail(state.modal.ids,m=>({...m,snoozeUntil:dt.getTime(),inInbox:false}));state.modal=null;render();toast('Conversation snoozed');}else toast('Choose a date and time');break;}
    case 'refresh':toast('Inbox is up to date');break;
    case 'more-menu':state.modal={type:'menu'};render();break;
    case 'back':state.openId=null;state.showAllThreads=false;render();break;
    case 'expand-thread':state.showAllThreads=true;render();break;
    case 'reply':beginReply(false);break;
    case 'forward':beginReply(true);break;
    case 'reply-menu':beginReply(false);break;
    case 'previous-mail':case 'next-mail': {const list=visibleMail(),idx=list.findIndex(m=>m.id===state.openId),next=action==='previous-mail'?list[Math.max(0,idx-1)]:list[Math.min(list.length-1,idx+1)];if(next)openMail(next.id);break;}
    case 'category':state.category=el.dataset.category;state.selected=[];render();break;
    case 'clear-search':state.query='';render();document.getElementById('search')?.focus();break;
    case 'settings':state.modal={type:'settings'};render();break;
    case 'help':state.modal={type:'shortcuts'};render();break;
    case 'search-help':state.modal={type:'search-help'};render();break;
    case 'apps':state.modal={type:'apps'};render();break;
    case 'storage':state.modal={type:'storage'};render();break;
    case 'account':state.modal={type:'account'};render();break;
    case 'theme-light':state.dark=false;render();break;
    case 'theme-dark':state.dark=true;render();break;
    case 'density-comfortable':state.density='comfortable';render();break;
    case 'density-compact':state.density='compact';render();break;
    case 'close-modal':state.modal=null;render();break;
    case 'edit-draft': {const d=state.drafts.find(d=>d.id===id);if(d)beginCompose(d);break;}
    case 'draft-trash':state.drafts=state.drafts.filter(d=>d.id!==id);persist();render();toast('Draft deleted');break;
    case 'compose-close':saveDraft();state.compose=null;render();toast('Draft saved');break;
    case 'compose-minimize':document.querySelector('.compose-window')?.classList.toggle('minimized');break;
    case 'compose-expand':document.querySelector('.compose-window')?.classList.toggle('expanded');break;
    case 'send':sendMail();break;
    case 'discard-draft': {const draft=state.compose?.id;state.drafts=state.drafts.filter(d=>d.id!==draft);state.compose=null;persist();render();toast('Draft discarded');break;}
    case 'format': {const body=document.getElementById('compose-body');if(!body)break;pushComposeUndo();const start=body.selectionStart,end=body.selectionEnd;const selected=body.value.slice(start,end);if(selected){body.value=body.value.slice(0,start)+`**${selected}**`+body.value.slice(end);body.setSelectionRange(start+2,end+2);}else{body.value=body.value.slice(0,start)+'****'+body.value.slice(end);body.setSelectionRange(start+2,start+2);}state.compose.body=body.value;saveDraft();body.focus();break;}
    case 'attach':document.getElementById('attachment-picker')?.click();break;
    case 'remove-attachment':if(state.compose){state.compose.attachment=null;saveDraft();render();}break;
    case 'insert-image':toast('Image insertion is ready in this local demo');break;
    case 'insert-emoji': {const body=document.getElementById('compose-body');if(body){pushComposeUndo();body.value+=' ✨';state.compose.body=body.value;saveDraft();body.focus();}break;}
    case 'undo-compose': {if(!composeUndo.length){toast('Nothing to undo yet');break;}composeRedo.push(captureCompose());restoreCompose(composeUndo.pop());break;}
    case 'redo-compose': {if(!composeRedo.length){toast('Nothing to redo yet');break;}composeUndo.push(captureCompose());restoreCompose(composeRedo.pop());break;}
    case 'new-label':state.modal={type:'new-label'};render();break;
    case 'save-label': {const name=document.getElementById('new-label-name')?.value.trim();if(!name){toast('Enter a label name');break;}if(!['Work','Personal','Design','Reading'].includes(name)){state.mail.forEach(m=>m.labels=m.labels||[]);state.userLabels=[...new Set([...(state.userLabels||[]),name])];persist();}state.modal=null;render();toast(`Label “${name}” created`);break;}
    case 'manage-account':toast('This local account is ready to explore');break;
    case 'signout':toast('Your local mail stays saved on this device');break;
    case 'undo-action':document.querySelector('.toast')?.remove();undoLastAction();break;
    case 'download': {if(mail?.attachment){const a=document.createElement('a');if(mail.attachmentData)a.href=mail.attachmentData;else{a.href=URL.createObjectURL(new Blob([`Local demo attachment: ${mail.attachment}\n\nThis file is represented in the seeded mailbox.`],{type:'text/plain'}));setTimeout(()=>URL.revokeObjectURL(a.href),1000);}a.download=mail.attachmentData?mail.attachment:mail.attachment.replace(/\.[^.]+$/,'.txt');a.click();toast('Attachment downloaded');}break;}
    case 'react':toast('You reacted with a smile');break;
    case 'more-message':state.modal={type:'menu'};render();break;
    case 'older':case 'newer':toast('You’re viewing all conversations');break;
  }
}
app.addEventListener('click', (event)=>{
  const el=event.target.closest('[data-action]');if(!el)return;
  if(el.dataset.action==='close-modal'&&el.classList.contains('modal-scrim')&&event.target.closest('[data-stop]'))return;
  handleAction(el.dataset.action,el,event);
});
app.addEventListener('input',(event)=>{
  if(event.target.id==='search'){
    state.query=event.target.value;state.selected=[];
    const start=event.target.selectionStart;
    render();const next=document.getElementById('search');next?.focus();next?.setSelectionRange(start,start);
  }
  if(['compose-to','compose-cc','compose-subject','compose-body'].includes(event.target.id)){
    const key={ 'compose-to':'to','compose-cc':'cc','compose-subject':'subject','compose-body':'body' }[event.target.id];
    if(state.compose){if(state.compose[key]!==event.target.value)pushComposeUndo();state.compose[key]=event.target.value;}
    saveDraft();
    if(event.target.id==='compose-to')showSuggestions(event.target.value);
  }
  if(event.target.id==='new-label-name'){}
});
app.addEventListener('change',(event)=>{
  if(event.target.id!=='attachment-picker'||!event.target.files?.[0]||!state.compose)return;
  const file=event.target.files[0];
  if(file.size>3*1024*1024){toast('Attachments in this local demo are limited to 3 MB');event.target.value='';return;}
  const reader=new FileReader();reader.onload=()=>{state.compose.attachment={name:file.name,size:file.size,type:file.type||'application/octet-stream',data:reader.result};saveDraft();render();toast('Attachment added');};reader.readAsDataURL(file);
});
app.addEventListener('keydown',(event)=>{
  if(event.target.id==='search'&&event.key==='Enter'){state.query=event.target.value;state.openId=null;state.selected=[];render();}
  if(event.target.id==='search'&&event.key==='Escape'){state.query='';render();}
  if(event.target.classList.contains('mail-row')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openMail(event.target.dataset.id);}
});
function showSuggestions(value) {
  const box=document.getElementById('contact-suggestions');if(!box)return;
  const tail=value.split(',').at(-1).trim().toLowerCase();
  if(tail.length<2){box.innerHTML='';box.classList.remove('visible');return;}
  const matches=people.filter(([name,email])=>`${name} ${email}`.toLowerCase().includes(tail)).slice(0,4);
  if(!matches.length){box.innerHTML='';box.classList.remove('visible');return;}
  box.innerHTML=matches.map(([name,email])=>`<button data-suggest="${escapeHTML(email)}" type="button">${avatar(name,'blue')}<span><b>${escapeHTML(name)}</b><small>${escapeHTML(email)}</small></span></button>`).join('');box.classList.add('visible');
}
app.addEventListener('click',(event)=>{
  const suggestion=event.target.closest('[data-suggest]');if(!suggestion)return;
  const input=document.getElementById('compose-to');if(input){const prefix=input.value.split(',').slice(0,-1).join(',');input.value=(prefix?prefix+', ':'')+suggestion.dataset.suggest+', ';state.compose.to=input.value;saveDraft();document.getElementById('contact-suggestions').classList.remove('visible');input.focus();}
});
document.addEventListener('keydown',(event)=>{
  const typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);
  if(event.key==='Escape'){if(state.compose){saveDraft();state.compose=null;render();}else if(state.modal){state.modal=null;render();}else if(state.openId){state.openId=null;render();}else if(state.mobileNav){state.mobileNav=false;render();}return;}
  if(typing||event.metaKey||event.ctrlKey||event.altKey)return;
  const key=event.key.toLowerCase();
  if(key==='c'){beginCompose();event.preventDefault();}
  if(key==='/'){document.getElementById('search')?.focus();event.preventDefault();}
  if(key==='?' ){state.modal={type:'shortcuts'};render();}
  if(key==='e'&&state.selected.length)performArchive(state.selected);
  if(key==='#'&&state.selected.length)performTrash(state.selected);
  if(key==='s'&&state.selected.length){state.selected.forEach(id=>{const m=state.mail.find(x=>x.id===id);if(m)m.starred=!m.starred;});render();}
  if((key==='j'||key==='k')&&!state.openId){const list=visibleMail();const row=document.querySelector('.mail-row:focus');const current=row?list.findIndex(m=>m.id===row.dataset.id):-1;const next=list[Math.max(0,Math.min(list.length-1,current+(key==='j'?1:-1)))];document.querySelector(`[data-id="${next?.id}"].mail-row`)?.focus();}
});
document.addEventListener('click',(event)=>{
  if(['menu','label','snooze','account'].includes(state.modal?.type)&&!event.target.closest('.popover')&&!event.target.closest('[data-action="more-menu"]')&&!event.target.closest('[data-action="label-menu"]')&&!event.target.closest('[data-action="snooze-menu"]')&&!event.target.closest('[data-action="account"]')){state.modal=null;render();}
});
window.addEventListener('beforeunload',()=>{if(state.compose)saveDraft();});
render();
