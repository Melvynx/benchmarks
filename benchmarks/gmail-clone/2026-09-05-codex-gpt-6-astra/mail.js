export const labels = [{ name: 'Work', color: 'green' }, { name: 'Personal', color: 'purple' }, { name: 'Receipts', color: 'orange' }, { name: 'Inspiration', color: 'blue' }];
const seed = [
['Alex Morgan','alex@linear.app','A little polish before we ship ✨','The updated screens are looking great. Left a few thoughts on the onboarding flow.','10:42 AM','Work',true,true,'Primary',3,['Onboarding v3.fig']],
['Figma','updates@figma.com','Your weekly dose of design inspiration','This week: a fresh perspective on design systems, new community favorites, and more.','10:18 AM','Inspiration',true,false,'Updates',1,[]],
['Sophie Chen','sophie@studio.co','Coffee next week?','Hey Jamie! I’ll be in your neighborhood on Tuesday. Would love to catch up.','9:56 AM','Personal',true,false,'Primary',1,[]],
['The Brand Studio','hello@brand.studio','September moodboard is here','A new season, a new perspective. Here’s what’s inspiring us this month.','9:30 AM','Work',true,true,'Primary',2,['September moodboard.pdf','Color explorations.png']],
['Notion','team@email.notion.so','A calmer way to get things done','Your workspace, a little more connected. See what’s new in Notion this month.','9:12 AM','',false,false,'Updates',1,[]],
['Daniel Kim','daniel@studio.co','Re: Website refresh — next steps','Perfect, let’s go with option two. I’ve updated the timeline and shared it with the team.','8:45 AM','Work',false,false,'Primary',4,[]],
['Airbnb','automated@airbnb.com','Your receipt for your upcoming trip','You’re all set for Lisbon. Here are the details of your reservation.','8:20 AM','Receipts',false,false,'Updates',1,['Airbnb receipt.pdf']],
['Maya Patel','maya@studio.co','A few things I bookmarked for you','That type foundry we talked about just released a new family. Thought you’d love it!','Yesterday','Inspiration',false,true,'Primary',1,[]],
['Oliver James','oliver@northstar.co','Northstar × Studio — project proposal','Hi Jamie, sharing our proposal and a few early thoughts for the identity project.','Yesterday','Work',false,false,'Primary',2,['Project proposal.pdf']],
['Spotify','no-reply@spotify.com','Your September soundtrack is ready','Made for your focus hours, your slow mornings, and everything in between.','Yesterday','',false,false,'Promotions',1,[]],
['Emma Wilson','emma@studio.co','Friday team lunch 🍜','Same place, same excellent noodles? Let me know if you’re in and I’ll book a table.','Yesterday','Personal',false,false,'Primary',5,[]],
['Stripe','receipts@stripe.com','Your invoice from Framer','Thanks for your payment. Your invoice and receipt are attached to this email.','Yesterday','Receipts',false,false,'Updates',1,['Invoice-2026-09.pdf']],
['Read.cv','digest@read.cv','People and projects worth knowing','A handful of thoughtful projects from our community. Settle in and have a look.','Sep 3','Inspiration',false,false,'Promotions',1,[]],
['Liam Anderson','liam@studio.co','Quick question about the component library','Do we have a compact version of the date picker? Working through the mobile layouts.','Sep 3','Work',false,false,'Primary',2,[]],
['Isabel Rivera','isabel@design.co','Loved your latest work','The little interactions in your portfolio are so good. Especially that project transition.','Sep 3','Personal',false,true,'Primary',1,[]],
['Dropbox','no-reply@dropbox.com','Alex shared “Project assets” with you','All the files you need for your next big thing, now in one place.','Sep 2','Work',false,false,'Updates',1,[]],
['Are.na','newsletter@are.na','On collecting, connecting, and creating','New ideas from the community. A good place to get a little lost.','Sep 2','Inspiration',false,false,'Promotions',1,[]],
['Noah Williams','noah@studio.co','Re: Notes from our workshop','Thanks for pulling this together. These are a great starting point for Monday.','Sep 2','Work',false,false,'Primary',3,['Workshop notes.pdf']],
['Muji','news@muji.com','A fresh start for your workspace','Thoughtful essentials for a clearer desk and a clearer mind.','Sep 1','',false,false,'Promotions',1,[]],
['Grace Lee','grace@studio.co','Design review moved to Thursday','A quick heads-up: we’re moving this week’s review to Thursday at 2pm.','Sep 1','Work',false,false,'Primary',1,[]],
];
export function seedMail() {
  const messages = seed.map((entry, index) => {
    const [sender,email,subject,preview,time,label,unread,starred,category,count,attachments] = entry;
    return { id: `mail-${index}`, sender,email,subject,preview,time,labels: label ? [label] : [],unread,starred,category,count,attachments,folder:'Inbox',body: `Hi Jamie,\n\n${preview}\n\n${index === 0 ? 'I spent some time going through the latest prototype this morning. The new direction feels really considered — especially the way the empty states guide you into the product.\n\nA couple of small things before we hand this over:\n• Give the welcome screen a little more breathing room.\n• Keep the primary action consistent across the setup steps.\n• Let’s try the softer green for the success state.\n\nI’ve attached the updated file with a few notes. No rush on these — happy to walk through them in our next catch-up.\n\nReally excited to get this out into the world!' : 'I wanted to send this over while it was fresh on my mind. You’ll find all the details here' + (attachments.length ? ' and in the attached files.' : '.') + '\n\nLet me know what you think when you get a chance. Happy to chat through any questions.'}\n\n${index === 0 ? 'Cheers,\nAlex' : 'Best,\n' + sender.split(' ')[0]}` };
  });
  messages.push({ ...messages[5],id:'sent-1',sender:'Me',email:'jamie@studio.co',to:'daniel@studio.co',subject:'Website refresh — next steps',folder:'Sent',unread:false,starred:false,count:1 });
  messages.push({ ...messages[8],id:'draft-1',sender:'Draft',to:'oliver@northstar.co',subject:'Re: Northstar × Studio — project proposal',body:'Hi Oliver,\n\nThank you for putting this together. The direction looks really promising.',preview:'Thank you for putting this together. The direction looks really promising.',folder:'Drafts',unread:false,count:1,attachments:[] });
  messages.push({ ...messages[18],id:'trash-1',subject:'Last chance: summer essentials',folder:'Trash',unread:false });
  return messages;
}
export function matchesSearch(mail, query) {
  const terms = query.toLowerCase().match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  return terms.every(term => {
    const value = term.replaceAll('"','');
    if (value === 'is:unread') return mail.unread;
    if (value === 'is:starred') return mail.starred;
    if (value === 'has:attachment') return mail.attachments.length > 0;
    if (value.startsWith('from:')) return `${mail.sender} ${mail.email}`.toLowerCase().includes(value.slice(5));
    if (value.startsWith('label:')) return mail.labels.some(label => label.toLowerCase().includes(value.slice(6)));
    if (value.startsWith('in:')) return mail.folder.toLowerCase() === value.slice(3);
    return `${mail.sender} ${mail.email} ${mail.subject} ${mail.body} ${mail.labels.join(' ')}`.toLowerCase().includes(value);
  });
}
export function inFolder(mail, folder) {
  if (folder === 'Starred') return mail.starred && mail.folder !== 'Trash';
  if (folder === 'All mail') return !['Trash','Drafts'].includes(mail.folder);
  if (labels.some(label => label.name === folder)) return mail.labels.includes(folder) && mail.folder !== 'Trash';
  return mail.folder === folder;
}
export function validRecipients(value) { return value.split(/[,;]/).every(address => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())); }
