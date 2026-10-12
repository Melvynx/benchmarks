export const labelColors = { Work: '#638b75', Personal: '#b789c7', Finance: '#d3a460', Travel: '#739dc2' };
const entries = [
 ['Olivia Rhye','olivia@studio.co','Website refresh — ready for your eyes','The new direction is coming together. I’d love your thoughts on the latest explorations.','10:42 AM','Work',true,true,'OR','#eee6db',['Brand explorations.pdf','Homepage.fig'],3],
 ['Notion','team@makenotion.com','Your weekly workspace digest','A little recap of everything that happened in your workspace this week.','10:18 AM','',true,false,'N','#eeeeea',[],1,'Updates'],
 ['Alex Morgan','alex@hey.com','Coffee tomorrow? ☕','Found a new spot on the corner of Greene & Spring. Their flat white looks pretty good.','9:56 AM','Personal',true,false,'AM','#e3e9e1',[],2],
 ['Linear','notifications@linear.app','You’ve been assigned 3 new issues','Alex assigned you ENG-142, ENG-145 and ENG-148 in the Website project.','9:30 AM','Work',false,false,'L','#e9e6f8',[],1,'Updates'],
 ['Sophie Chen','sophie@studio.co','Re: Q4 planning & priorities','Thanks for pulling this together! A few thoughts on the roadmap before our sync.','9:14 AM','Work',true,true,'SC','#f4e4d9',[],4],
 ['Airbnb','hello@airbnb.com','Your next chapter starts in Lisbon','Your reservation is confirmed. Here’s everything you need for your upcoming stay.','8:45 AM','Travel',false,false,'a','#ffe6e3',['Reservation.pdf'],1,'Updates'],
 ['Daniel Kim','daniel@studio.co','A few things that caught my eye','Sharing some references for the project. The typography on the second one is so good.','8:12 AM','Work',false,false,'DK','#dfe9ef',[],1],
 ['Figma','hello@figma.com','Good ideas deserve a little space','Meet the latest updates to FigJam. More room for your next big idea.','7:50 AM','',false,false,'F','#f4e4f2',[],1,'Promotions'],
 ['Emma Wilson','emma@hey.com','Sunday dinner at ours','We’re cooking something good this weekend. Would love to have you over!','Yesterday','Personal',false,true,'EW','#f0e5d1',[],2],
 ['Stripe','receipts@stripe.com','Your September invoice is ready','Your monthly invoice is attached. Thank you for building with Stripe.','Yesterday','Finance',false,false,'S','#eae5fa',['Invoice-0926.pdf'],1,'Updates'],
 ['James Miller','james@studio.co','Design system / handoff notes','Everything is organized and ready to go. Tokens, components, and a few useful notes.','Yesterday','Work',false,false,'JM','#dce8e0',['Handoff-notes.pdf'],2],
 ['The Modern House','journal@themodernhouse.com','Spaces for a slower kind of living','This week’s journal: thoughtful spaces, quiet corners, and the art of doing less.','Yesterday','',false,false,'m','#ebe6dd',[],1,'Promotions'],
 ['Isabella Davis','isabella@hey.com','The photos are finally here!','A few favorites from our weekend on the coast. Already want to go back.','Sep 28','Personal',false,false,'ID','#eadfec',['Coast-weekend.jpg'],1],
 ['Vercel','notifications@vercel.com','Deployment successful: studio-website','Your production deployment is ready. All checks passed successfully.','Sep 28','Work',false,false,'▲','#e9e9e7',[],1,'Updates'],
 ['Noah Williams','noah@studio.co','One more idea for the launch','What if we kept things simple and let the work do the talking? Here’s a quick thought.','Sep 28','Work',false,true,'NW','#e5e4ef',[],1],
 ['Aesop','newsletter@aesop.com','An invitation to pause','Considered formulations for everyday rituals. Discover something new.','Sep 27','',false,false,'A','#eee6d6',[],1,'Promotions'],
 ['Mia Thompson','mia@studio.co','Friday team lunch','Let’s get out of the office for a bit. I booked the table for 12:30.','Sep 27','Work',false,false,'MT','#f2e2df',[],1],
 ['Google Calendar','calendar@google.com','Reminder: Product design sync','Tuesday, September 30 · 2:00 – 2:30 PM. Join Olivia and Sophie for a quick catch-up.','Sep 27','Work',false,false,'31','#e2ebf6',[],1,'Updates'],
 ['Oliver Brooks','oliver@hey.com','That book we talked about','It’s called The Creative Act. Thought you might enjoy it over the weekend.','Sep 26','Personal',false,false,'OB','#e5e9dc',[],1],
 ['Dropbox','hello@dropbox.com','Your files, a little more organized','Everything you need for your next project, all in one place.','Sep 26','',false,false,'D','#dfebfb',[],1,'Updates']
];
export function seedMailbox() {
 const mail = entries.map((entry, index) => {
 const [sender,email,subject,snippet,time,label,unread,starred,initials,color,attachments,count,category='Primary'] = entry;
 const body = index === 0 ? `Hey Alex,\n\nThe new direction is coming together, and I’m really excited to share where we’ve landed. We’ve taken a quieter, more editorial approach — a little more space, thoughtful typography, and a warmer palette.\n\nI’ve attached the brand explorations and the latest homepage file. I’d love your thoughts on:\n\n• The overall look and feel\n• The balance between personality and simplicity\n• How the new direction translates to mobile\n\nNo rush — whenever you have a moment before our Thursday sync would be great.\n\nThanks!\nOlivia` : `Hi Alex,\n\n${snippet}\n\n${label === 'Work' ? 'I’ve put together a few details for you to review. Let me know what you think, and we can talk through everything at our next catch-up. It’s been great seeing this come together.' : label === 'Personal' ? 'It would be lovely to catch up soon. Let me know what works for you — looking forward to it!' : 'You can find all the details below. Keep this message handy for your records, and reach out if you have any questions.'}\n\n${label === 'Travel' ? 'Check-in: October 12, 2026\nCheck-out: October 18, 2026\nLocation: Príncipe Real, Lisbon\nConfirmation: HM4J9LK2\n\n' : ''}All the best,\n${sender}`;
 return { id: `mail-${index}`, sender,email,subject,snippet,time,labels:label?[label]:[],unread,starred,initials,color,attachments,category,folder:'Inbox',messages:Array.from({length:count},(_, messageIndex)=>({sender: messageIndex===1?'Alex Johnson':sender,email:messageIndex===1?'alex.johnson@gmail.com':email,time: messageIndex===count-1?time:'Sep 29, 3:24 PM',body:messageIndex===count-1?body:messageIndex===1?'Thanks for sharing this! Love where this is heading. Looking forward to seeing the next round.':'Hi Alex,\n\nA quick update from our last conversation. I’ll send over the latest details shortly.\n\nThanks!'})) };
 });
 mail.push({...mail[6],id:'sent-1',folder:'Sent',sender:'Me',email:'alex.johnson@gmail.com',to:'daniel@studio.co',initials:'AJ',color:'#dfe7d8',subject:'Re: Project timeline',snippet:'Thanks Daniel. The timeline looks great — let’s go ahead.',unread:false,time:'Yesterday',starred:false,messages:[{sender:'Alex Johnson',email:'alex.johnson@gmail.com',time:'Yesterday',body:'Hi Daniel,\n\nThanks for putting the timeline together. Everything looks great — let’s go ahead.\n\nI’ve blocked out Thursday morning for our review. Looking forward to seeing the next iteration!\n\nAlex'}]});
 mail.push({...mail[3],id:'trash-1',folder:'Trash',subject:'Your old workspace invitation',unread:false,starred:false});
 mail.push({...mail[8],id:'draft-1',folder:'Drafts',sender:'Draft',subject:'Weekend plans',snippet:'Hey Emma! We’d love to come over on Sunday.',to:'emma@hey.com',body:'Hey Emma! We’d love to come over on Sunday. Can we bring anything?',unread:false,starred:false,time:'Yesterday'});
 return mail;
}
export function matchesSearch(mail, query) {
 const words = query.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
 return words.every(word => {
   if(word==='is:unread') return mail.unread;
   if(word==='is:starred') return mail.starred;
   if(word==='has:attachment') return mail.attachments.length>0;
   if(word.startsWith('from:')) return `${mail.sender} ${mail.email}`.toLowerCase().includes(word.slice(5));
   if(word.startsWith('label:')) return mail.labels.some(label=>label.toLowerCase().includes(word.slice(6)));
   if(word.startsWith('in:')) return mail.folder.toLowerCase()===word.slice(3);
   return `${mail.sender} ${mail.email} ${mail.subject} ${mail.snippet} ${mail.messages.map(message=>message.body).join(' ')}`.toLowerCase().includes(word.replaceAll('"',''));
 });
}
export function visibleMailbox(mail, folder, category, query) {
 return mail.filter(item => query ? (item.folder!=='Trash'||query.includes('in:trash'))&&matchesSearch(item,query) : folder==='Starred'?item.starred&&item.folder!=='Trash':folder==='All mail'?item.folder!=='Trash'&&item.folder!=='Drafts':folder==='Snoozed'?item.folder==='Snoozed':labelColors[folder]?item.labels.includes(folder)&&item.folder!=='Trash':item.folder===folder).filter(item=>query||folder!=='Inbox'||category==='All'||item.category===category);
}
export function snoozeDate(option, now=new Date()) {
 const date=new Date(now);
 const days=option==='Tomorrow morning'?1:option==='Later this week'?((5-date.getDay()+7)%7||7):((1-date.getDay()+7)%7||7);
 date.setDate(date.getDate()+days);
 date.setHours(9,0,0,0);
 return date.toISOString();
}
